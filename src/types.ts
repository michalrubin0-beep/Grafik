export type Position = {
  id: string
  name: string
  description: string
  color: string
  required: number
}

export type Employee = {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string
  positionIds: string[]
  contractType: string
  hireDate: string
  fullTime: number
  monthlyHours: number
  preferredHours: string
  color: string
  notes: string
  active: boolean
}

export type ShiftType = 'Rano' | 'Popołudnie' | 'Noc' | 'Weekend'

export type Shift = {
  id: string
  employeeId: string
  date: string
  start: string
  end: string
  positionId: string
  type: ShiftType
  color: string
  breakMinutes: number
  notes: string
}

export type AvailabilityEntry = {
  id: string
  employeeId: string
  day: string
  start: string
  end: string
  type: 'available' | 'unavailable' | 'dayOff' | 'vacation'
}

export type CompanySettings = {
  id: string
  companyName: string
  openingHoursStart: string
  openingHoursEnd: string
  workingDays: string[]
  defaultBreakMinutes: number
  currency: string
  dateFormat: string
  firstDayOfWeek: number
  theme: 'dark' | 'light'
}

export type AppData = {
  companySettings: CompanySettings
  employees: Employee[]
  positions: Position[]
  shifts: Shift[]
  availability: AvailabilityEntry[]
}
