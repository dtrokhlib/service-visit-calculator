<script setup lang="ts">
import { computed } from 'vue'
import AddressField from './AddressField.vue'
import { state, newLocation } from '../store'
import type { Location } from '../store'
import type { Model } from '../lib/calculator'
import { calculate, money, number } from '../lib/calculator'
import { getDistances } from '../lib/geoapify'
const props=defineProps<{ model: Model }>()
const config=computed(()=>state.config!)
const ready=computed(()=>state.locations.every(l=>l.machineType && l.address))
const results=computed(()=>state.locations.filter(l=>l.distances))
function edit(l:Location,text:string){l.text=text;l.address=null;l.distances=null;state.error=''}
function rows(l:Location){return l.machineType ? config.value.representations[l.machineType].map(city=>{const km=l.distances?.find(d=>d.cityId===city.id)?.km??null;return {city,km,price:km===null?null:calculate(km,config.value,props.model)}}):[]}
async function run(){
 if(!ready.value || state.loading)return
 const key=import.meta.env.VITE_GEOAPIFY_API_KEY?.trim()
 if(!key){state.error='Пошук маршрутів не налаштований. Зверніться до адміністратора сайту.';return}
 state.loading=true;state.error=''
 try{
  const pending=state.locations.filter(l=>!l.distances)
  const collected: {location:Location; distances:Awaited<ReturnType<typeof getDistances>>[number]}[]=[]
  for(const type of ['HAAS','SWD'] as const){const group=pending.filter(l=>l.machineType===type);if(!group.length)continue;const matrix=await getDistances(config.value.representations[type],group.map(l=>l.address!),key);group.forEach((location,i)=>collected.push({location,distances:matrix[i]}))}
  collected.forEach(x=>x.location.distances=x.distances);state.calculatedAt=new Date().toLocaleString('uk-UA')
 }catch{state.error='Не вдалося розрахувати маршрути. Спробуйте ще раз.'}finally{state.loading=false}
}
function print(){window.print()}
</script>
<template>
<section class="technical-intro no-print"><h1>Вартість виїзду інженера</h1><p>Оберіть тип верстатів і місто, де потрібен сервіс. Нижче побачите вартість виїзду інженера з кожного представництва для обраного типу верстатів.</p></section>
<nav class="model-tabs no-print" aria-label="Модель розрахунку"><RouterLink to="/kilometers">За кілометражем</RouterLink><RouterLink to="/zones">За зонами</RouterLink></nav>
<section v-if="model === 'zones'" class="report-formula no-print"><strong>Три зони за відстанню в один бік</strong><ul><li>До {{ number(config.zones.firstZoneMaxKm) }} км включно — {{ money(config.minimumVisitGrossUah * config.zones.multipliers[0]) }} з ПДВ.</li><li>Понад {{ number(config.zones.firstZoneMaxKm) }} км і до {{ number(config.zones.thirdZoneFromKm) }} км, не включаючи {{ number(config.zones.thirdZoneFromKm) }} — {{ money(config.minimumVisitGrossUah * config.zones.multipliers[1]) }} з ПДВ (×{{ config.zones.multipliers[1] }}).</li><li>{{ number(config.zones.thirdZoneFromKm) }} км і більше — {{ money(config.minimumVisitGrossUah * config.zones.multipliers[2]) }} з ПДВ (×{{ config.zones.multipliers[2] }}).</li></ul><p>Множник застосовується до мінімальної вартості виїзду. Дорога назад уже врахована.</p></section>
<section class="locations-card no-print">
<div v-for="(l,index) in state.locations" :key="l.id" class="location-item">
<div class="location-label"><strong>Локація {{ index+1 }}</strong><button v-if="state.locations.length>1" :disabled="state.loading" @click="state.locations=state.locations.filter(x=>x.id!==l.id)">Видалити</button></div>
<label :for="`type-${l.id}`">1. Тип верстатів</label>
<select :id="`type-${l.id}`" v-model="l.machineType" :disabled="state.loading" @change="l.distances=null;state.error=''" style="margin:8px 0 16px;padding:12px;width:100%;font:inherit"><option disabled value="">Оберіть HAAS або SWD</option><option>HAAS</option><option>SWD</option></select>
<label :for="`city-${l.id}`">2. Місто, де потрібен сервіс</label>
<AddressField :input-id="`city-${l.id}`" :text="l.text" :selected="!!l.address" :disabled="state.loading" @update="edit(l,$event)" @select="l.address=$event;l.text=$event.label;l.distances=null"/>
</div>
<button class="add-button" :disabled="state.loading" @click="state.locations.push(newLocation())">+ Додати локацію</button>
<p v-if="!ready" class="form-help">Для розрахунку оберіть HAAS або SWD та підтвердіть місто зі списку для кожної локації.</p><div class="calculate-actions"><button class="primary-button" :disabled="!ready || state.loading" @click="run">{{ state.loading?'Розрахунок…':'Розрахувати вартість' }}</button></div>
<p v-if="state.error" role="alert" class="alert error">{{ state.error }}</p>
</section>
<p v-if="model === 'kilometers'" class="tariff-explanation">Орієнтовний тариф: {{ number(config.perKmGrossUah) }} грн/км туди й назад, мінімум {{ money(config.minimumVisitGrossUah) }}. ПДВ включено. Робота та проживання оплачуються окремо.</p>
<p class="data-note">Мінімальна вартість: {{ money(config.minimumVisitGrossUah * 5 / 6) }} без ПДВ / {{ money(config.minimumVisitGrossUah) }} з ПДВ.</p>
<section v-if="results.length" class="results"><div class="results-heading"><h2>Вартість виїзду з представництв · {{ model === 'zones' ? 'За зонами' : 'За кілометражем' }}</h2><button class="print-button no-print" :disabled="state.loading" @click="print">Друк / Зберегти PDF</button></div>
<p v-if="model === 'zones'">Тариф із ПДВ: до {{ number(config.zones.firstZoneMaxKm) }} км включно — {{ money(config.minimumVisitGrossUah * config.zones.multipliers[0]) }}; понад {{ number(config.zones.firstZoneMaxKm) }} до {{ number(config.zones.thirdZoneFromKm) }} км (не включно) — {{ money(config.minimumVisitGrossUah * config.zones.multipliers[1]) }}; від {{ number(config.zones.thirdZoneFromKm) }} км — {{ money(config.minimumVisitGrossUah * config.zones.multipliers[2]) }}. Відстань в один бік; робота й проживання окремо.</p><article v-for="l in results" :key="l.id" class="location-report"><h3>{{ l.address?.label }} · {{ l.machineType }}</h3><div class="table-scroll"><table><thead><tr><th scope="col">Представництво</th><th scope="col">Відстань до вашого міста<br><small>в один бік</small></th><th scope="col">Вартість без ПДВ</th><th scope="col">Сума ПДВ 20%</th><th scope="col" class="total-column">До сплати з ПДВ</th></tr></thead><tbody><tr v-for="row in rows(l)" :key="row.city.id"><th scope="row">{{ row.city.name }}</th><template v-if="row.price"><td>{{ number(row.km!) }} км</td><td >{{ money(row.price.net) }}</td><td >{{ money(row.price.vat) }}</td><td class="total-column"><strong>{{ money(row.price.total) }}</strong></td></template><td v-else colspan="4">Маршрут не знайдено</td></tr></tbody></table></div></article><p>За замовчуванням інженер виїжджає з найближчого до замовника міста. Виїзд з інших міст узгоджується окремо.</p></section>
<p class="attribution">Маршрутні дані: <a href="https://www.geoapify.com/">Powered by Geoapify</a> · <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a></p>
</template>
<style scoped>
p{font-size:13px;line-height:1.8}label{display:block;font-size:13px;font-weight:600;margin-bottom:8px}.location-item+.location-item{border-top:1px solid #e0e4da;padding-top:24px;margin-top:24px}.location-label{margin-bottom:20px;font-size:15px}.location-label button{background:none;border:0;color:#a33325;font-size:12px}.form-help{color:#68725e;margin:16px 0 0}.table-scroll{margin-top:16px}table{min-width:740px}th,td{font-size:13px;padding:16px 12px}thead th{font-size:12px}.tariff-explanation{margin-top:22px}.data-note{color:#737c69}.results{margin-top:24px}h3{font-size:16px}.total-column{font-weight:700}@media print{table{min-width:0}th,td{font-size:10px;padding:10px 8px}}
</style>
