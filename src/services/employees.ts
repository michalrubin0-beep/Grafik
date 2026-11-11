import type { AppData, Employee } from '../types'

export function upsertEmployee(data: AppData, employee: Employee): AppData {
  const exists = data.employees.some((entry) => entry.id === employee.id)
  return {
    ...data,
    employees: exists
      ? data.employees.map((entry) => entry.id === employee.id ? employee : entry)
      : [...data.employees, employee],
  }
}

export function archiveEmployee(data: AppData, employeeId: string): AppData {
  if (!data.employees.some((employee) => employee.id === employeeId)) {
    throw new Error('Nie znaleziono pracownika do archiwizacji.')
  }

  return {
    ...data,
    employees: data.employees.map((employee) =>
      employee.id === employeeId ? { ...employee, active: false } : employee,
    ),
  }
}

export function restoreEmployee(data: AppData, employeeId: string): AppData {
  if (!data.employees.some((employee) => employee.id === employeeId)) {
    throw new Error('Nie znaleziono pracownika do przywrócenia.')
  }

  return {
    ...data,
    employees: data.employees.map((employee) =>
      employee.id === employeeId ? { ...employee, active: true } : employee,
    ),
  }
}
