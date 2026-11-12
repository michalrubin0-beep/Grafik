import { beforeEach, describe, expect, it, vi } from 'vitest'

const persistence = vi.hoisted(() => ({
  loadData: vi.fn(),
  saveData: vi.fn(),
}))

vi.mock('../lib/dexie', () => persistence)

import { useAppStore } from './useAppStore'
import type { Employee, Shift } from '../types'

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

const shift: Shift = {
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
}

describe('employee persistence actions', () => {
  beforeEach(() => {
    persistence.saveData.mockReset().mockResolvedValue(undefined)
    useAppStore.setState({
      employees: [],
      positions: [],
      shifts: [shift],
      availability: [],
      persistenceError: null,
    })
  })

  it('updates the visible employee list only after persistence succeeds', async () => {
    const saved = await useAppStore.getState().updateEmployee(employee)

    expect(saved).toBe(true)
    expect(useAppStore.getState().employees).toEqual([employee])
    expect(persistence.saveData).toHaveBeenCalledWith(expect.objectContaining({
      employees: [employee],
      shifts: [shift],
    }))
  })

  it('persists employee removal and deletes future shifts from the stored schedule', async () => {
    useAppStore.setState({ employees: [employee] })
    const futureShift = { ...shift, id: 'future-shift', date: '9999-12-31' }
    useAppStore.setState({ shifts: [shift, futureShift] })

    const saved = await useAppStore.getState().removeEmployee(employee.id)

    expect(saved).toBe(true)
    expect(useAppStore.getState().employees[0].active).toBe(false)
    expect(useAppStore.getState().shifts).toEqual([shift])
    expect(persistence.saveData).toHaveBeenCalledWith(expect.objectContaining({
      employees: [{ ...employee, active: false }],
      shifts: [shift],
    }))
  })

  it('reports a persistence failure without adding an unsaved employee', async () => {
    persistence.saveData.mockRejectedValueOnce(new Error('Błąd dysku'))

    const saved = await useAppStore.getState().updateEmployee(employee)

    expect(saved).toBe(false)
    expect(useAppStore.getState().employees).toEqual([])
    expect(useAppStore.getState().persistenceError).toBe('Błąd dysku')
  })
})
