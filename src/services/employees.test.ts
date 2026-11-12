import { describe, expect, it } from 'vitest'

import { removeEmployee, restoreEmployee, upsertEmployee } from './employees'
import type { AppData, Employee } from '../types'

const employee: Employee = {
  id: 'employee-1',
  firstName: 'Anna',
  lastName: 'Kowalska',
  phone: '',
  email: '',
  positionIds: ['position-1'],
  contractType: 'Umowa o pracę',
  hireDate: '2026-01-01',
  fullTime: 1,
  monthlyHours: 160,
  preferredHours: '',
  color: '#ffffff',
  notes: '',
  active: true,
}

const data: AppData = {
  companySettings: {
    id: 'company-settings',
    companyName: 'Test',
    openingHoursStart: '07:00',
    openingHoursEnd: '22:00',
    workingDays: ['Pon'],
    defaultBreakMinutes: 30,
    currency: 'PLN',
    dateFormat: 'dd.MM.yyyy',
    firstDayOfWeek: 1,
    theme: 'dark',
  },
  employees: [employee],
  positions: [],
  shifts: [{
    id: 'shift-1',
    employeeId: employee.id,
    date: '2026-11-09',
    start: '08:00',
    end: '16:00',
    positionId: 'position-1',
    type: 'Rano',
    color: '#ffffff',
    breakMinutes: 30,
    notes: '',
  }],
  availability: [{
    id: 'availability-1',
    employeeId: employee.id,
    day: 'Pon',
    start: '08:00',
    end: '16:00',
    type: 'available',
  }],
}

describe('employee actions', () => {
  it('adds a new employee and updates an existing employee by id', () => {
    const newEmployee = { ...employee, id: 'employee-2', firstName: 'Jan' }
    const withNewEmployee = upsertEmployee(data, newEmployee)

    expect(withNewEmployee.employees.map((entry) => entry.id)).toEqual(['employee-1', 'employee-2'])
    expect(upsertEmployee(withNewEmployee, { ...newEmployee, lastName: 'Nowak' }).employees).toHaveLength(2)
    expect(upsertEmployee(withNewEmployee, { ...newEmployee, lastName: 'Nowak' }).employees[1].lastName).toBe('Nowak')
  })

  it('removes future shifts, keeps completed shift history and availability, and allows restoring the employee', () => {
    const dataWithFutureShifts: AppData = {
      ...data,
      shifts: [
        ...data.shifts,
        { ...data.shifts[0], id: 'shift-started-today', date: '2026-11-12', start: '08:00', end: '12:00' },
        { ...data.shifts[0], id: 'shift-later-today', date: '2026-11-12', start: '14:00', end: '18:00' },
        { ...data.shifts[0], id: 'shift-future', date: '2026-11-13' },
      ],
    }
    const removed = removeEmployee(dataWithFutureShifts, employee.id, new Date(2026, 10, 12, 10, 0))

    expect(removed.employees[0].active).toBe(false)
    expect(removed.shifts.map((shift) => shift.id)).toEqual(['shift-1', 'shift-started-today'])
    expect(removed.availability).toEqual(data.availability)
    expect(restoreEmployee(removed, employee.id).employees[0].active).toBe(true)
  })

  it('rejects removing an unknown employee id', () => {
    expect(() => removeEmployee(data, 'missing-id')).toThrow('Nie znaleziono pracownika')
  })
})
