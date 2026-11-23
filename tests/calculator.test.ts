import { expect, it } from 'vitest'
import raw from '../public/config.json'
import { calculate, parseConfig } from '../src/lib/calculator'
const config=parseConfig(raw)
it.each([[0,9600,8000],[100,9600,8000],[200,9600,8000],[200.001,9606,8005],[300,14400,12000]])('вартість на %s км', (km,total,net)=>{expect(calculate(km,config)).toEqual({total,net,vat:total-net})})
it('цілі суми і округлення вгору',()=>{for(let m=199900;m<210000;m++){const p=calculate(m/1000,config);expect(Number.isInteger(p.net)).toBe(true);expect(p.net+p.vat).toBe(p.total);expect(p.total).toBeGreaterThanOrEqual(Math.max(9600,m*48/1000));expect(p.total-Math.max(9600,m*48/1000)).toBeLessThan(6.000001)}})
it.each([-1,NaN,Infinity])('відхиляє %s',km=>expect(()=>calculate(km,config)).toThrow())
it('списки представництв',()=>{expect(config.representations.HAAS).toHaveLength(8);expect(config.representations.SWD.map(c=>c.name)).toEqual(['Київ','Дніпро','Харків'])})
it('відхиляє некоректні параметри',()=>{expect(()=>parseConfig({...raw,vatRate:0.1})).toThrow();expect(()=>parseConfig({...raw,perKmGrossUah:-1})).toThrow();expect(()=>parseConfig({...raw,representations:{HAAS:[],SWD:[]}})).toThrow()})
