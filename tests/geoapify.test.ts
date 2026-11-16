import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDistances, parseMatrix, searchAddresses } from '../src/lib/geoapify'
import { parseConfig } from '../src/lib/calculator'
import raw from '../public/config.json'
const cities = parseConfig(raw).cities.slice(0, 2)
afterEach(() => vi.unstubAllGlobals())
describe('маршрутний адаптер', () => {
  it('переставляє осі з міста → адреси, зберігає нуль і недоступні маршрути', () => {
    expect(parseMatrix({ sources_to_targets: [[{ distance: 0 }, { distance: 150001 }], [null, { distance: null }]] }, cities, 2)).toEqual([
      [{ cityId: 'kyiv', km: 0 }, { cityId: 'lviv', km: null }],
      [{ cityId: 'kyiv', km: 150.001 }, { cityId: 'lviv', km: null }],
    ])
  })
  it('відхиляє неповну відповідь', () => expect(() => parseMatrix({ sources_to_targets: [[]] }, cities, 2)).toThrow())
  it('надсилає координати в порядку longitude, latitude та переводить метри в км', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ sources_to_targets: [[{ distance: 250000 }], [{ distance: 364123 }]] })))
    vi.stubGlobal('fetch', fetch)
    const addresses = [{ label: 'Тестова адреса', coordinates: [28.4, 49.2] as [number, number] }]
    const result = await getDistances(cities, addresses, 'test-key')
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body).toMatchObject({ mode: 'drive', type: 'short', units: 'metric', targets: [{ location: [28.4, 49.2] }] })
    expect(body.sources[0].location).toEqual(cities[0].coordinates)
    expect(result[0][1].km).toBe(364.123)
  })
  it('обробляє ліміти API замість повернення нульової вартості', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 429 })))
    await expect(getDistances(cities, [{ label: 'Адреса', coordinates: [30, 50] }], 'key')).rejects.toThrow('Ліміт')
  })
  it('розбиває велику матрицю, не втрачаючи відповідність міст і адрес', async () => {
    const manyCities = Array.from({ length: 11 }, (_, i) => ({ id: `city-${i}`, name: `City ${i}`, coordinates: [i, 50] as [number, number] }))
    const addresses = Array.from({ length: 12 }, (_, i) => ({ label: `Адреса ${i}`, coordinates: [i, 49] as [number, number] }))
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string)
      return new Response(JSON.stringify({ sources_to_targets: body.sources.map((s: {location: number[]}) => body.targets.map((t: {location: number[]}) => ({ distance: (s.location[0] * 100 + t.location[0]) * 1000 }))) }))
    })
    vi.stubGlobal('fetch', fetch)
    const result = await getDistances(manyCities, addresses, 'key')
    expect(fetch).toHaveBeenCalledTimes(4)
    expect(result).toHaveLength(12)
    expect(result[11]).toHaveLength(11)
    expect(result[11][10]).toEqual({ cityId: 'city-10', km: 1011 })
  })
  it('шукає українські адреси і відкидає результати без координат', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [{ formatted: 'Київ', lon: 30.52, lat: 50.45 }, { formatted: 'Без координат' }] })))
    vi.stubGlobal('fetch', fetch)
    expect(await searchAddresses('Київ', 'key', new AbortController().signal)).toEqual([{ label: 'Київ', coordinates: [30.52, 50.45] }])
    const url = new URL(fetch.mock.calls[0][0])
    expect(url.searchParams.get('filter')).toBe('countrycode:ua')
  })
})
