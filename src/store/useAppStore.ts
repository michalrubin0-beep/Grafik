import { create } from 'zustand'

import { loadData, saveData } from '../lib/dexie'
import { removeEmployee, restoreEmployee, upsertEmployee } from '../services/employees'
import type { AppData, AvailabilityEntry, CompanySettings, Employee, Position, Shift } from '../types'

const initialState: AppData = {
  companySettings: {
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
  },
  employees: [],
  positions: [],
  shifts: [],
  availability: [],
}

type AppStore = AppData & {
  hydrated: boolean
  loading: boolean
  loadError: string | null
  persistenceError: string | null
  hydrate: () => Promise<void>
  setCompanySettings: (settings: CompanySettings) => void
  updateEmployee: (employee: Employee) => Promise<boolean>
  removeEmployee: (id: string) => Promise<boolean>
  restoreEmployee: (id: string) => Promise<boolean>
  updatePosition: (position: Position) => void
  deletePosition: (id: string) => void
  upsertShift: (shift: Shift) => void
  deleteShift: (id: string) => void
  addAvailability: (entry: AvailabilityEntry) => void
  updateAvailability: (entry: AvailabilityEntry) => void
  deleteAvailability: (id: string) => void
  persist: () => Promise<void>
}

export const useAppStore = create<AppStore>((set, get) => {
  let writeQueue = Promise.resolve()

  const enqueueWrite = (operation: () => Promise<void>) => {
    const queued = writeQueue.then(operation)
    writeQueue = queued.then(() => undefined, () => undefined)
    return queued
  }

  const persistEmployeeChange = async (update: (data: AppData) => AppData) => {
    try {
      await enqueueWrite(async () => {
        const state = get()
        const next = update(state)
        const data = {
          companySettings: state.companySettings,
          employees: next.employees,
          positions: state.positions,
          shifts: next.shifts,
          availability: next.availability,
        }
        await saveData(data)
        set({
          employees: next.employees,
          shifts: next.shifts,
          availability: next.availability,
          persistenceError: null,
        })
      })
      return true
    } catch (error) {
      set({ persistenceError: error instanceof Error ? error.message : String(error) })
      return false
    }
  }

  return {
    ...initialState,
    hydrated: false,
    loading: true,
    loadError: null,
    persistenceError: null,
    hydrate: async () => {
      set({ loading: true })
      try {
        const data = await loadData()
        set({ ...data, hydrated: true, loading: false, loadError: null })
        await get().persist()
      } catch (error) {
        set({
          loading: false,
          loadError: error instanceof Error ? error.message : String(error),
        })
      }
    },
    setCompanySettings: (companySettings) => {
      set({ companySettings })
      void get().persist()
    },
    updateEmployee: (employee) => persistEmployeeChange((data) => upsertEmployee(data, employee)),
    removeEmployee: (id) => persistEmployeeChange((data) => removeEmployee(data, id)),
    restoreEmployee: (id) => persistEmployeeChange((data) => restoreEmployee(data, id)),
    updatePosition: (position) => {
      set((state) => ({
        positions: state.positions.some((item) => item.id === position.id)
          ? state.positions.map((item) => (item.id === position.id ? position : item))
          : [...state.positions, position],
      }))
      void get().persist()
    },
    deletePosition: (id) => {
      set((state) => ({
        positions: state.positions.filter((position) => position.id !== id),
      }))
      void get().persist()
    },
    upsertShift: (shift) => {
      set((state) => ({
        shifts: state.shifts.some((item) => item.id === shift.id)
          ? state.shifts.map((item) => (item.id === shift.id ? shift : item))
          : [...state.shifts, shift],
      }))
      void get().persist()
    },
    deleteShift: (id) => {
      set((state) => ({
        shifts: state.shifts.filter((shift) => shift.id !== id),
      }))
      void get().persist()
    },
    addAvailability: (entry) => {
      set((state) => ({ availability: [...state.availability, entry] }))
      void get().persist()
    },
    updateAvailability: (entry) => {
      set((state) => ({
        availability: state.availability.some((item) => item.id === entry.id)
          ? state.availability.map((item) => (item.id === entry.id ? entry : item))
          : [...state.availability, entry],
      }))
      void get().persist()
    },
    deleteAvailability: (id) => {
      set((state) => ({ availability: state.availability.filter((entry) => entry.id !== id) }))
      void get().persist()
    },
    persist: async () => {
      try {
        await enqueueWrite(async () => {
          const { companySettings, employees, positions, shifts, availability } = get()
          await saveData({ companySettings, employees, positions, shifts, availability })
        })
        set({ persistenceError: null })
      } catch (error) {
        set({
          persistenceError: error instanceof Error ? error.message : String(error),
        })
      }
    },
  }
})
