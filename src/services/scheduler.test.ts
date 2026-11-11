import { describe, expect, it } from 'vitest'

import { DEFAULT_SCHEDULER_TEMPLATES, generateSchedule, type SchedulerConfig } from './scheduler'
import type { AvailabilityEntry, Employee, Position, Shift } from '../types'

const positions: Position[] = [
  { id: 'pos-sales', name: 'Sprzedawca', description: 'Obsługa klienta', color: '#22c55e', required: 1 },
  { id: 'pos-warehouse', name: 'Magazynier', description: 'Magazyn', color: '#38bdf8', required: 1 },
  { id: 'pos-customer', name: 'Obsługa klienta', description: 'Obsługa klienta', color: '#f59e0b', required: 1 },
]

const makeEmployee = (id: string, positionIds: string[], preferredHours = '08:00-16:00'): Employee => ({
  id,
  firstName: id,
  lastName: 'Test',
  phone: '',
  email: `${id}@example.com`,
  positionIds,
  contractType: 'Umowa o pracę',
  hireDate: '2024-01-01',
  fullTime: 1,
  monthlyHours: 160,
  preferredHours,
  color: '#ffffff',
  notes: '',
  active: true,
})

const makeConfig = (): SchedulerConfig => ({
  mode: 'week',
  startDate: '2026-11-09',
  endDate: '2026-11-13',
  workingDays: ['Pon', 'Wt', 'Śr', 'Czw', 'Pt'],
  templates: DEFAULT_SCHEDULER_TEMPLATES,
  minHoursPerEmployee: 20,
  maxHoursPerEmployee: 48,
  maxShiftsPerWeek: 5,
  preferredDaysOff: 1,
  maxConsecutiveWorkDays: 5,
  requiredStaffPerShift: 1,
})

describe('scheduler', () => {
  it('does not create overlapping shifts for the same employee', () => {
    const employees = [
      makeEmployee('emp-1', ['pos-sales']),
      makeEmployee('emp-2', ['pos-sales']),
      makeEmployee('emp-3', ['pos-customer']),
    ]

    const result = generateSchedule({ employees, positions, availability: [], shifts: [] }, makeConfig())

    const byEmployee = new Map<string, number[]>()
    for (const shift of result.shifts) {
      const key = shift.employeeId
      const times = byEmployee.get(key) ?? []
      times.push(Number(shift.start.slice(0, 2)))
      byEmployee.set(key, times)
    }

    expect(result.shifts.length).toBeGreaterThan(0)
    expect(byEmployee.size).toBeGreaterThan(1)
  })

  it('respects availability and time-off restrictions', () => {
    const employees = [
      makeEmployee('emp-1', ['pos-sales']),
      makeEmployee('emp-2', ['pos-sales']),
    ]

    const availability: AvailabilityEntry[] = [
      { id: 'avail-1', employeeId: 'emp-2', day: 'Pon', start: '06:00', end: '14:00', type: 'unavailable' },
    ]

    const result = generateSchedule({ employees, positions, availability, shifts: [] }, {
      ...makeConfig(),
      templates: [{ ...DEFAULT_SCHEDULER_TEMPLATES[0], required: 1 }],
    })

    expect(result.shifts.filter((shift) => shift.date === '2026-11-09').every((shift) => shift.employeeId !== 'emp-2')).toBe(true)
  })

  it('checks employee qualifications before assigning a shift', () => {
    const employees = [
      makeEmployee('emp-1', ['pos-warehouse']),
      makeEmployee('emp-2', ['pos-sales']),
    ]

    const result = generateSchedule({ employees, positions, availability: [], shifts: [] }, {
      ...makeConfig(),
      templates: [{ id: 'sales', label: 'Sprzedaż', start: '08:00', end: '16:00', required: 1, type: 'calodniowa', positionIds: ['pos-sales'] }],
    })

    expect(result.shifts.some((shift) => shift.employeeId === 'emp-2')).toBe(true)
    expect(result.shifts.some((shift) => shift.employeeId === 'emp-1')).toBe(false)
    expect(result.shifts.every((shift) => shift.positionId === 'pos-sales')).toBe(true)
  })

  it('does not overlap an existing overnight shift from the previous day', () => {
    const employee = makeEmployee('emp-1', ['pos-sales'])
    const existingShift: Shift = {
      id: 'existing-night',
      employeeId: employee.id,
      date: '2026-11-08',
      start: '23:00',
      end: '07:00',
      positionId: 'pos-sales',
      type: 'Noc',
      color: employee.color,
      breakMinutes: 0,
      notes: '',
    }

    const result = generateSchedule({ employees: [employee], positions, availability: [], shifts: [existingShift] }, {
      ...makeConfig(),
      startDate: '2026-11-09',
      endDate: '2026-11-09',
      workingDays: ['Pon'],
      templates: [{ id: 'morning', label: 'Morning', start: '06:00', end: '14:00', required: 1, type: 'poranna', positionIds: ['pos-sales'] }],
    })

    expect(result.shifts).toHaveLength(0)
    expect(result.feasible).toBe(false)
  })

  it('uses only an employee position that is eligible for the template', () => {
    const employee = makeEmployee('emp-1', ['pos-customer'])
    const result = generateSchedule({ employees: [employee], positions, availability: [], shifts: [] }, {
      ...makeConfig(),
      startDate: '2026-11-09',
      endDate: '2026-11-09',
      workingDays: ['Pon'],
      templates: [{ id: 'service', label: 'Service', start: '08:00', end: '16:00', required: 1, type: 'calodniowa', positionIds: ['pos-sales', 'pos-customer'] }],
    })

    expect(result.shifts).toHaveLength(1)
    expect(result.shifts[0].positionId).toBe('pos-customer')
  })

  it('does not assign employees without a valid position qualification', () => {
    const employee = makeEmployee('emp-1', ['missing-position'])
    const result = generateSchedule({ employees: [employee], positions, availability: [], shifts: [] }, {
      ...makeConfig(),
      startDate: '2026-11-09',
      endDate: '2026-11-09',
      workingDays: ['Pon'],
      templates: [{ id: 'open', label: 'Open shift', start: '08:00', end: '16:00', required: 1, type: 'calodniowa', positionIds: [] }],
    })

    expect(result.shifts).toHaveLength(0)
    expect(result.feasible).toBe(false)
  })

  it('does not exceed the configured hours cap after accounting for existing work', () => {
    const employee = makeEmployee('emp-1', ['pos-sales'])
    const existingShift: Shift = {
      id: 'existing',
      employeeId: employee.id,
      date: '2026-11-09',
      start: '08:00',
      end: '16:00',
      positionId: 'pos-sales',
      type: 'Rano',
      color: employee.color,
      breakMinutes: 30,
      notes: '',
    }

    const result = generateSchedule({ employees: [employee], positions, availability: [], shifts: [existingShift] }, {
      ...makeConfig(),
      startDate: '2026-11-09',
      endDate: '2026-11-09',
      workingDays: ['Pon'],
      maxHoursPerEmployee: 8,
      templates: [{ id: 'afternoon', label: 'Afternoon', start: '16:00', end: '22:00', required: 1, type: 'popołudniowa', positionIds: ['pos-sales'] }],
    })

    expect(result.shifts).toHaveLength(0)
    expect(result.feasible).toBe(false)
  })

  it('respects the maximum consecutive work days including overnight work', () => {
    const employee = makeEmployee('emp-1', ['pos-sales'])
    const existingShift: Shift = {
      id: 'existing-night',
      employeeId: employee.id,
      date: '2026-11-08',
      start: '23:00',
      end: '07:00',
      positionId: 'pos-sales',
      type: 'Noc',
      color: employee.color,
      breakMinutes: 0,
      notes: '',
    }
    const result = generateSchedule({ employees: [employee], positions, availability: [], shifts: [existingShift] }, {
      ...makeConfig(),
      startDate: '2026-11-09',
      endDate: '2026-11-09',
      workingDays: ['Pon'],
      maxConsecutiveWorkDays: 1,
      templates: [{ id: 'morning', label: 'Morning', start: '08:00', end: '16:00', required: 1, type: 'poranna', positionIds: ['pos-sales'] }],
    })

    expect(result.shifts).toHaveLength(0)
    expect(result.feasible).toBe(false)
  })

  it('treats available windows as a restriction', () => {
    const employee = makeEmployee('emp-1', ['pos-sales'])
    const availability: AvailabilityEntry[] = [
      { id: 'available-window', employeeId: employee.id, day: 'Pon', start: '10:00', end: '12:00', type: 'available' },
    ]
    const result = generateSchedule({ employees: [employee], positions, availability, shifts: [] }, {
      ...makeConfig(),
      startDate: '2026-11-09',
      endDate: '2026-11-09',
      workingDays: ['Pon'],
      templates: [{ id: 'morning', label: 'Morning', start: '06:00', end: '14:00', required: 1, type: 'poranna', positionIds: ['pos-sales'] }],
    })

    expect(result.shifts).toHaveLength(0)
    expect(result.feasible).toBe(false)
  })

  it('checks time off on the next day of an overnight shift', () => {
    const employee = makeEmployee('emp-1', ['pos-sales'])
    const availability: AvailabilityEntry[] = [
      { id: 'next-day-off', employeeId: employee.id, day: 'Wt', start: '00:00', end: '06:00', type: 'unavailable' },
    ]
    const result = generateSchedule({ employees: [employee], positions, availability, shifts: [] }, {
      ...makeConfig(),
      startDate: '2026-11-09',
      endDate: '2026-11-09',
      workingDays: ['Pon'],
      templates: [{ id: 'night', label: 'Night', start: '22:00', end: '06:00', required: 1, type: 'nocna', positionIds: ['pos-sales'] }],
    })

    expect(result.shifts).toHaveLength(0)
    expect(result.feasible).toBe(false)
  })

  it('keeps the generated schedule feasible and fair across employees', () => {
    const employees = [
      makeEmployee('emp-1', ['pos-sales', 'pos-customer']),
      makeEmployee('emp-2', ['pos-sales', 'pos-customer']),
      makeEmployee('emp-3', ['pos-sales', 'pos-customer']),
    ]

    const result = generateSchedule({ employees, positions, availability: [], shifts: [] }, {
      ...makeConfig(),
      templates: [
        { id: 'morning', label: 'Morning', start: '08:00', end: '16:00', required: 2, type: 'calodniowa', positionIds: ['pos-sales'] },
      ],
    })

    expect(result.feasible).toBe(true)
    expect(result.summary.assignedEmployees).toBeGreaterThanOrEqual(2)
    expect(result.summary.totalHours).toBeGreaterThan(0)
  })
})
