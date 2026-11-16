<script setup lang="ts">
import { computed } from 'vue'
import AddressField from './AddressField.vue'
import DemoGuide from './DemoGuide.vue'
import { calculate, money, number } from '../lib/calculator'
import type { Model } from '../lib/calculator'
import { getDistances } from '../lib/geoapify'
import type { Address } from '../lib/geoapify'
import { state, newLocation, invalidate, loadDemo } from '../store'
import type { Location } from '../store'
const props = defineProps<{ model: Model }>()
const config = computed(() => state.config!)
const isKm = computed(() => props.model === 'kilometers')
const ready = computed(() => state.locations.length > 0 && state.locations.every(l => l.address))
const hasResults = computed(() => state.locations.some(l => l.distances))
const successfulCount = computed(() => state.locations.reduce((sum, l) => sum + (l.distances?.filter(d => d.km !== null).length ?? 0), 0))
const vatPercent = computed(() => number(config.value.vatRate * 100))
function update(location: Location, text: string) {
  if (state.demo) { state.demo = false; state.locations.forEach(l => l.distances = null) }
  location.text = text; invalidate(location)
}
function select(location: Location, address: Address) { location.text = address.label; location.address = address; location.distances = null }
function add() { state.locations.push(newLocation()) }
function remove(id: number) { state.locations = state.locations.filter(l => l.id !== id); state.error = '' }
async function run() {
  if (!ready.value || state.loading) return
  const key = import.meta.env.VITE_GEOAPIFY_API_KEY?.trim()
  if (!key) { state.error = 'Для розрахунку реальних маршрутів потрібен ключ Geoapify. Додайте його в .env або відкрийте демоприклад.'; return }
  state.loading = true; state.error = ''
  try {
    const pending = state.demo ? [...state.locations] : state.locations.filter(l => !l.distances)
    if (pending.length) {
      const matrix = await getDistances(config.value.cities, pending.map(l => l.address!), key)
      pending.forEach((location, i) => location.distances = matrix[i])
    }
    state.demo = false; state.calculatedAt = new Date().toLocaleString('uk-UA')
    if (!successfulCount.value) state.error = 'Жодного маршруту не знайдено. Уточніть адреси та спробуйте ще раз.'
  } catch (e) { state.error = e instanceof Error ? e.message : 'Не вдалося розрахувати маршрути. Спробуйте ще раз.' }
  finally { state.loading = false }
}
function rows(location: Location) {
  return config.value.cities.map(city => {
    const km = location.distances?.find(d => d.cityId === city.id)?.km ?? null
    return { city, km, price: km === null ? null : calculate(km, props.model, config.value) }
  })
}
function print() { window.print() }
function scrollToGuide() { document.getElementById('demo-guide')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
</script>
<template>
  <div class="page-top no-print"><span>Сервіс</span><span class="crumb-separator">/</span><span>Калькулятор виїзду</span><span class="version">{{ config.version }}</span></div>
  <section class="intro technical-intro no-print">
    <div><h1>Порівняння варіантів оплати виїзду</h1><p>Мета: вибрати просте єдине правило розрахунку та параметри для перегляду тарифів.<br>Наведені суми й міста — приклад для погодження. Усі тарифи включають ПДВ.</p></div>
  </section>
  <nav class="model-tabs no-print" aria-label="Модель розрахунку">
    <RouterLink to="/kilometers" :aria-current="isKm ? 'page' : undefined"><span class="tab-number">01</span> За кілометражем <span class="tab-arrow">↗</span></RouterLink>
    <RouterLink to="/zones" :aria-current="!isKm ? 'page' : undefined"><span class="tab-number">02</span> За зонами <span class="tab-arrow">↗</span></RouterLink>
    <span class="tabs-hint">Поточна модель застосовується до всіх адрес.</span>
  </nav>
  <section class="demo-overview no-print" aria-labelledby="overview-title">
    <div class="guide-heading"><h2 id="overview-title">Що порівнюємо</h2><a href="#demo-guide" @click.prevent="scrollToGuide">Числові приклади та список міст ↓</a></div>
    <div class="table-scroll" tabindex="0" role="region" aria-label="Відмінності тарифних моделей"><table class="model-summary"><thead><tr><th scope="col">Модель</th><th scope="col">Правило оплати виїзду</th><th scope="col">Поведінка ціни</th><th scope="col">Що змінювати при перегляді тарифу</th></tr></thead><tbody>
      <tr :class="{ 'active-model': isKm }"><th scope="row">1. За кілометражем</th><td>Більше з двох: {{ money(config.minimumVisitGrossUah) }} або км в один бік × 2 × {{ money(config.perKmGrossUah) }}</td><td>Мінімум на коротких маршрутах, далі зростання за кожен км.</td><td>Мінімум виїзду та ставку за км.</td></tr>
      <tr :class="{ 'active-model': !isKm }"><th scope="row">2. За зонами</th><td>{{ money(config.minimumVisitGrossUah) }} до {{ number(config.zoneWidthKm) }} км включно; + {{ money(config.additionalZoneGrossUah) }} за кожну наступну зону.</td><td>Стала ціна всередині зони; стрибок на межі зони.</td><td>Базу виїзду та доплату за зону.</td></tr>
    </tbody></table></div>
    <p><strong>Спільне для обох моделей:</strong> до виїзду додається робота — {{ number(config.minimumHours) }} год × {{ money(config.hourlyGrossUah) }}. ПДВ вже включений. Для кожної адреси показуємо всі міста відправлення; найдешевший варіант автоматично не обираємо.</p>
    <p class="decision-note"><strong>Питання для погодження:</strong> формула однакова для всіх замовників, але відстань залежить від міста виїзду. Для ціни, незалежної від розміщення інженерів, потрібно зафіксувати розрахункові бази та правило їх вибору або визначити територіальні зони.</p>
  </section>
  <div class="demo-strip no-print"><div><strong>Перевірка без введення адрес</strong><span>Завантажує 2 адреси й умовні відстані з {{ config.cities.length }} міст. Після цього перемкніть модель та порівняйте ті самі маршрути.</span></div><button :disabled="state.loading" @click="loadDemo">Завантажити приклад</button></div>
  <div class="workspace no-print">
    <section class="locations-card" aria-labelledby="locations-title">
      <div class="card-heading"><div><span class="section-kicker">КРОК 01</span><h2 id="locations-title">Адреси для розрахунку</h2></div><span class="counter">{{ String(state.locations.length).padStart(2, '0') }}</span></div>
      <p class="card-description">Кожна адреса — окремий виїзд інженера.</p>
      <div class="location-list">
        <div v-for="(location, index) in state.locations" :key="location.id" class="location-item">
          <div class="location-label"><label :for="`address-${location.id}`">Локація {{ String(index + 1).padStart(2, '0') }}</label><button v-if="state.locations.length > 1" class="remove-button" :disabled="state.loading" :aria-label="`Видалити локацію ${index + 1}`" @click="remove(location.id)">Видалити ×</button></div>
          <AddressField :input-id="`address-${location.id}`" :text="location.text" :selected="!!location.address" :disabled="state.loading" @update="update(location, $event)" @select="select(location, $event)" />
        </div>
      </div>
      <button class="add-button" :disabled="state.loading" @click="add"><span>＋</span> Додати ще локацію</button>
      <div class="calculate-actions"><button class="primary-button" :disabled="!ready || state.loading" @click="run">{{ state.loading ? 'Розраховуємо маршрути…' : 'Розрахувати вартість' }} <span aria-hidden="true">↗</span></button><span>З кожного міста інженерів<br>до кожної вашої адреси</span></div>
      <p v-if="state.error" class="alert error" role="alert">{{ state.error }}</p>
    </section>
    <aside class="tariff-card" aria-labelledby="tariff-title">
      <div class="tariff-top"><span class="section-kicker">ПАРАМЕТРИ ПОТОЧНОЇ МОДЕЛІ</span><span class="tariff-symbol" aria-hidden="true">{{ isKm ? '↔' : '▥' }}</span></div>
      <h2 id="tariff-title">{{ isKm ? 'Кілометровий тариф' : 'Зональний тариф' }}</h2>
      <div class="tariff-price">{{ isKm ? number(config.perKmGrossUah) : number(config.minimumVisitGrossUah) }}<span>{{ isKm ? 'грн / км' : 'грн / перша зона' }}</span></div>
      <p class="tariff-note">{{ isKm ? 'Враховуємо дорогу туди й назад.' : `До ${number(config.zoneWidthKm)} км в один бік включно.` }}</p>
      <div class="tariff-details"><div><span>Мінімальний виїзд</span><strong>{{ money(config.minimumVisitGrossUah) }}</strong></div><div v-if="!isKm"><span>Кожна наступна зона</span><strong>+ {{ money(config.additionalZoneGrossUah) }}</strong></div><div><span>Мінімум роботи</span><strong>{{ number(config.minimumHours) }} год × {{ money(config.hourlyGrossUah) }}</strong></div></div>
      <div class="vat-note"><span>✓</span> Усі тарифи включають ПДВ {{ vatPercent }}%</div>
    </aside>
  </div>
  <section class="results" :class="{ 'empty-results': !hasResults }" aria-labelledby="results-title" aria-live="polite" :aria-busy="state.loading">
    <div class="results-heading"><div><span class="section-kicker">{{ hasResults ? 'РЕЗУЛЬТАТИ' : 'РОЗРАХУНОК' }}</span><h2 id="results-title">{{ hasResults ? 'Варіанти сервісного виїзду' : 'Результати розрахунку' }}</h2></div><button v-if="hasResults" class="print-button no-print" :disabled="state.loading || !successfulCount" @click="print"><span aria-hidden="true">↓</span> Друк / Зберегти PDF</button></div>
    <template v-if="hasResults">
      <div class="report-meta"><span>{{ isKm ? 'За кілометражем' : 'За зонами' }} · {{ config.version }}</span><span>{{ state.calculatedAt }}</span></div>
      <p v-if="state.demo" class="alert demo-alert"><strong>Демонстраційний приклад.</strong> Відстані умовні, задані для перевірки інтерфейсу; вони не отримані з маршрутного API.</p>
      <p v-if="config.demoCities" class="data-note">Міста інженерів — демонстраційні. Список потребує підтвердження компанією.</p>
      <div class="report-formula"><strong>Правило розрахунку</strong><p v-if="isKm">Виїзд = більше з двох: {{ money(config.minimumVisitGrossUah) }} або відстань в один бік × 2 × {{ money(config.perKmGrossUah) }}.</p><p v-else>Перша зона до {{ number(config.zoneWidthKm) }} км включно — {{ money(config.minimumVisitGrossUah) }}. Кожна наступна зона {{ number(config.zoneWidthKm) }} км: + {{ money(config.additionalZoneGrossUah) }}. Межа зони включена в попередню зону.</p><p>Робота: {{ number(config.minimumHours) }} год × {{ money(config.hourlyGrossUah) }} = {{ money(config.minimumHours * config.hourlyGrossUah) }}. Разом = виїзд + робота. ПДВ {{ vatPercent }}% уже включено.</p></div>
      <template v-for="(location, index) in state.locations" :key="location.id">
        <article v-if="location.distances" class="location-report">
          <header class="report-location"><span class="location-badge">{{ String(index + 1).padStart(2, '0') }}</span><div><span>АДРЕСА СЕРВІСУ</span><h3>{{ location.address?.label }}</h3></div><span class="options-count">{{ config.cities.length }} варіантів</span></header>
          <div class="table-scroll" tabindex="0" role="region" :aria-label="`Вартості виїзду: ${location.address?.label}`">
            <table><thead><tr><th scope="col">Місто інженера</th><th scope="col">В один бік</th><th scope="col">{{ isKm ? 'Туди й назад' : 'Зона' }}</th><th scope="col">Виїзд<br><small>із ПДВ</small></th><th scope="col">Робота<br><small>{{ number(config.minimumHours) }} год × {{ money(config.hourlyGrossUah) }}</small></th><th scope="col">Без ПДВ</th><th scope="col">ПДВ {{ vatPercent }}%</th><th scope="col" class="total-column">Разом<br><small>із ПДВ</small></th></tr></thead>
              <tbody><tr v-for="row in rows(location)" :key="row.city.id"><th scope="row"><span class="city-dot"></span>{{ row.city.name }}</th><template v-if="row.price && row.km !== null"><td>{{ number(row.km) }} км</td><td>{{ isKm ? `${number(row.km * 2)} км` : `Зона ${row.price.zone}` }}</td><td>{{ money(row.price.visit) }}</td><td>{{ money(row.price.work) }}</td><td>{{ money(row.price.net) }}</td><td>{{ money(row.price.vat) }}</td><td class="total-column"><strong>{{ money(row.price.total) }}</strong></td></template><td v-else colspan="7" class="unavailable">Маршрут не знайдено — вартість не розрахована</td></tr></tbody>
            </table>
          </div>
        </article>
      </template>
      <p class="results-note"><span aria-hidden="true">ⓘ</span> Кожен рядок — альтернативний виїзд. Суми різних міст не додаються. Доступність і дату приїзду інженера уточнюйте окремо.</p>
    </template>
    <div v-else class="empty-state no-print"><span class="empty-route" aria-hidden="true">◎ ┄┄┄ ↗</span><p>Додайте адресу, щоб побачити всі варіанти<br>та зберегти деталізований звіт у PDF.</p><span class="empty-chips"><span>Відстань</span><span>Виїзд</span><span>Робота</span><span>ПДВ</span></span></div>
  </section>
  <DemoGuide :config="config" :model="model" />
  <p class="attribution">Маршрутні дані: <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Powered by Geoapify</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></p>
</template>
