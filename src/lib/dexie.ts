import Dexie, { type Table } from 'dexie'

import type { AppData, AvailabilityEntry, CompanySettings, Employee, Position, Shift } from '../types'

const createId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(16).slice(2)}`

export class GrafikProDB extends Dexie {
  employees!: Table<Employee>
  positions!: Table<Position>
  shifts!: Table<Shift>
  availability!: Table<AvailabilityEntry>
  settings!: Table<CompanySettings>

  constructor() {
    super('grafikpro-db')
    this.version(1).stores({
      employees: 'id',
      positions: 'id',
      shifts: 'id, date',
      availability: 'id, employeeId',
      settings: 'id',
    })
  }
}

export const db = new GrafikProDB()

export const defaultCompanySettings: CompanySettings = {
  id: 'company-settings',
  companyName: 'FUTURECART SP. Z O.O.',
  openingHoursStart: '07:00',
  openingHoursEnd: '22:00',
  workingDays: ['Pon', 'Wt', 'Śr', 'Czw', 'Pt'],
  defaultBreakMinutes: 30,
  currency: 'PLN',
  dateFormat: 'dd.MM.yyyy',
  firstDayOfWeek: 1,
  theme: 'dark',
}

export const defaultPositions: Position[] = [
  { id: 'pos-manager', name: 'Kierownik', description: 'Koordynacja zespołu', color: '#8b5cf6', required: 1 },
  { id: 'pos-cashier', name: 'Kasjer', description: 'Obsługa klientów i kasa', color: '#f59e0b', required: 2 },
  { id: 'pos-sales', name: 'Sprzedawca', description: 'Obsługa klienta i ekspozycja', color: '#22c55e', required: 2 },
  { id: 'pos-warehouse', name: 'Magazynier', description: 'Obsługa magazynu', color: '#38bdf8', required: 2 },
  { id: 'pos-production', name: 'Pracownik produkcji', description: 'Realizacja zleceń', color: '#fb7185', required: 3 },
  { id: 'pos-customer', name: 'Obsługa klienta', description: 'Pomoc klientom', color: '#f97316', required: 2 },
]

const employeeSeeds: Employee[] = [
  { id: 'emp-anja', firstName: 'Anja', lastName: 'Nowak', phone: '500111222', email: 'anja@futurecart.pl', positionIds: ['pos-manager'], contractType: 'Umowa o pracę', hireDate: '2021-01-10', fullTime: 1, monthlyHours: 160, preferredHours: '08:00-16:00', color: '#a78bfa', notes: 'Koordynuje pracę sklepu i magazynu', active: true },
  { id: 'emp-bartosz', firstName: 'Bartosz', lastName: 'Kowalski', phone: '501234567', email: 'bartosz@futurecart.pl', positionIds: ['pos-cashier', 'pos-sales'], contractType: 'Umowa o pracę', hireDate: '2022-05-12', fullTime: 0.75, monthlyHours: 120, preferredHours: '10:00-18:00', color: '#fbbf24', notes: 'Doświadczenie w obsłudze klientów', active: true },
  { id: 'emp-czesław', firstName: 'Czesław', lastName: 'Wiśniewski', phone: '502345678', email: 'czeslaw@futurecart.pl', positionIds: ['pos-warehouse'], contractType: 'Umowa zlecenie', hireDate: '2021-09-08', fullTime: 1, monthlyHours: 140, preferredHours: '06:00-14:00', color: '#38bdf8', notes: 'Wspiera logistykę i magazyn', active: true },
  { id: 'emp-daniel', firstName: 'Daniel', lastName: 'Lis', phone: '503456789', email: 'daniel@futurecart.pl', positionIds: ['pos-production'], contractType: 'Umowa o pracę', hireDate: '2020-12-18', fullTime: 1, monthlyHours: 180, preferredHours: '14:00-22:00', color: '#f472b6', notes: 'Nadzoruje proces produkcji', active: true },
  { id: 'emp-ewa', firstName: 'Ewa', lastName: 'Kaczmarek', phone: '504567890', email: 'ewa@futurecart.pl', positionIds: ['pos-sales', 'pos-customer'], contractType: 'Umowa o pracę', hireDate: '2023-02-02', fullTime: 0.8, monthlyHours: 130, preferredHours: '08:00-16:00', color: '#4ade80', notes: 'Obsługa klienta i merchandising', active: true },
  { id: 'emp-filip', firstName: 'Filip', lastName: 'Szymański', phone: '505678901', email: 'filip@futurecart.pl', positionIds: ['pos-production'], contractType: 'Umowa o pracę', hireDate: '2022-11-15', fullTime: 1, monthlyHours: 170, preferredHours: '06:00-14:00', color: '#f87171', notes: 'Wzmocnienie produkcji', active: true },
  { id: 'emp-gosia', firstName: 'Gosia', lastName: 'Duda', phone: '506789012', email: 'gosia@futurecart.pl', positionIds: ['pos-customer', 'pos-sales'], contractType: 'Umowa zlecenie', hireDate: '2023-01-07', fullTime: 0.7, monthlyHours: 110, preferredHours: '12:00-20:00', color: '#2dd4bf', notes: 'Obsługa strefy klienta', active: true },
  { id: 'emp-hubert', firstName: 'Hubert', lastName: 'Jankowski', phone: '507890123', email: 'hubert@futurecart.pl', positionIds: ['pos-warehouse'], contractType: 'Umowa o pracę', hireDate: '2022-04-25', fullTime: 1, monthlyHours: 155, preferredHours: '08:00-16:00', color: '#60a5fa', notes: 'Dostawy i magazyn', active: true },
  { id: 'emp-iza', firstName: 'Iza', lastName: 'Mazurek', phone: '508901234', email: 'iza@futurecart.pl', positionIds: ['pos-cashier'], contractType: 'Umowa o pracę', hireDate: '2021-06-14', fullTime: 0.9, monthlyHours: 140, preferredHours: '09:00-17:00', color: '#f9a8d4', notes: 'Obsługa kasy i zamówień', active: true },
  { id: 'emp-jacek', firstName: 'Jacek', lastName: 'Pawłowski', phone: '509012345', email: 'jacek@futurecart.pl', positionIds: ['pos-production'], contractType: 'Umowa o pracę', hireDate: '2020-08-01', fullTime: 1, monthlyHours: 160, preferredHours: '12:00-20:00', color: '#fdba74', notes: 'Działa w produkcji i nadzorze', active: true },
]

const buildCurrentWeekShifts = (): Shift[] => {
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - ((today.getDay() + 6) % 7))

  const shifts: Shift[] = [
    { id: 'shift-1', employeeId: 'emp-anja', date: toISODate(start), start: '08:00', end: '16:00', positionId: 'pos-manager', type: 'Rano', color: '#a78bfa', breakMinutes: 30, notes: 'Koordynacja zespołu' },
    { id: 'shift-2', employeeId: 'emp-bartosz', date: toISODate(start), start: '09:00', end: '17:00', positionId: 'pos-cashier', type: 'Rano', color: '#fbbf24', breakMinutes: 30, notes: 'Kasa i obsługa klientów' },
    { id: 'shift-3', employeeId: 'emp-czesław', date: toISODate(start), start: '06:00', end: '14:00', positionId: 'pos-warehouse', type: 'Rano', color: '#38bdf8', breakMinutes: 30, notes: 'Przyjmowanie dostaw' },
    { id: 'shift-4', employeeId: 'emp-ewa', date: toISODate(addDays(start, 1)), start: '08:00', end: '16:00', positionId: 'pos-sales', type: 'Rano', color: '#4ade80', breakMinutes: 30, notes: 'Ekspozycja i kontakt' },
    { id: 'shift-5', employeeId: 'emp-gosia', date: toISODate(addDays(start, 2)), start: '12:00', end: '20:00', positionId: 'pos-customer', type: 'Popołudnie', color: '#2dd4bf', breakMinutes: 30, notes: '' },
    { id: 'shift-6', employeeId: 'emp-hubert', date: toISODate(addDays(start, 3)), start: '07:00', end: '15:00', positionId: 'pos-warehouse', type: 'Rano', color: '#60a5fa', breakMinutes: 30, notes: 'Raport magazynowy' },
    { id: 'shift-7', employeeId: 'emp-iza', date: toISODate(addDays(start, 4)), start: '09:00', end: '17:00', positionId: 'pos-cashier', type: 'Rano', color: '#f9a8d4', breakMinutes: 30, notes: 'Kasa główna' },
    { id: 'shift-8', employeeId: 'emp-jacek', date: toISODate(addDays(start, 1)), start: '14:00', end: '22:00', positionId: 'pos-production', type: 'Popołudnie', color: '#fdba74', breakMinutes: 30, notes: 'Produkcja zlecenia' },
    { id: 'shift-9', employeeId: 'emp-filip', date: toISODate(addDays(start, 2)), start: '06:00', end: '14:00', positionId: 'pos-production', type: 'Rano', color: '#f87171', breakMinutes: 30, notes: 'Pakowanie zamówień' },
    { id: 'shift-10', employeeId: 'emp-daniel', date: toISODate(addDays(start, 4)), start: '14:00', end: '22:00', positionId: 'pos-production', type: 'Popołudnie', color: '#f472b6', breakMinutes: 30, notes: 'Obsługa linii' },
  ]

  return shifts
}

const buildAvailability = (): AvailabilityEntry[] => [
  { id: createId(), employeeId: 'emp-anja', day: 'Pon', start: '08:00', end: '16:00', type: 'available' },
  { id: createId(), employeeId: 'emp-bartosz', day: 'Wt', start: '09:00', end: '17:00', type: 'available' },
  { id: createId(), employeeId: 'emp-czesław', day: 'Śr', start: '06:00', end: '14:00', type: 'available' },
  { id: createId(), employeeId: 'emp-ewa', day: 'Pt', start: '08:00', end: '16:00', type: 'available' },
  { id: createId(), employeeId: 'emp-gosia', day: 'Czw', start: '12:00', end: '20:00', type: 'unavailable' },
  { id: createId(), employeeId: 'emp-hubert', day: 'Pon', start: '07:00', end: '15:00', type: 'available' },
  { id: createId(), employeeId: 'emp-jacek', day: 'Pt', start: '12:00', end: '20:00', type: 'available' },
]

export const sampleData: AppData = {
  companySettings: defaultCompanySettings,
  employees: employeeSeeds,
  positions: defaultPositions,
  shifts: buildCurrentWeekShifts(),
  availability: buildAvailability(),
}

export async function initializeDatabase() {
  const hasSettings = await db.settings.count()
  if (hasSettings > 0) {
    return
  }

  await db.transaction('rw', db.settings, db.positions, db.employees, db.shifts, db.availability, async () => {
    await db.settings.put(defaultCompanySettings)
    await db.positions.bulkPut(defaultPositions)
    await db.employees.bulkPut(employeeSeeds)
    await db.shifts.bulkPut(buildCurrentWeekShifts())
    await db.availability.bulkPut(buildAvailability())
  })
}

async function loadBrowserData(): Promise<AppData> {
  await initializeDatabase()

  const [settings, employees, positions, shifts, availability] = await Promise.all([
    db.settings.get('company-settings'),
    db.employees.toArray(),
    db.positions.toArray(),
    db.shifts.toArray(),
    db.availability.toArray(),
  ])

  return {
    companySettings: settings ?? defaultCompanySettings,
    employees: employees.length ? employees : employeeSeeds,
    positions: positions.length ? positions : defaultPositions,
    shifts: shifts.length ? shifts : buildCurrentWeekShifts(),
    availability: availability.length ? availability : buildAvailability(),
  }
}

export async function loadData(): Promise<AppData> {
  const desktop = typeof window !== 'undefined' ? window.grafikProDesktop : undefined
  if (!desktop) return loadBrowserData()

  const data = await desktop.loadData()
  if (data) return data

  const legacyDataExists = await db.settings.count() > 0
  if (!legacyDataExists) {
    const initialData: AppData = {
      companySettings: { ...defaultCompanySettings, companyName: 'Moja firma' },
      employees: [],
      positions: defaultPositions,
      shifts: [],
      availability: [],
    }
    await desktop.saveData(initialData)
    return initialData
  }

  const legacyData = await loadBrowserData()
  await desktop.saveData(legacyData)
  return legacyData
}

export async function saveData(data: AppData) {
  const desktop = typeof window !== 'undefined' ? window.grafikProDesktop : undefined
  if (desktop) {
    await desktop.saveData(data)
    return
  }

  await db.transaction('rw', db.settings, db.positions, db.employees, db.shifts, db.availability, async () => {
    await db.settings.put(data.companySettings)
    await db.positions.clear()
    await db.employees.clear()
    await db.shifts.clear()
    await db.availability.clear()
    await db.positions.bulkPut(data.positions)
    await db.employees.bulkPut(data.employees)
    await db.shifts.bulkPut(data.shifts)
    await db.availability.bulkPut(data.availability)
  })
}

function addDays(date: Date, amount: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10)
}
