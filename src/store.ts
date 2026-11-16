import { reactive } from 'vue'
import type { Config } from './lib/calculator'
import type { Address, Distance } from './lib/geoapify'
export interface Location { id: number; text: string; address: Address | null; distances: Distance[] | null }
let nextId = 1
export const newLocation = (): Location => ({ id: nextId++, text: '', address: null, distances: null })
export const state = reactive({ config: null as Config | null, configError: '', locations: [newLocation()], loading: false, error: '', demo: false, calculatedAt: '' })
export function invalidate(location: Location) { location.address = null; location.distances = null; state.error = '' }
export function loadDemo() {
  state.demo = true
  state.error = ''
  state.calculatedAt = new Date().toLocaleString('uk-UA')
  const fixtures = [
    { label: 'Вінниця, вул. Київська, 1', coordinates: [28.482, 49.244] as [number, number], distances: { kyiv: 268, lviv: 364, kharkiv: 732, dnipro: 574, odesa: 429 } },
    { label: 'Полтава, вул. Європейська, 1', coordinates: [34.551, 49.589] as [number, number], distances: { kyiv: 343, lviv: 882, kharkiv: 144, dnipro: 196, odesa: 584 } },
  ]
  state.locations = fixtures.map(f => ({ ...newLocation(), text: f.label, address: { label: f.label, coordinates: f.coordinates }, distances: state.config!.cities.map(c => ({ cityId: c.id, km: (f.distances as Record<string, number>)[c.id] ?? null })) }))
}
