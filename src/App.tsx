import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { addDays, addWeeks, endOfWeek, format, isSameDay, parseISO, startOfWeek } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  AlertTriangle,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarRange,
  ChartColumnBig,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  LayoutDashboard,
  Moon,
  Settings,
  SunMedium,
  Users2,
  Zap,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import jsPDF from 'jspdf'
import ExcelJS from 'exceljs'

import { generateSchedule, getDefaultSchedulerConfig, type SchedulerConfig, type SchedulerTemplate } from './services/scheduler'
import { useAppStore } from './store/useAppStore'
import type { DesktopUpdateStatus } from './electron'
import type { Employee, Shift, ShiftType } from './types'

const navItems = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Grafik pracy', to: '/schedule', icon: CalendarRange },
  { label: 'Pracownicy', to: '/employees', icon: Users2 },
  { label: 'Stanowiska', to: '/positions', icon: BriefcaseBusiness },
  { label: 'Dostępność', to: '/availability', icon: Clock3 },
  { label: 'Automatyczne układanie grafiku', to: '/auto-schedule', icon: Zap },
  { label: 'Statystyki', to: '/statistics', icon: ChartColumnBig },
  { label: 'Raporty', to: '/reports', icon: FileText },
  { label: 'Ustawienia', to: '/settings', icon: Settings },
]

const weekdayTitles = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz']

const createId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(16).slice(2)}`

function formatDate(date: Date) {
  return format(date, 'd MMMM yyyy', { locale: pl })
}

function formatShiftTime(value: string) {
  return value.slice(0, 5)
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function getDurationMinutes(shift: Pick<Shift, 'start' | 'end'>) {
  const startMinutes = toMinutes(shift.start)
  const endMinutes = toMinutes(shift.end)
  const duration = endMinutes - startMinutes
  return duration > 0 ? duration : duration + 24 * 60
}

function getShiftHours(shift: Pick<Shift, 'start' | 'end' | 'breakMinutes'>) {
  const total = getDurationMinutes(shift) - (shift.breakMinutes ?? 0)
  return total / 60
}

function getEmployeeName(employee: Employee | undefined) {
  return employee ? `${employee.firstName} ${employee.lastName}` : 'Brak pracownika'
}

function StatCard({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'green' | 'orange' | 'red' }) {
  const tones = {
    neutral: 'border-slate-700 bg-slate-900/70 text-slate-100',
    green: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
    orange: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    red: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
  }

  return (
    <div className={`rounded-2xl border p-4 shadow-lg ${tones[tone]}`}>
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-4 text-3xl font-semibold">{value}</p>
    </div>
  )
}

function DashboardPage() {
  const employees = useAppStore((state) => state.employees)
  const shifts = useAppStore((state) => state.shifts)
  const positions = useAppStore((state) => state.positions)

  const totalHours = shifts.reduce((sum, shift) => sum + getShiftHours(shift), 0)
  const scheduledToday = shifts.filter((shift) => isSameDay(parseISO(shift.date), new Date())).length
  const conflicts = shifts.filter((shift, index) => {
    const sameEmployee = shifts.filter((entry) => entry.employeeId === shift.employeeId)
    return sameEmployee.some((item, itemIndex) => {
      if (index === itemIndex || item.id === shift.id) return false
      return getDurationMinutes({ start: shift.start, end: shift.end }) + getDurationMinutes({ start: item.start, end: item.end }) > 0 && shift.date === item.date
    })
  }).length

  const vacancies = positions.reduce((count, position) => {
    const assigned = employees.filter((employee) => employee.positionIds.includes(position.id) && employee.active).length
    return count + Math.max(position.required - assigned, 0)
  }, 0)

  const weeklyChart = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), index)
    const value = shifts
      .filter((shift) => isSameDay(parseISO(shift.date), day))
      .reduce((sum, shift) => sum + getShiftHours(shift), 0)

    return {
      name: weekdayTitles[index],
      hours: Number(value.toFixed(1)),
    }
  })

  const employeeChart = employees.slice(0, 6).map((employee) => ({
    name: employee.firstName,
    hours: shifts.filter((shift) => shift.employeeId === employee.id).reduce((sum, shift) => sum + getShiftHours(shift), 0),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">Pulpit</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Dashboard</h1>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Pracownicy" value={String(employees.filter((employee) => employee.active).length)} />
        <StatCard label="Zaplanowani dziś" value={String(scheduledToday)} tone="green" />
        <StatCard label="Zmiany w tygodniu" value={String(shifts.length)} tone="orange" />
        <StatCard label="Łączne godziny" value={`${totalHours.toFixed(1)}h`} tone="neutral" />
        <StatCard label="Nieobsadzone zmiany" value={String(vacancies)} tone="red" />
        <StatCard label="Konflikty" value={String(conflicts)} tone="red" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Panel title="Podsumowanie godzin w bieżącym tygodniu">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#cbd5e1" />
                <YAxis stroke="#cbd5e1" />
                <Tooltip />
                <Bar dataKey="hours" fill="#38bdf8" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Najbliższe zmiany">
          <div className="space-y-3">
            {shifts.slice(0, 4).map((shift) => {
              const employee = employees.find((entry) => entry.id === shift.employeeId)
              const position = positions.find((entry) => entry.id === shift.positionId)
              return (
                <div key={shift.id} className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{getEmployeeName(employee)}</span>
                    <span className="rounded-full px-2 py-1 text-[10px] uppercase text-slate-900" style={{ backgroundColor: shift.color }}>{shift.type}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{format(parseISO(shift.date), 'EEEE, d MMM', { locale: pl })}</p>
                  <p className="text-sm text-slate-400">{formatShiftTime(shift.start)} - {formatShiftTime(shift.end)} · {position?.name}</p>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Pracownicy bez przydzielonej zmiany">
          <ul className="space-y-2 text-sm text-slate-300">
            {employees.filter((employee) => employee.active !== false && !shifts.some((shift) => shift.employeeId === employee.id && isSameDay(parseISO(shift.date), new Date()))).map((employee) => (
              <li key={employee.id} className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2">{employee.firstName} {employee.lastName}</li>
            ))}
          </ul>
        </Panel>

        <Panel title="Ostrzeżenia o konfliktach">
          <div className="space-y-2 text-sm text-amber-200">
            <div className="flex items-center gap-2"><AlertTriangle size={16}/> 2 pracowników w tej samej godzinie na stanowisku.</div>
            <div className="flex items-center gap-2"><AlertTriangle size={16}/> 1 pracownik ma zbyt krótki odpoczynek między zmianami.</div>
          </div>
        </Panel>

        <Panel title="Wykres godzin pracy">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={employeeChart} dataKey="hours" nameKey="name" innerRadius={35} outerRadius={70} fill="#38bdf8" label={{ fill: '#e2e8f0', fontSize: 11 }}>
                  {employeeChart.map((entry, index) => <Cell key={entry.name} fill={['#38bdf8', '#f59e0b', '#22c55e', '#f472b6', '#a78bfa', '#f87171'][index % 6]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="Podgląd dzisiejszego grafiku">
        <div className="grid gap-3 md:grid-cols-3">
          {employees.slice(0, 6).map((employee) => {
            const employeeShifts = shifts.filter((shift) => shift.employeeId === employee.id && isSameDay(parseISO(shift.date), new Date()))
            return (
              <div key={employee.id} className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{employee.firstName} {employee.lastName}</span>
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: employee.color }} />
                </div>
                {employeeShifts.length ? employeeShifts.map((shift) => (
                  <p key={shift.id} className="mt-2 text-sm text-slate-300">{formatShiftTime(shift.start)} - {formatShiftTime(shift.end)}</p>
                )) : <p className="mt-2 text-sm text-slate-400">Brak przydziału</p>}
              </div>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}

function SchedulePage() {
  const employees = useAppStore((state) => state.employees)
  const activeEmployees = useMemo(() => employees.filter((employee) => employee.active !== false), [employees])
  const positions = useAppStore((state) => state.positions)
  const shifts = useAppStore((state) => state.shifts)
  const upsertShift = useAppStore((state) => state.upsertShift)
  const deleteShift = useAppStore((state) => state.deleteShift)
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [form, setForm] = useState({
    id: '',
    employeeId: employees.find((employee) => employee.active !== false)?.id ?? '',
    date: format(new Date(), 'yyyy-MM-dd'),
    start: '08:00',
    end: '16:00',
    positionId: positions[0]?.id ?? '',
    type: 'Rano' as ShiftType,
    color: '#38bdf8',
    breakMinutes: 30,
    notes: '',
  })
  const [open, setOpen] = useState(false)

  const selectedEmployeeId = activeEmployees.some((employee) => employee.id === form.employeeId) ||
    (Boolean(form.id) && employees.some((employee) => employee.id === form.employeeId))
    ? form.employeeId
    : activeEmployees[0]?.id ?? ''

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!selectedEmployeeId || !form.positionId) return

    upsertShift({
      id: form.id || createId(),
      employeeId: selectedEmployeeId,
      date: form.date,
      start: form.start,
      end: form.end,
      positionId: form.positionId,
      type: form.type,
      color: form.color,
      breakMinutes: form.breakMinutes,
      notes: form.notes,
    })
    setOpen(false)
    setForm({
      id: '',
      employeeId: activeEmployees[0]?.id ?? '',
      date: form.date,
      start: '08:00',
      end: '16:00',
      positionId: positions[0]?.id ?? '',
      type: 'Rano',
      color: '#38bdf8',
      breakMinutes: 30,
      notes: '',
    })
  }

  const editShift = (shift: Shift) => {
    setForm({
      id: shift.id,
      employeeId: shift.employeeId,
      date: shift.date,
      start: shift.start,
      end: shift.end,
      positionId: shift.positionId,
      type: shift.type,
      color: shift.color,
      breakMinutes: shift.breakMinutes,
      notes: shift.notes,
    })
    setOpen(true)
  }

  const createShiftForCell = (date: string, employeeId: string) => {
    if (!activeEmployees.some((employee) => employee.id === employeeId)) return
    setForm({
      id: '',
      employeeId,
      date,
      start: '08:00',
      end: '16:00',
      positionId: positions[0]?.id ?? '',
      type: 'Rano',
      color: '#38bdf8',
      breakMinutes: 30,
      notes: '',
    })
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">Grafik</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Grafik pracy</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-200" onClick={() => setWeekStart((current) => addWeeks(current, -1))}><ChevronLeft /></button>
          <button type="button" className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-200" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Dzisiaj</button>
          <button type="button" className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-200" onClick={() => setWeekStart((current) => addWeeks(current, 1))}><ChevronRight /></button>
          <button type="button" className="rounded-xl bg-cyan-500 px-4 py-2 font-medium text-slate-950" onClick={() => setOpen(true)}>Dodaj zmianę</button>
        </div>
      </div>

      <Panel title={`Tydzień ${format(weekStart, 'dd.MM')} - ${format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'dd.MM.yyyy')}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-2 text-left text-sm">
            <thead>
              <tr>
                <th className="w-44 rounded-xl bg-slate-900 p-3 text-slate-400">Pracownik</th>
                {weekDates.map((day) => (
                  <th key={day.toISOString()} className="rounded-xl bg-slate-900 p-3 text-slate-300">
                    <div>{weekdayTitles[day.getDay() === 0 ? 6 : day.getDay() - 1]}</div>
                    <div className="text-xs text-slate-400">{format(day, 'dd.MM')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: employee.color }} />
                      <div>
                        <p className="font-medium text-white">{employee.firstName} {employee.lastName}</p>
                        <p className="text-xs text-slate-400">{employee.monthlyHours}h / msc</p>
                      </div>
                    </div>
                  </td>
                  {weekDates.map((day) => {
                    const dateKey = format(day, 'yyyy-MM-dd')
                    const dayShifts = shifts.filter((shift) => shift.employeeId === employee.id && shift.date === dateKey)
                    return (
                      <td key={`${employee.id}-${dateKey}`} className="rounded-xl border border-slate-700 bg-slate-900/50 p-2 align-top">
                        <div className="space-y-2">
                          {dayShifts.length ? dayShifts.map((shift) => (
                            <button type="button" key={shift.id} onClick={() => editShift(shift)} className="w-full rounded-lg border border-slate-700 p-2 text-left text-xs text-slate-100" style={{ backgroundColor: `${shift.color}22`, borderColor: shift.color }}>
                              <div className="flex items-center justify-between">
                                <span>{shift.type}</span>
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: shift.color }} />
                              </div>
                              <div className="mt-1">{formatShiftTime(shift.start)} - {formatShiftTime(shift.end)}</div>
                              <div className="text-[10px] text-slate-300">{positions.find((entry) => entry.id === shift.positionId)?.name}</div>
                            </button>
                          )) : (
                            <button type="button" onClick={() => createShiftForCell(dateKey, employee.id)} className="flex h-10 w-full items-center justify-center rounded-lg border border-dashed border-slate-600 text-[10px] uppercase tracking-[0.25em] text-slate-500">+ Dodaj</button>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="text-2xl font-semibold text-white">{form.id ? 'Edytuj zmianę' : 'Dodaj zmianę'}</h2>
            <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-300">
                <span>Pracownik</span>
                <select value={selectedEmployeeId} onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white">
                  {employees.filter((employee) => employee.active !== false || (form.id && employee.id === form.employeeId)).map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Data</span>
                <input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Godzina rozpoczęcia</span>
                <input type="time" value={form.start} onChange={(event) => setForm((current) => ({ ...current, start: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Godzina zakończenia</span>
                <input type="time" value={form.end} onChange={(event) => setForm((current) => ({ ...current, end: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Stanowisko</span>
                <select value={form.positionId} onChange={(event) => setForm((current) => ({ ...current, positionId: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white">
                  {positions.map((position) => <option key={position.id} value={position.id}>{position.name}</option>)}
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Typ zmiany</span>
                <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as ShiftType }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white">
                  <option value="Rano">Rano</option>
                  <option value="Popołudnie">Popołudnie</option>
                  <option value="Noc">Noc</option>
                  <option value="Weekend">Weekend</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Przerwa (min.)</span>
                <input type="number" min={0} step={15} value={form.breakMinutes} onChange={(event) => setForm((current) => ({ ...current, breakMinutes: Number(event.target.value) }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Kolor</span>
                <input type="color" value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 p-1 text-white" />
              </label>
              <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
                <span>Uwagi</span>
                <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
              </label>

              <div className="md:col-span-2 flex items-center justify-between gap-3">
                <button type="button" onClick={() => { if (form.id) deleteShift(form.id); setOpen(false) }} className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-rose-200">Usuń</button>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-300">Anuluj</button>
                  <button type="submit" className="rounded-xl bg-cyan-500 px-4 py-2 font-medium text-slate-950">Zapisz</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function EmployeesPage() {
  const employees = useAppStore((state) => state.employees)
  const positions = useAppStore((state) => state.positions)
  const updateEmployee = useAppStore((state) => state.updateEmployee)
  const removeEmployee = useAppStore((state) => state.removeEmployee)
  const restoreEmployee = useAppStore((state) => state.restoreEmployee)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [employeeStatus, setEmployeeStatus] = useState<'active' | 'removed'>('active')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    positionIds: [] as string[],
    contractType: 'Umowa o pracę',
    hireDate: '2024-01-01',
    fullTime: 1,
    monthlyHours: 160,
    preferredHours: '08:00-16:00',
    color: '#38bdf8',
    notes: '',
  })

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch = `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(search.toLowerCase())
    const matchesPosition = filter === 'all' || employee.positionIds.includes(filter)
    const matchesStatus = employeeStatus === 'removed' ? employee.active === false : employee.active !== false
    return matchesSearch && matchesPosition && matchesStatus
  })

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setMessage('')
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setMessage('Imię i nazwisko są wymagane.')
      return
    }
    if (!positions.length) {
      setMessage('Dodaj stanowisko przed utworzeniem pracownika.')
      return
    }
    setSaving(true)
    const saved = await updateEmployee({
      id: createId(),
      active: true,
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      positionIds: form.positionIds.length ? form.positionIds : [positions[0].id],
    })
    setSaving(false)
    if (!saved) {
      setMessage(`Nie udało się zapisać pracownika: ${useAppStore.getState().persistenceError ?? 'błąd zapisu danych.'}`)
      return
    }
    setMessage('Pracownik został zapisany.')
    setForm({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      positionIds: [],
      contractType: 'Umowa o pracę',
      hireDate: '2024-01-01',
      fullTime: 1,
      monthlyHours: 160,
      preferredHours: '08:00-16:00',
      color: '#38bdf8',
      notes: '',
    })
  }

  const handleRemove = async (employee: Employee) => {
    if (!window.confirm(`Czy usunąć ${employee.firstName} ${employee.lastName} z aktywnych pracowników? Nierozpoczęte zmiany od dziś zostaną usunięte z grafiku. Zakończone i rozpoczęte zmiany oraz dostępność pozostaną zachowane. Pracownika będzie można przywrócić z listy usuniętych.`)) return
    setMessage('')
    setSaving(true)
    const saved = await removeEmployee(employee.id)
    setSaving(false)
    setMessage(saved ? 'Pracownik został usunięty z aktywnej listy, a jego przyszłe zmiany usunięto z grafiku.' : `Nie udało się usunąć pracownika: ${useAppStore.getState().persistenceError ?? 'błąd zapisu danych.'}`)
  }

  const handleRestore = async (employee: Employee) => {
    setMessage('')
    setSaving(true)
    const saved = await restoreEmployee(employee.id)
    setSaving(false)
    setMessage(saved ? 'Pracownik został przywrócony.' : `Nie udało się przywrócić pracownika: ${useAppStore.getState().persistenceError ?? 'błąd zapisu danych.'}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">Personel</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Pracownicy</h1>
        </div>
      </div>

      {message && <p role="status" className={`rounded-xl border p-3 ${message.startsWith('Nie udało') ? 'border-rose-500/30 bg-rose-500/10 text-rose-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'}`}>{message}</p>}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Panel title="Lista pracowników">
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Wyszukaj po imieniu i nazwisku" className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
            <select value={employeeStatus} onChange={(event) => setEmployeeStatus(event.target.value as 'active' | 'removed')} className="rounded-xl border border-slate-700 bg-slate-950 p-2 text-white">
              <option value="active">Aktywni pracownicy</option>
              <option value="removed">Usunięci pracownicy</option>
            </select>
            <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 p-2 text-white">
              <option value="all">Wszystkie stanowiska</option>
              {positions.map((position) => <option key={position.id} value={position.id}>{position.name}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            {filteredEmployees.map((employee) => (
              <div key={employee.id} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: employee.color }} />
                    <div>
                      <h3 className="font-medium text-white">{employee.firstName} {employee.lastName}</h3>
                      <p className="text-xs text-slate-400">{employee.email}</p>
                    </div>
                  </div>
                  {employee.active === false
                    ? <button type="button" disabled={saving} onClick={() => void handleRestore(employee)} className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200">Przywróć</button>
                    : <button type="button" disabled={saving} onClick={() => void handleRemove(employee)} className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-200">Usuń</button>}
                </div>
                <div className="mt-4 grid gap-2 text-sm text-slate-300 md:grid-cols-3">
                  <div>Telefon: {employee.phone || '—'}</div>
                  <div>Umowa: {employee.contractType}</div>
                  <div>Etat: {employee.fullTime}</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {employee.positionIds.map((positionId) => (
                    <span key={positionId} className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200">{positions.find((entry) => entry.id === positionId)?.name}</span>
                  ))}
                </div>
              </div>
            ))}
            {!filteredEmployees.length && <p className="text-sm text-slate-400">Brak pracowników spełniających wybrane kryteria.</p>}
          </div>
        </Panel>

        <Panel title="Dodaj pracownika">
          <form onSubmit={handleSubmit} className="space-y-3 text-sm text-slate-300">
            <input required value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} placeholder="Imię" className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
            <input required value={form.lastName} onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))} placeholder="Nazwisko" className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
            <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Telefon" className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
            <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="E-mail" className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
            <select required disabled={!positions.length} value={form.positionIds[0] ?? positions[0]?.id ?? ''} onChange={(event) => setForm((current) => ({ ...current, positionIds: [event.target.value] }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white">
              {!positions.length && <option value="">Najpierw dodaj stanowisko</option>}
              {positions.map((position) => <option key={position.id} value={position.id}>{position.name}</option>)}
            </select>
            <input value={form.contractType} onChange={(event) => setForm((current) => ({ ...current, contractType: event.target.value }))} placeholder="Rodzaj umowy" className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
            <input type="date" value={form.hireDate} onChange={(event) => setForm((current) => ({ ...current, hireDate: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
            <input type="number" value={form.fullTime} min={0.1} step={0.1} onChange={(event) => setForm((current) => ({ ...current, fullTime: Number(event.target.value) }))} placeholder="Wymiar etatu" className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
            <input type="number" value={form.monthlyHours} onChange={(event) => setForm((current) => ({ ...current, monthlyHours: Number(event.target.value) }))} placeholder="Miesięczny limit godzin" className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
            <input value={form.preferredHours} onChange={(event) => setForm((current) => ({ ...current, preferredHours: event.target.value }))} placeholder="Preferowane godziny" className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
            <input type="color" value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 p-1 text-white" />
            <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Dodatkowe informacje" className="min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
            <button type="submit" disabled={saving} className="w-full rounded-xl bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-50">{saving ? 'Zapisywanie…' : 'Dodaj pracownika'}</button>
          </form>
        </Panel>
      </div>
    </div>
  )
}

function PositionsPage() {
  const positions = useAppStore((state) => state.positions)
  const updatePosition = useAppStore((state) => state.updatePosition)
  const deletePosition = useAppStore((state) => state.deletePosition)
  const [form, setForm] = useState({ name: '', description: '', color: '#38bdf8', required: 1 })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    updatePosition({ id: createId(), ...form })
    setForm({ name: '', description: '', color: '#38bdf8', required: 1 })
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">Stanowiska</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Zarządzanie stanowiskami</h1>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Panel title="Lista stanowisk">
          <div className="space-y-3">
            {positions.map((position) => (
              <div key={position.id} className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: position.color }} />
                  <div>
                    <div className="font-medium text-white">{position.name}</div>
                    <div className="text-sm text-slate-400">{position.description}</div>
                  </div>
                </div>
                <button type="button" onClick={() => deletePosition(position.id)} className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-200">Usuń</button>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Dodaj stanowisko">
          <form onSubmit={handleSubmit} className="space-y-3 text-sm text-slate-300">
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nazwa stanowiska" className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Opis" className="min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
            <input type="color" value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 p-1 text-white" />
            <input type="number" value={form.required} min={1} onChange={(event) => setForm((current) => ({ ...current, required: Number(event.target.value) }))} placeholder="Wymagana liczba pracowników" className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
            <button type="submit" className="w-full rounded-xl bg-cyan-500 px-4 py-2 font-medium text-slate-950">Dodaj stanowisko</button>
          </form>
        </Panel>
      </div>
    </div>
  )
}

function AvailabilityPage() {
  const employees = useAppStore((state) => state.employees)
  const activeEmployees = useMemo(() => employees.filter((employee) => employee.active !== false), [employees])
  const availability = useAppStore((state) => state.availability)
  const addAvailability = useAppStore((state) => state.addAvailability)
  const deleteAvailability = useAppStore((state) => state.deleteAvailability)

  const [form, setForm] = useState({ employeeId: employees.find((employee) => employee.active !== false)?.id ?? '', day: 'Pon', start: '08:00', end: '16:00', type: 'available' as 'available' | 'unavailable' | 'dayOff' | 'vacation' })

  const selectedEmployeeId = activeEmployees.some((employee) => employee.id === form.employeeId)
    ? form.employeeId
    : activeEmployees[0]?.id ?? ''

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!selectedEmployeeId) return
    addAvailability({ id: createId(), ...form, employeeId: selectedEmployeeId })
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">Dostępność</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Dostępność pracowników</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Wpisane dostępności">
          <div className="space-y-3">
            {availability.map((entry) => {
              const employee = employees.find((item) => item.id === entry.employeeId)
              return (
                <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
                  <div>
                    <div className="font-medium text-white">{employee ? `${employee.firstName} ${employee.lastName}` : 'Pracownik'}</div>
                    <div className="text-sm text-slate-300">{entry.day} · {entry.start} - {entry.end} · {entry.type}</div>
                  </div>
                  <button type="button" onClick={() => deleteAvailability(entry.id)} className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-200">Usuń</button>
                </div>
              )
            })}
          </div>
        </Panel>

        <Panel title="Dodaj dostępność">
          <form onSubmit={handleSubmit} className="space-y-3 text-sm text-slate-300">
            <select value={selectedEmployeeId} onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white">
              {activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}
            </select>
            <select value={form.day} onChange={(event) => setForm((current) => ({ ...current, day: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white">
              {weekdayTitles.map((day) => <option key={day} value={day}>{day}</option>)}
            </select>
            <input type="time" value={form.start} onChange={(event) => setForm((current) => ({ ...current, start: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
            <input type="time" value={form.end} onChange={(event) => setForm((current) => ({ ...current, end: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
            <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as 'available' | 'unavailable' | 'dayOff' | 'vacation' }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white">
              <option value="available">Dostępny</option>
              <option value="unavailable">Niedostępny</option>
              <option value="dayOff">Dzień wolny</option>
              <option value="vacation">Urlop</option>
            </select>
            <button type="submit" className="w-full rounded-xl bg-cyan-500 px-4 py-2 font-medium text-slate-950">Zapisz dostępność</button>
          </form>
        </Panel>
      </div>
    </div>
  )
}

function AutoSchedulingPage() {
  const employees = useAppStore((state) => state.employees)
  const positions = useAppStore((state) => state.positions)
  const availability = useAppStore((state) => state.availability)
  const shifts = useAppStore((state) => state.shifts)
  const upsertShift = useAppStore((state) => state.upsertShift)
  const companySettings = useAppStore((state) => state.companySettings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [generated, setGenerated] = useState<ReturnType<typeof generateSchedule> | null>(null)
  const [config, setConfig] = useState<SchedulerConfig>({
    ...getDefaultSchedulerConfig(),
    workingDays: companySettings.workingDays,
    templates: [
      { id: 'morning', label: 'Zmiana poranna', start: '06:00', end: '14:00', required: 2, type: 'poranna', positionIds: ['pos-sales', 'pos-customer'] },
      { id: 'afternoon', label: 'Zmiana popołudniowa', start: '14:00', end: '22:00', required: 2, type: 'popołudniowa', positionIds: ['pos-sales', 'pos-customer'] },
      { id: 'night', label: 'Zmiana nocna', start: '22:00', end: '06:00', required: 1, type: 'nocna', positionIds: ['pos-production', 'pos-warehouse'] },
      { id: 'full', label: 'Zmiana całodniowa', start: '08:00', end: '16:00', required: 1, type: 'calodniowa', positionIds: ['pos-manager', 'pos-production'] },
    ],
  })

  const generatedShiftsForDisplay = useMemo(() => {
    if (!generated) return []
    return generated.shifts
  }, [generated])

  const runGeneration = () => {
    const next = generateSchedule({ employees, positions, availability, shifts }, config)
    setGenerated(next)
  }

  const saveGenerated = (mode: 'draft' | 'confirm') => {
    if (!generated || !generated.feasible) return
    generated.shifts.forEach((shift) => upsertShift(shift))
    if (mode === 'confirm') {
      // do not replace previous schedule, only persist the generated version into the core data set
    }
  }

  const updateTemplate = (templateId: string, field: keyof SchedulerTemplate, value: string | number | string[]) => {
    setConfig((current) => ({
      ...current,
      templates: current.templates.map((template) =>
        template.id === templateId ? { ...template, [field]: value } : template,
      ),
    }))
  }

  const toggleDay = (day: string) => {
    setConfig((current) => ({
      ...current,
      workingDays: current.workingDays.includes(day)
        ? current.workingDays.filter((entry) => entry !== day)
        : [...current.workingDays, day],
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">Generator</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Inteligentny generator grafików</h1>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={runGeneration} className="rounded-xl bg-cyan-500 px-5 py-2 font-medium text-slate-950">GENERUJ GRAFIK</button>
          <button type="button" onClick={() => setSettingsOpen((open) => !open)} className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-2 text-slate-200">USTAWIENIA GENEROWANIA</button>
        </div>
      </div>

      {settingsOpen && (
        <Panel title="Konfiguracja wygenerowania">
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-300">
              <span>Typ zakresu</span>
              <select value={config.mode} onChange={(event) => setConfig((current) => ({ ...current, mode: event.target.value as 'week' | 'month' }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white">
                <option value="week">Tydzień</option>
                <option value="month">Miesiąc</option>
              </select>
            </label>
            <div className="space-y-2 text-sm text-slate-300">
              <span>Dni pracy</span>
              <div className="flex flex-wrap gap-2">
                {['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'].map((day) => (
                  <button key={day} type="button" onClick={() => toggleDay(day)} className={`rounded-full border px-3 py-1 ${config.workingDays.includes(day) ? 'border-cyan-500 bg-cyan-500/10 text-cyan-200' : 'border-slate-700 bg-slate-950 text-slate-300'}`}>
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <label className="space-y-2 text-sm text-slate-300">
              <span>Data rozpoczęcia</span>
              <input type="date" value={config.startDate} onChange={(event) => setConfig((current) => ({ ...current, startDate: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              <span>Data zakończenia</span>
              <input type="date" value={config.endDate} onChange={(event) => setConfig((current) => ({ ...current, endDate: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              <span>Godziny otwarcia firmy</span>
              <input value={companySettings.openingHoursStart} readOnly className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              <span>Minimalny limit godzin</span>
              <input type="number" value={config.minHoursPerEmployee} onChange={(event) => setConfig((current) => ({ ...current, minHoursPerEmployee: Number(event.target.value) }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
            </label>
          </div>

          <div className="mt-6 space-y-4">
            {config.templates.map((template) => (
              <div key={template.id} className="grid gap-3 rounded-2xl border border-slate-700 bg-slate-950/50 p-4 lg:grid-cols-5">
                <input value={template.label} onChange={(event) => updateTemplate(template.id, 'label', event.target.value)} className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-white" />
                <input type="time" value={template.start} onChange={(event) => updateTemplate(template.id, 'start', event.target.value)} className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-white" />
                <input type="time" value={template.end} onChange={(event) => updateTemplate(template.id, 'end', event.target.value)} className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-white" />
                <input type="number" min={1} value={template.required} onChange={(event) => updateTemplate(template.id, 'required', Number(event.target.value))} className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-white" />
                <select value={template.positionIds[0] ?? ''} onChange={(event) => updateTemplate(template.id, 'positionIds', [event.target.value])} className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-white">
                  {positions.map((position) => <option key={position.id} value={position.id}>{position.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {generated && (
        <Panel title="Podgląd wygenerowanego grafiku">
          <div className="mb-4 flex flex-wrap gap-3">
            <button type="button" disabled={!generated.feasible} onClick={() => saveGenerated('draft')} className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40">ZAPISZ JAKO WERSJĘ ROBOCZĄ</button>
            <button type="button" disabled={!generated.feasible} onClick={() => saveGenerated('confirm')} className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-emerald-200 disabled:cursor-not-allowed disabled:opacity-40">ZATWIERDŹ GRAFIK</button>
            <button type="button" onClick={() => setGenerated(null)} className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-rose-200">ODRZUĆ GRAFIK</button>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <StatCard label="Łączne zmiany" value={String(generated.summary.totalShifts)} tone="neutral" />
            <StatCard label="Łączne godziny" value={`${generated.summary.totalHours.toFixed(1)}h`} tone="green" />
            <StatCard label="Pracownicy" value={String(generated.summary.assignedEmployees)} tone="orange" />
          </div>

          {generated.warnings.length > 0 && (
            <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
              {!generated.feasible && <p className="mb-2 font-semibold">Grafik jest niekompletny i nie można go zapisać. Zmień wymagania lub dostępność, a następnie wygeneruj go ponownie.</p>}
              {generated.warnings.map((warning) => <div key={warning}>{warning}</div>)}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-2 text-left text-sm">
              <thead>
                <tr>
                  <th className="rounded-xl bg-slate-900 p-3 text-slate-400">Pracownik</th>
                  <th className="rounded-xl bg-slate-900 p-3 text-slate-400">Data</th>
                  <th className="rounded-xl bg-slate-900 p-3 text-slate-400">Godziny</th>
                  <th className="rounded-xl bg-slate-900 p-3 text-slate-400">Typ</th>
                </tr>
              </thead>
              <tbody>
                {generatedShiftsForDisplay.map((shift) => {
                  const employee = employees.find((entry) => entry.id === shift.employeeId)
                  return (
                    <tr key={shift.id}>
                      <td className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-white">{employee ? `${employee.firstName} ${employee.lastName}` : 'Pracownik'}</td>
                      <td className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-slate-300">{shift.date}</td>
                      <td className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-slate-300">{shift.start} - {shift.end}</td>
                      <td className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-slate-300">{shift.type}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  )
}

function StatisticsPage() {
  const employees = useAppStore((state) => state.employees)
  const shifts = useAppStore((state) => state.shifts)
  const positions = useAppStore((state) => state.positions)

  const employeeHours = employees.map((employee) => ({
    name: `${employee.firstName} ${employee.lastName}`,
    hours: shifts.filter((shift) => shift.employeeId === employee.id).reduce((sum, shift) => sum + getShiftHours(shift), 0),
  }))

  const positionHours = positions.map((position) => ({
    name: position.name,
    value: shifts.filter((shift) => shift.positionId === position.id).reduce((sum, shift) => sum + getShiftHours(shift), 0),
  }))

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">Analiza</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Statystyki i analityka</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Godziny pracy pracowników">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={employeeHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#cbd5e1" />
                <YAxis stroke="#cbd5e1" />
                <Tooltip />
                <Bar dataKey="hours" fill="#22c55e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Rozkład zmian według stanowisk">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={positionHours} dataKey="value" nameKey="name" innerRadius={40} outerRadius={90} paddingAngle={2}>
                  {positionHours.map((entry, index) => <Cell key={entry.name} fill={['#a78bfa', '#22c55e', '#38bdf8', '#f59e0b', '#f472b6', '#f87171'][index % 6]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function ReportsPage() {
  const companySettings = useAppStore((state) => state.companySettings)
  const employees = useAppStore((state) => state.employees)
  const shifts = useAppStore((state) => state.shifts)

  const exportPdf = () => {
    const pdf = new jsPDF()
    pdf.text(companySettings.companyName, 14, 20)
    pdf.text('Raport grafiku pracy', 14, 30)
    let y = 42
    shifts.forEach((shift) => {
      const employee = employees.find((entry) => entry.id === shift.employeeId)
      pdf.text(`${employee ? `${employee.firstName} ${employee.lastName}` : 'Pracownik'} - ${shift.date} ${shift.start}-${shift.end}`, 14, y)
      y += 8
      if (y > 260) {
        pdf.addPage()
        y = 20
      }
    })
    pdf.save('grafikpro-raport.pdf')
  }

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Grafik')
    sheet.addRow(['Pracownik', 'Data', 'Start', 'Koniec', 'Stanowisko', 'Typ'])
    shifts.forEach((shift) => {
      const employee = employees.find((entry) => entry.id === shift.employeeId)
      sheet.addRow([employee ? `${employee.firstName} ${employee.lastName}` : 'Pracownik', shift.date, shift.start, shift.end, shift.positionId, shift.type])
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'grafikpro-raport.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportCsv = () => {
    const lines = ['Pracownik,Data,Start,Koniec,Typ']
    shifts.forEach((shift) => {
      const employee = employees.find((entry) => entry.id === shift.employeeId)
      lines.push(`${employee ? `${employee.firstName} ${employee.lastName}` : 'Pracownik'},${shift.date},${shift.start},${shift.end},${shift.type}`)
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'grafikpro-raport.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">Raporty</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Eksport i raporty</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <button type="button" onClick={exportPdf} className="rounded-2xl border border-cyan-500/40 bg-cyan-500/10 p-5 text-left text-cyan-200">Eksport PDF</button>
        <button type="button" onClick={exportExcel} className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-left text-emerald-200">Eksport XLSX</button>
        <button type="button" onClick={exportCsv} className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-left text-amber-200">Eksport CSV</button>
      </div>

      <Panel title="Aktywne zestawienia">
        <ul className="space-y-3 text-slate-300">
          <li>Grafik tygodniowy</li>
          <li>Grafik miesięczny</li>
          <li>Grafik konkretnego pracownika</li>
          <li>Zestawienie godzin pracowników</li>
          <li>Lista konfliktów</li>
          <li>Podsumowanie całego zespołu</li>
        </ul>
      </Panel>
    </div>
  )
}

function SettingsPage({
  appVersion,
  updateStatus,
  onCheckUpdates,
  onDownloadUpdate,
  onInstallUpdate,
}: {
  appVersion: string
  updateStatus: DesktopUpdateStatus
  onCheckUpdates: () => void
  onDownloadUpdate: () => void
  onInstallUpdate: () => void
}) {
  const settings = useAppStore((state) => state.companySettings)
  const setCompanySettings = useAppStore((state) => state.setCompanySettings)

  const [form, setForm] = useState(settings)
  const [backupBusy, setBackupBusy] = useState(false)
  const [backupMessage, setBackupMessage] = useState('')
  const [storageInfo, setStorageInfo] = useState<{
    databasePath: string
    backupDirectory: string
    latestBackup: string | null
  } | null>(null)

  const save = (event: FormEvent) => {
    event.preventDefault()
    setCompanySettings({ ...form, id: 'company-settings' })
  }

  useEffect(() => {
    const desktop = window.grafikProDesktop
    if (!desktop) return
    void desktop.getStorageInfo()
      .then(setStorageInfo)
      .catch((error: unknown) => setBackupMessage(error instanceof Error ? error.message : String(error)))
  }, [])

  const exportBackup = async () => {
    const desktop = window.grafikProDesktop
    if (!desktop) return
    setBackupBusy(true)
    setBackupMessage('')
    try {
      const result = await desktop.exportBackup()
      if (!result.canceled && result.filePath) setBackupMessage(`Kopia została zapisana: ${result.filePath}`)
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBackupBusy(false)
    }
  }

  const restoreBackup = async () => {
    const desktop = window.grafikProDesktop
    if (!desktop || !window.confirm('Przywrócenie kopii zastąpi obecne dane. Przed przywróceniem program utworzy kopię aktualnej bazy. Czy kontynuować?')) return
    setBackupBusy(true)
    setBackupMessage('')
    try {
      const result = await desktop.restoreBackup()
      if (result.canceled) return
      await useAppStore.getState().hydrate()
      setStorageInfo(await desktop.getStorageInfo())
      setBackupMessage('Kopia została przywrócona. Dane są ponownie wczytane.')
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBackupBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">Ustawienia</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Ustawienia firmy</h1>
      </div>

      <Panel title="Parametry firmy">
        <form onSubmit={save} className="grid gap-4 md:grid-cols-2 text-sm text-slate-300">
          <input value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} className="rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" placeholder="Nazwa firmy" />
          <input value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))} className="rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" placeholder="Waluta" />
          <input type="time" value={form.openingHoursStart} onChange={(event) => setForm((current) => ({ ...current, openingHoursStart: event.target.value }))} className="rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
          <input type="time" value={form.openingHoursEnd} onChange={(event) => setForm((current) => ({ ...current, openingHoursEnd: event.target.value }))} className="rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" />
          <input type="number" value={form.defaultBreakMinutes} onChange={(event) => setForm((current) => ({ ...current, defaultBreakMinutes: Number(event.target.value) }))} className="rounded-xl border border-slate-700 bg-slate-950 p-2 text-white" placeholder="Czas przerwy" />
          <select value={form.theme} onChange={(event) => setForm((current) => ({ ...current, theme: event.target.value as 'dark' | 'light' }))} className="rounded-xl border border-slate-700 bg-slate-950 p-2 text-white">
            <option value="dark">Dark Mode</option>
            <option value="light">Light Mode</option>
          </select>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="rounded-xl bg-cyan-500 px-4 py-2 font-medium text-slate-950">Zapisz ustawienia</button>
          </div>
        </form>
      </Panel>

      <Panel title="Baza danych i kopie zapasowe">
        {storageInfo ? (
          <div className="space-y-2 text-sm text-slate-300">
            <p>Baza danych jest zapisywana lokalnie na tym komputerze w formacie SQLite.</p>
            <p className="break-all text-slate-400">Plik bazy: {storageInfo.databasePath}</p>
            <p className="break-all text-slate-400">Folder automatycznych kopii: {storageInfo.backupDirectory}</p>
            <p>Ostatnia kopia: {storageInfo.latestBackup ?? 'Kopia zostanie utworzona przy pierwszym zapisie.'}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button type="button" disabled={backupBusy} onClick={() => void exportBackup()} className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-cyan-200 disabled:opacity-50">Eksportuj kopię bazy</button>
              <button type="button" disabled={backupBusy} onClick={() => void restoreBackup()} className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-amber-200 disabled:opacity-50">Przywróć kopię bazy</button>
            </div>
            {backupMessage && <p role="status" className="break-all pt-2 text-cyan-200">{backupMessage}</p>}
          </div>
        ) : (
          <p className="text-sm text-slate-300">Lokalna baza SQLite i kopie zapasowe są dostępne w zainstalowanej aplikacji Windows.</p>
        )}
      </Panel>

      <Panel title="Aktualizacje">
        <div className="space-y-3 text-sm text-slate-300">
          <p>Obecna wersja: <strong className="text-white">{appVersion}</strong></p>
          {updateStatus.state === 'available' && <p role="status">Dostępna jest wersja {updateStatus.version}.</p>}
          {updateStatus.state === 'not-available' && <p role="status">Aplikacja jest aktualna.</p>}
          {updateStatus.state === 'checking' && <p role="status">Sprawdzanie dostępności aktualizacji…</p>}
          {updateStatus.state === 'downloading' && <p role="status">Pobieranie aktualizacji: {updateStatus.percent}%</p>}
          {updateStatus.state === 'downloaded' && <p role="status">Wersja {updateStatus.version} została pobrana i jest gotowa do instalacji.</p>}
          {updateStatus.state === 'installing' && <p role="status">Tworzenie kopii bezpieczeństwa i ponowne uruchamianie aplikacji…</p>}
          {(updateStatus.state === 'error' || updateStatus.state === 'unavailable') && <p role="alert" className="text-rose-300">{updateStatus.message}</p>}
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={updateStatus.state === 'checking' || updateStatus.state === 'downloading' || updateStatus.state === 'installing'} onClick={onCheckUpdates} className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-cyan-200 disabled:opacity-50">Sprawdź aktualizacje</button>
            {updateStatus.state === 'available' && <button type="button" onClick={onDownloadUpdate} className="rounded-xl bg-cyan-500 px-4 py-2 font-medium text-slate-950">Pobierz aktualizację</button>}
            {updateStatus.state === 'downloaded' && <button type="button" onClick={onInstallUpdate} className="rounded-xl bg-cyan-500 px-4 py-2 font-medium text-slate-950">Zainstaluj i uruchom ponownie</button>}
          </div>
          <p className="text-xs text-slate-400">Do sprawdzenia i pobrania aktualizacji potrzebny jest internet. GrafikPro nadal działa offline. Dane pozostają lokalnie na tym komputerze.</p>
        </div>
      </Panel>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 shadow-lg shadow-slate-950/30">
      <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
      {children}
    </section>
  )
}

function AppShell() {
  const companySettings = useAppStore((state) => state.companySettings)
  const setCompanySettings = useAppStore((state) => state.setCompanySettings)
  const hydrate = useAppStore((state) => state.hydrate)
  const loading = useAppStore((state) => state.loading)
  const loadError = useAppStore((state) => state.loadError)
  const persistenceError = useAppStore((state) => state.persistenceError)
  const [appVersion, setAppVersion] = useState('—')
  const [updateStatus, setUpdateStatus] = useState<DesktopUpdateStatus>({ state: 'idle' })

  const theme = companySettings.theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.style.background = companySettings.theme === 'dark' ? '#020617' : '#f8fafc'
  }, [companySettings.theme])

  useEffect(() => {
    if (loading) {
      void hydrate()
    }
  }, [hydrate, loading])

  useEffect(() => {
    const desktop = window.grafikProDesktop
    if (!desktop) return

    let active = true
    const unsubscribe = desktop.onUpdateStatus((status) => setUpdateStatus(status))
    void Promise.all([desktop.getAppVersion(), desktop.getUpdateState()])
      .then(([version, status]) => {
        if (!active) return
        setAppVersion(version)
        setUpdateStatus(status)
      })
      .catch((error: unknown) => {
        if (active) {
          setUpdateStatus({
            state: 'error',
            message: error instanceof Error ? error.message : String(error),
          })
        }
      })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const runUpdateAction = (action: 'checkForUpdates' | 'downloadUpdate' | 'installUpdate') => {
    const desktop = window.grafikProDesktop
    if (!desktop) {
      setUpdateStatus({
        state: 'unavailable',
        message: 'Aktualizacje są dostępne w zainstalowanej aplikacji Windows.',
      })
      return
    }
    void desktop[action]()
      .then(setUpdateStatus)
      .catch((error: unknown) => setUpdateStatus({
        state: 'error',
        message: error instanceof Error ? error.message : String(error),
      }))
  }

  return (
    <div className={`${theme} min-h-screen`}>
      <HashRouter>
        <div className="flex min-h-screen">
          <aside className="w-72 border-r border-slate-800 bg-slate-950/90 p-5">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300"><Building2 /></div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">System</div>
                <div className="text-xl font-semibold text-white">GRAFIKPRO</div>
              </div>
            </div>

            <nav className="space-y-1">
              {navItems.map(({ label, to, icon: Icon }) => (
                <NavLink key={label} to={to} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${isActive ? 'bg-cyan-500/15 text-cyan-200' : 'text-slate-300 hover:bg-slate-800'}`}>
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
            </nav>
          </aside>

          <main className="flex-1 p-6">
            {loadError && <div role="alert" className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">Nie udało się wczytać lokalnych danych. {loadError}</div>}
            <header className="mb-6 flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{companySettings.companyName}</div>
                <div className="text-sm text-slate-300">{formatDate(new Date())}</div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" className="rounded-xl border border-slate-700 bg-slate-950 p-2 text-slate-200"><Bell size={18} /></button>
                <button type="button" onClick={() => setCompanySettings({ ...companySettings, theme: companySettings.theme === 'dark' ? 'light' : 'dark' })} className="rounded-xl border border-slate-700 bg-slate-950 p-2 text-slate-200">{companySettings.theme === 'dark' ? <SunMedium size={18} /> : <Moon size={18} />}</button>
                {persistenceError
                  ? <div role="alert" title={persistenceError} className="max-w-56 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-200">Błąd zapisu danych</div>
                  : <div className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200"><CheckCircle2 size={14} className="mr-1 inline" />Dane zapisane</div>}
              </div>
            </header>

            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/positions" element={<PositionsPage />} />
              <Route path="/availability" element={<AvailabilityPage />} />
              <Route path="/auto-schedule" element={<AutoSchedulingPage />} />
              <Route path="/statistics" element={<StatisticsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage
                appVersion={appVersion}
                updateStatus={updateStatus}
                onCheckUpdates={() => runUpdateAction('checkForUpdates')}
                onDownloadUpdate={() => runUpdateAction('downloadUpdate')}
                onInstallUpdate={() => runUpdateAction('installUpdate')}
              />} />
            </Routes>
            {updateStatus.state === 'available' && <div role="status" className="fixed bottom-5 right-5 z-40 rounded-xl border border-cyan-500/40 bg-slate-900 p-4 text-sm text-cyan-100 shadow-xl">Dostępna jest aktualizacja GrafikPro do wersji {updateStatus.version}. Szczegóły znajdziesz w Ustawieniach.</div>}
          </main>
        </div>
      </HashRouter>
    </div>
  )
}

function App() {
  return <AppShell />
}

export default App
