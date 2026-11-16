<script setup lang="ts">
import { onMounted } from 'vue'
import { state } from './store'
import { parseConfig } from './lib/calculator'
onMounted(async () => {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}config.json`, { cache: 'no-store' })
    if (!response.ok) throw new Error('Не вдалося завантажити config.json')
    state.config = parseConfig(await response.json())
  } catch (e) { state.configError = e instanceof Error ? e.message : 'Не вдалося завантажити тарифи' }
})
</script>
<template>
  <header class="site-header">
    <a class="site-title" href="#/kilometers" aria-label="Калькулятор виїзду — головна">Калькулятор виїзду</a>
    <span class="header-divider"></span><span class="header-caption">СЕРВІСНА ПІДТРИМКА</span>
    <span class="header-right"><i></i> Україна <span class="demo-tag">ДЕМО</span></span>
  </header>
  <main v-if="state.config"><RouterView /></main>
  <main v-else class="load-state" role="status"><h1>{{ state.configError ? 'Не вдалося відкрити калькулятор' : 'Завантажуємо тарифи…' }}</h1><p>{{ state.configError || 'Зачекайте, будь ласка.' }}</p><p v-if="state.configError">Перевірте public/config.json та перезавантажте сторінку.</p></main>
  <footer class="site-footer"><span>© {{ new Date().getFullYear() }} Калькулятор сервісного виїзду</span><span>Сервіс, на який можна розраховувати.</span><span>Демонстраційний розрахунок</span></footer>
</template>
