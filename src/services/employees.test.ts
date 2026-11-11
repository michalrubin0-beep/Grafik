import { describe, expect, it } from 'vitest'

import { archiveEmployee, restoreEmployee, upsertEmployee } from './employees'
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

  it('archives and restores an employee without deleting shifts or availability', () => {
    const archived = archiveEmployee(data, employee.id)

    expect(archived.employees[0].active).toBe(false)
    expect(archived.shifts).toEqual(data.shifts)
    expect(archived.availability).toEqual(data.availability)
    expect(restoreEmployee(archived, employee.id).employees[0].active).toBe(true)
  })

  it('rejects archiving an unknown employee id', () => {
    expect(() => archiveEmployee(data, 'missing-id')).toThrow('Nie znaleziono pracownika')
  })
})
