export type Model = 'kilometers' | 'zones'
export type Coordinates = [number, number]
export interface City { id: string; name: string; coordinates: Coordinates }
export interface Config {
  version: string; demoCities: boolean; currency: 'UAH'; perKmGrossUah: number;
  minimumVisitGrossUah: number; hourlyGrossUah: number; minimumHours: number;
  zoneWidthKm: number; additionalZoneGrossUah: number; vatRate: number; cities: City[]
}
export const roundMoney = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
export function calculate(distanceKm: number, model: Model, config: Config) {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) throw new Error('Некоректна відстань')
  const zone = Math.max(1, Math.ceil(distanceKm / config.zoneWidthKm))
  const visit = roundMoney(model === 'kilometers'
    ? Math.max(config.minimumVisitGrossUah, distanceKm * 2 * config.perKmGrossUah)
    : config.minimumVisitGrossUah + (zone - 1) * config.additionalZoneGrossUah)
  const work = roundMoney(config.hourlyGrossUah * config.minimumHours)
  const total = roundMoney(visit + work)
  if (!Number.isFinite(total) || total > Number.MAX_SAFE_INTEGER / 100) throw new Error('Завелике значення розрахунку')
  const vat = roundMoney(total * config.vatRate / (1 + config.vatRate))
  return { zone, visit, work, total, vat, net: roundMoney(total - vat) }
}
export function parseConfig(value: unknown): Config {
  const c = value as Config
  if (!c || typeof c.version !== 'string' || typeof c.demoCities !== 'boolean' || c.currency !== 'UAH') throw new Error('Невірний формат config.json')
  for (const key of ['perKmGrossUah', 'minimumVisitGrossUah', 'hourlyGrossUah', 'minimumHours', 'zoneWidthKm', 'additionalZoneGrossUah', 'vatRate'] as const) {
    if (typeof c[key] !== 'number' || !Number.isFinite(c[key]) || c[key] < 0 || c[key] > 1e9) throw new Error(`Некоректне налаштування: ${key}`)
  }
  if (c.zoneWidthKm === 0 || c.vatRate > 1 || c.minimumHours === 0) throw new Error('Перевірте ширину зони, години та ставку ПДВ')
  if (!Array.isArray(c.cities) || c.cities.length === 0 || new Set(c.cities.map(x => x.id)).size !== c.cities.length) throw new Error('Потрібен список міст з унікальними id')
  for (const city of c.cities) {
    if (!city || typeof city.id !== 'string' || !city.id.trim() || typeof city.name !== 'string' || !city.name.trim() || !Array.isArray(city.coordinates) || city.coordinates.length !== 2 || !city.coordinates.every(Number.isFinite) || Math.abs(city.coordinates[0]) > 180 || Math.abs(city.coordinates[1]) > 90) throw new Error('Некоректні дані міста інженера')
  }
  return c
}
export const money = (n: number) => new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', minimumFractionDigits: 2 }).format(n)
export const number = (n: number) => new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 3 }).format(n)
