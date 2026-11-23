import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import CalculatorPage from './components/CalculatorPage.vue'
import './style.css'
const router = createRouter({ history: createWebHashHistory(), routes: [
  { path: '/', redirect: '/kilometers' },
  { path: '/kilometers', component: CalculatorPage, props: { model: 'kilometers' } },
  { path: '/zones', component: CalculatorPage, props: { model: 'zones' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
] })
createApp(App).use(router).mount('#app')
