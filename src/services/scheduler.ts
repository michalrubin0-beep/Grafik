import { addDays, eachDayOfInterval, format, parseISO } from 'date-fns'

import type { AvailabilityEntry, Employee, Position, Shift, ShiftType } from '../types'

export type SchedulerMode = 'week' | 'month'
export type SchedulerTemplateType = 'poranna' | 'popołudniowa' | 'nocna' | 'calodniowa' | 'indywidualna'

export type SchedulerTemplate = {
  id: string
  label: string
  start: string
  end: string
  required: number
  type: SchedulerTemplateType
  positionIds: string[]
}

export type SchedulerConfig = {
  mode: SchedulerMode
  startDate: string
  endDate: string
  workingDays: string[]
  templates: SchedulerTemplate[]
  minHoursPerEmployee: number
  maxHoursPerEmployee: number
  maxShiftsPerWeek: number
  preferredDaysOff: number
  maxConsecutiveWorkDays: number
  requiredStaffPerShift: number
}

export type SchedulerInput = {
  employees: Employee[]
  positions: Position[]
  availability: AvailabilityEntry[]
  shifts: Shift[]
}

export type SchedulerResult = {
  feasible: boolean
  warnings: string[]
  shifts: Shift[]
  summary: {
    totalShifts: number
    totalHours: number
    assignedEmployees: number
  }
}

export const DEFAULT_SCHEDULER_TEMPLATES: SchedulerTemplate[] = [
  { id: 'morning', label: 'Zmiana poranna', start: '06:00', end: '14:00', required: 2, type: 'poranna', positionIds: ['pos-sales', 'pos-customer', 'pos-cashier', 'pos-warehouse'] },
  { id: 'afternoon', label: 'Zmiana popołudniowa', start: '14:00', end: '22:00', required: 2, type: 'popołudniowa', positionIds: ['pos-sales', 'pos-customer', 'pos-cashier', 'pos-production'] },
  { id: 'night', label: 'Zmiana nocna', start: '22:00', end: '06:00', required: 1, type: 'nocna', positionIds: ['pos-production', 'pos-warehouse'] },
  { id: 'full', label: 'Zmiana całodniowa', start: '08:00', end: '16:00', required: 1, type: 'calodniowa', positionIds: ['pos-manager', 'pos-production', 'pos-sales'] },
]

const polishDayMap: Record<number, string> = {
  0: 'Ndz',
  1: 'Pon',
  2: 'Wt',
  3: 'Śr',
  4: 'Czw',
  5: 'Pt',
  6: 'Sob',
}

const toMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

const durationBetween = (start: string, end: string) => {
  const total = toMinutes(end) - toMinutes(start)
  if (total <= 0) return 24 * 60 + total
  return total
}

const dateIndex = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-').map(Number)
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000)
}

const getShiftInterval = (shift: Pick<Shift, 'date' | 'start' | 'end'>) => {
  const start = dateIndex(shift.date) * 1440 + toMinutes(shift.start)
  return { start, end: start + durationBetween(shift.start, shift.end) }
}

const getShiftWorkDays = (shift: Pick<Shift, 'date' | 'start' | 'end'>) => {
  const interval = getShiftInterval(shift)
  const firstDay = dateIndex(shift.date)
  const lastDay = Math.ceil(interval.end / 1440) - 1
  return Array.from({ length: lastDay - firstDay + 1 }, (_, index) => firstDay + index)
}

const shiftsOverlap = (
  shiftA: Pick<Shift, 'date' | 'start' | 'end'>,
  shiftB: Pick<Shift, 'date' | 'start' | 'end'>,
) => {
  const a = getShiftInterval(shiftA)
  const b = getShiftInterval(shiftB)
  return a.start < b.end && b.start < a.end
}

const weekdayForIndex = (dayIndex: number) => polishDayMap[new Date(dayIndex * 86_400_000).getUTCDay()]

const shiftFitsAvailability = (
  shiftInterval: { start: number; end: number },
  dayIndex: number,
  availability: Pick<AvailabilityEntry, 'start' | 'end'>,
) => {
  const dayStart = dayIndex * 1440
  const segmentStart = Math.max(shiftInterval.start, dayStart)
  const segmentEnd = Math.min(shiftInterval.end, dayStart + 1440)
  const availabilityStart = dayStart + toMinutes(availability.start)
  let availabilityEnd = dayStart + toMinutes(availability.end)
  if (availabilityEnd <= availabilityStart) availabilityEnd += 1440
  return segmentStart >= availabilityStart && segmentEnd <= availabilityEnd
}

const overlapsAvailability = (
  shiftInterval: { start: number; end: number },
  dayIndex: number,
  availability: Pick<AvailabilityEntry, 'start' | 'end'>,
) => {
  const dayStart = dayIndex * 1440
  const segmentStart = Math.max(shiftInterval.start, dayStart)
  const segmentEnd = Math.min(shiftInterval.end, dayStart + 1440)
  const availabilityStart = dayStart + toMinutes(availability.start)
  let availabilityEnd = dayStart + toMinutes(availability.end)
  if (availabilityEnd <= availabilityStart) availabilityEnd += 1440
  return segmentStart < availabilityEnd && availabilityStart < segmentEnd
}

const paidHours = (shift: Pick<Shift, 'start' | 'end' | 'breakMinutes'>) =>
  Math.max(0, durationBetween(shift.start, shift.end) - (shift.breakMinutes ?? 0)) / 60

const totalHoursForEmployee = (employeeId: string, assigned: Shift[]) =>
  assigned
    .filter((shift) => shift.employeeId === employeeId)
    .reduce((sum, shift) => sum + paidHours(shift), 0)

const getQualifiedPositionIds = (employee: Employee, template: SchedulerTemplate, positions: Position[]) => {
  const validPositionIds = employee.positionIds.filter((positionId) =>
    positions.some((position) => position.id === positionId),
  )
  if (!template.positionIds.length) return validPositionIds
  return validPositionIds.filter((positionId) => template.positionIds.includes(positionId))
}

const getShiftDates = (config: SchedulerConfig) => {
  const start = parseISO(config.startDate)
  const end = parseISO(config.endDate)
  const dates: string[] = []
  for (const date of eachDayOfInterval({ start, end })) {
    const shortLabel = polishDayMap[date.getDay()]
    if (config.workingDays.includes(shortLabel)) {
      dates.push(format(date, 'yyyy-MM-dd'))
    }
  }
  return dates
}

const scoreCandidate = (
  employee: Employee,
  template: SchedulerTemplate,
  currentAssignments: Shift[],
  assignedByEmployee: Map<string, Shift[]>,
  config: SchedulerConfig,
) => {
  let score = 0

  const employeeHours = totalHoursForEmployee(employee.id, currentAssignments)
  if (employeeHours < config.minHoursPerEmployee) score += 80
  if (employeeHours > config.maxHoursPerEmployee) score -= 120

  const shiftCount = assignedByEmployee.get(employee.id)?.length ?? 0
  if (shiftCount >= config.maxShiftsPerWeek) score -= 250

  if (employee.preferredHours) {
    const preferred = employee.preferredHours.split('-')
    if (preferred.length === 2) {
      const preferredStart = toMinutes(preferred[0])
      if (Math.abs(toMinutes(template.start) - preferredStart) <= 60) score += 15
    }
  }

  return score
}

const isBlockedForEmployee = (
  employee: Employee,
  shift: Pick<Shift, 'date' | 'start' | 'end'>,
  availability: AvailabilityEntry[],
  currentAssignments: Shift[],
) => {
  const shiftInterval = getShiftInterval(shift)
  for (const dayIndex of getShiftWorkDays(shift)) {
    const employeeAvailability = availability.filter((entry) =>
      entry.employeeId === employee.id && entry.day === weekdayForIndex(dayIndex),
    )
    const availableWindows = employeeAvailability.filter((entry) => entry.type === 'available')
    if (availableWindows.length && !availableWindows.some((entry) => shiftFitsAvailability(shiftInterval, dayIndex, entry))) {
      return true
    }

    if (employeeAvailability.some((entry) =>
      entry.type !== 'available' && overlapsAvailability(shiftInterval, dayIndex, entry),
    )) return true
  }

  return currentAssignments.some((entry) =>
    entry.employeeId === employee.id && shiftsOverlap(entry, shift),
  )
}

export function generateSchedule(input: SchedulerInput, config: SchedulerConfig): SchedulerResult {
  const warnings: string[] = []
  if (parseISO(config.startDate) > parseISO(config.endDate)) {
    return {
      feasible: false,
      warnings: ['Data rozpoczęcia musi przypadać przed datą zakończenia.'],
      shifts: [],
      summary: { totalShifts: 0, totalHours: 0, assignedEmployees: 0 },
    }
  }

  const dayDates = getShiftDates(config)
  const assigned: Shift[] = []
  const assignedByEmployee = new Map<string, Shift[]>()
  const periodStart = dateIndex(config.startDate) * 1440
  const periodEnd = (dateIndex(config.endDate) + 1) * 1440

  const tasks = dayDates.flatMap((date) =>
    config.templates.map((template) => ({
      date,
      template,
    })),
  )

  for (const task of tasks) {
    const taskShift = { date: task.date, start: task.template.start, end: task.template.end }
    const planningShifts = [...input.shifts, ...assigned]
    const periodShifts = planningShifts.filter((shift) => {
      const interval = getShiftInterval(shift)
      return interval.start < periodEnd && periodStart < interval.end
    })
    const weekStart = dateIndex(task.date) - ((new Date(`${task.date}T00:00:00`).getDay() + 6) % 7)
    const candidateEmployees = input.employees.filter((employee) => {
      if (!employee.active) return false
      if (!getQualifiedPositionIds(employee, task.template, input.positions).length) return false
      if (isBlockedForEmployee(employee, taskShift, input.availability, planningShifts)) return false
      const employeeShifts = planningShifts.filter((shift) => shift.employeeId === employee.id)
      const weekShifts = employeeShifts.filter((shift) => {
        const shiftDate = dateIndex(shift.date)
        return shiftDate >= weekStart && shiftDate < weekStart + 7
      })
      if (weekShifts.length >= config.maxShiftsPerWeek) return false
      const periodEmployeeShifts = periodShifts.filter((shift) => shift.employeeId === employee.id)
      const generatedShift = {
        date: task.date,
        start: task.template.start,
        end: task.template.end,
      }
      if (totalHoursForEmployee(employee.id, periodEmployeeShifts) + Math.max(0, durationBetween(task.template.start, task.template.end) - 30) / 60 > config.maxHoursPerEmployee) return false
      const workedDays = new Set(employeeShifts.flatMap((shift) => getShiftWorkDays(shift)))
      getShiftWorkDays(generatedShift).forEach((day) => workedDays.add(day))
      const taskDay = dateIndex(task.date)
      let consecutiveDays = 1
      for (let offset = 1; workedDays.has(taskDay - offset); offset += 1) consecutiveDays += 1
      for (let offset = 1; workedDays.has(taskDay + offset); offset += 1) consecutiveDays += 1
      if (consecutiveDays > config.maxConsecutiveWorkDays) return false
      return true
    })

    const scoredCandidates = candidateEmployees
      .map((employee) => ({ employee, score: scoreCandidate(employee, task.template, periodShifts, assignedByEmployee, config) }))
      .sort((a, b) => b.score - a.score)

    const needed = Math.max(0, task.template.required)
    if (scoredCandidates.length < needed) {
      warnings.push(`Brakuje pracowników na ${task.template.label} (${task.date}): wymaganych ${needed}, dostępnych ${scoredCandidates.length}.`)
      continue
    }

    const selected = scoredCandidates.slice(0, needed).map((item) => item.employee)

    selected.forEach((employee) => {
      const nextShift: Shift = {
        id: `generated-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        employeeId: employee.id,
        date: task.date,
        start: task.template.start,
        end: task.template.end,
        positionId: getQualifiedPositionIds(employee, task.template, input.positions)[0],
        type: task.template.type as ShiftType,
        color: employee.color,
        breakMinutes: 30,
        notes: `Automatycznie wygenerowana zmiana: ${task.template.label}`,
      }

      assigned.push(nextShift)
      const map = assignedByEmployee.get(employee.id) ?? []
      map.push(nextShift)
      assignedByEmployee.set(employee.id, map)
    })
  }

  const totalHours = assigned.reduce((sum, shift) => sum + paidHours(shift), 0)

  return {
    feasible: warnings.length === 0,
    warnings,
    shifts: assigned,
    summary: {
      totalShifts: assigned.length,
      totalHours,
      assignedEmployees: new Set(assigned.map((shift) => shift.employeeId)).size,
    },
  }
}

export function getDefaultSchedulerConfig(): SchedulerConfig {
  return {
    mode: 'week',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 6), 'yyyy-MM-dd'),
    workingDays: ['Pon', 'Wt', 'Śr', 'Czw', 'Pt'],
    templates: DEFAULT_SCHEDULER_TEMPLATES,
    minHoursPerEmployee: 20,
    maxHoursPerEmployee: 48,
    maxShiftsPerWeek: 5,
    preferredDaysOff: 1,
    maxConsecutiveWorkDays: 5,
    requiredStaffPerShift: 1,
  }
}
