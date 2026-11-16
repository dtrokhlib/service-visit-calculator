import { describe, it, expect } from 'vitest'
import raw from '../public/config.json'
import { calculate, parseConfig } from '../src/lib/calculator'
const config = parseConfig(raw)
describe('тарифи з включеним ПДВ', () => {
  it.each([0, 100, 200, 10000 / 48])('застосовує мінімальний виїзд на %s км', d => {
    expect(calculate(d, 'kilometers', config)).toMatchObject({ visit: 10000, work: 6678, total: 16678, vat: 2779.67, net: 13898.33 })
  })
  it('оплачує повний подвійний пробіг понад мінімум', () => {
    expect(calculate(250, 'kilometers', config)).toMatchObject({ visit: 12000, total: 18678, vat: 3113, net: 15565 })
    expect(calculate(208.334, 'kilometers', config).visit).toBe(10000.03)
  })
  it.each([[0, 1, 10000], [150, 1, 10000], [150.001, 2, 15000], [150.1, 2, 15000], [300, 2, 15000], [300.1, 3, 20000]])('правильна зона для %s км', (d, zone, visit) => {
    expect(calculate(d, 'zones', config)).toMatchObject({ zone, visit, work: 6678, total: visit + 6678 })
  })
  it('використовує конфігурацію в обох моделях', () => {
    const custom = { ...config, perKmGrossUah: 30, minimumVisitGrossUah: 500, hourlyGrossUah: 100, minimumHours: 2, zoneWidthKm: 100, additionalZoneGrossUah: 750, vatRate: 0.1 }
    expect(calculate(101, 'kilometers', custom).total).toBe(6260)
    expect(calculate(101, 'zones', custom).total).toBe(1450)
    expect(calculate(101, 'zones', custom).vat).toBe(131.82)
  })
  it.each([-1, NaN, Infinity])('відхиляє некоректну відстань %s', d => expect(() => calculate(d, 'zones', config)).toThrow())
  it('суми не зменшуються зі збільшенням відстані, ПДВ не додається вдруге', () => {
    for (const model of ['zones', 'kilometers'] as const) {
      let previous = 0
      for (let d = 0; d <= 1000; d += 0.5) {
        const price = calculate(d, model, config)
        expect(price.total).toBeGreaterThanOrEqual(previous)
        expect(price.net + price.vat).toBeCloseTo(price.total, 2)
        previous = price.total
      }
    }
  })
})
describe('конфігурація', () => {
  it.each([{ zoneWidthKm: 0 }, { minimumVisitGrossUah: -1 }, { vatRate: 20 }, { minimumHours: 0 }, { perKmGrossUah: '24' }, { cities: [] }, { cities: [raw.cities[0], raw.cities[0]] }, { cities: [{ id: 'x', name: 'X', coordinates: [200, 0] }] }])('відхиляє хибні значення %j', override => {
    expect(() => parseConfig({ ...raw, ...override })).toThrow()
  })
})
