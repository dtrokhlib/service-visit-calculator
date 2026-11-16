import type { City, Coordinates } from './calculator'
export interface Address { label: string; coordinates: Coordinates }
export interface Distance { cityId: string; km: number | null }
async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, signal: init?.signal ?? AbortSignal.timeout(30000) })
  if (!response.ok) {
    if (response.status === 429) throw new Error('Ліміт запитів вичерпано. Спробуйте пізніше.')
    if (response.status === 401 || response.status === 403) throw new Error('Перевірте API-ключ та дозволені домени Geoapify.')
    throw new Error('Маршрутний сервіс тимчасово недоступний. Спробуйте ще раз.')
  }
  return response.json()
}
export async function searchAddresses(text: string, key: string, signal: AbortSignal): Promise<Address[]> {
  const params = new URLSearchParams({ text, apiKey: key, lang: 'uk', filter: 'countrycode:ua', limit: '5', format: 'json' })
  const data = await request(`https://api.geoapify.com/v1/geocode/autocomplete?${params}`, { signal })
  if (!Array.isArray(data.results)) throw new Error('Некоректна відповідь сервісу адрес.')
  return data.results.filter((r: Record<string, unknown>) => typeof r.formatted === 'string' && Number.isFinite(r.lon) && Number.isFinite(r.lat))
    .map((r: { formatted: string; lon: number; lat: number }) => ({ label: r.formatted, coordinates: [r.lon, r.lat] }))
}
export function parseMatrix(data: unknown, cities: City[], targetCount: number): Distance[][] {
  const matrix = (data as { sources_to_targets?: unknown[][] })?.sources_to_targets
  if (!Array.isArray(matrix) || matrix.length !== cities.length || matrix.some(row => !Array.isArray(row) || row.length !== targetCount)) throw new Error('Неповна відповідь маршрутного сервісу. Спробуйте ще раз.')
  return Array.from({ length: targetCount }, (_, target) => cities.map((city, source) => {
    const cell = matrix[source][target] as { distance?: unknown } | null
    const meters = cell?.distance
    return { cityId: city.id, km: typeof meters === 'number' && Number.isFinite(meters) && meters >= 0 ? meters / 1000 : null }
  }))
}
export async function getDistances(cities: City[], addresses: Address[], key: string): Promise<Distance[][]> {
  // Stay below the provider's matrix limits; chunk both axes for larger local configs.
  const results: Distance[][] = addresses.map(() => [])
  for (let s = 0; s < cities.length; s += 10) {
    const sources = cities.slice(s, s + 10)
    for (let t = 0; t < addresses.length; t += 10) {
      const targets = addresses.slice(t, t + 10)
      const data = await request(`https://api.geoapify.com/v1/routematrix?apiKey=${encodeURIComponent(key)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'drive', type: 'short', units: 'metric', sources: sources.map(c => ({ location: c.coordinates })), targets: targets.map(a => ({ location: a.coordinates })) }),
      })
      const block = parseMatrix(data, sources, targets.length)
      block.forEach((row, index) => results[t + index].push(...row))
    }
  }
  return results
}
