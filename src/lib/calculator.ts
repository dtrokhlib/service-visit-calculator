export type Coordinates = [number, number]
export type Model = 'kilometers' | 'zones'
export type MachineType = 'HAAS' | 'SWD'
export interface City { id: string; name: string; coordinates: Coordinates }
export interface Config { version: string; currency: 'UAH'; perKmGrossUah: number; minimumVisitGrossUah: number; vatRate: number; zones: { firstZoneMaxKm: number; thirdZoneFromKm: number; multipliers: [number, number, number] }; representations: Record<MachineType, City[]> }
export function calculate(km: number, config: Config, model: Model = 'kilometers') {
  if (!Number.isFinite(km) || km < 0) throw new Error('Некоректна відстань')
  const meters = BigInt(Math.round(km * 1000))
  const rate = BigInt(Math.round(config.perKmGrossUah * 100))
  const minimum = BigInt(Math.round(config.minimumVisitGrossUah * 100)) * 1000n
  const route = meters * 2n * rate
  const zone = meters <= BigInt(Math.round(config.zones.firstZoneMaxKm * 1000)) ? 0 : meters < BigInt(Math.round(config.zones.thirdZoneFromKm * 1000)) ? 1 : 2
  const raw = model === 'zones' ? minimum * BigInt(config.zones.multipliers[zone]) : route > minimum ? route : minimum
  const units = (raw + 600000n - 1n) / 600000n
  const total = Number(units * 6n)
  if (!Number.isSafeInteger(total)) throw new Error('Завелика сума')
  return { total, net: Number(units * 5n), vat: Number(units) }
}
export function parseConfig(value: unknown): Config {
  const c = value as Config
  if (!c || c.currency !== 'UAH' || typeof c.version !== 'string' || c.vatRate !== 0.2) throw new Error('Некоректна конфігурація або ПДВ')
  for (const n of [c.perKmGrossUah,c.minimumVisitGrossUah]) if (!Number.isFinite(n) || n < 0 || n > 1e9 || Math.abs(n * 100 - Math.round(n * 100)) > 0.00001) throw new Error('Некоректний тариф')
  if (!c.zones || !Number.isFinite(c.zones.firstZoneMaxKm) || c.zones.firstZoneMaxKm <= 0 || !Number.isFinite(c.zones.thirdZoneFromKm) || c.zones.thirdZoneFromKm <= c.zones.firstZoneMaxKm || !Array.isArray(c.zones.multipliers) || c.zones.multipliers.length !== 3 || c.zones.multipliers.some((n,i,a)=>!Number.isSafeInteger(n) || n < 1 || (i > 0 && n < a[i-1]))) throw new Error('Некоректні зони')
  for (const type of ['HAAS','SWD'] as const) {
    const cities=c.representations?.[type]
    if (!Array.isArray(cities) || !cities.length || new Set(cities.map(x=>x.id)).size !== cities.length) throw new Error('Некоректний список представництв')
    for(const city of cities) if(!city.id || !city.name || !Array.isArray(city.coordinates) || city.coordinates.length!==2 || !city.coordinates.every(Number.isFinite) || Math.abs(city.coordinates[0])>180 || Math.abs(city.coordinates[1])>90) throw new Error('Некоректні координати')
  }
  return c
}
export const money = (n: number) => new Intl.NumberFormat('uk-UA',{style:'currency',currency:'UAH',maximumFractionDigits:0}).format(n)
export const number = (n: number) => new Intl.NumberFormat('uk-UA',{maximumFractionDigits:3}).format(n)
