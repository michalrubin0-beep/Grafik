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

export function removeEmployee(data: AppData, employeeId: string, now = new Date()): AppData {
  if (!data.employees.some((employee) => employee.id === employeeId)) {
    throw new Error('Nie znaleziono pracownika do usunięcia.')
  }

  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  return {
    ...data,
    employees: data.employees.map((employee) =>
      employee.id === employeeId ? { ...employee, active: false } : employee,
    ),
    shifts: data.shifts.filter((shift) =>
      shift.employeeId !== employeeId ||
      shift.date < today ||
      (shift.date === today && shift.start <= currentTime),
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
