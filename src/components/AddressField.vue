<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import type { Address } from '../lib/geoapify'
import { searchAddresses } from '../lib/geoapify'
const props = defineProps<{ text: string; selected: boolean; disabled: boolean; inputId: string }>()
const emit = defineEmits<{ update: [text: string]; select: [address: Address] }>()
const options = ref<Address[]>([])
const searching = ref(false)
const error = ref('')
let controller: AbortController | null = null
let timer: ReturnType<typeof setTimeout>
function change(event: Event) {
  const text = (event.target as HTMLInputElement).value
  emit('update', text)
  clearTimeout(timer); controller?.abort(); controller = null; searching.value = false; options.value = []; error.value = ''
  if (text.trim().length < 3) return
  const key = import.meta.env.VITE_GEOAPIFY_API_KEY?.trim()
  if (!key) { error.value = 'Пошук адрес запрацює після налаштування Geoapify. Поки можна переглянути демоприклад.'; return }
  timer = setTimeout(async () => {
    const current = new AbortController(); controller = current; searching.value = true
    const timeout = setTimeout(() => current.abort(), 15000)
    try {
      const found = await searchAddresses(text, key, current.signal)
      if (!current.signal.aborted) { options.value = found; if (!found.length) error.value = 'Адресу не знайдено. Уточніть місто, вулицю або номер будинку.' }
    } catch {
      if (!current.signal.aborted) error.value = 'Не вдалося знайти адресу. Перевірте з’єднання та налаштування API.'
      else if (controller === current) error.value = 'Пошук тривав задовго. Спробуйте ще раз.'
    } finally { clearTimeout(timeout); if (controller === current) searching.value = false }
  }, 400)
}
function select(address: Address) { options.value = []; error.value = ''; emit('select', address) }
onBeforeUnmount(() => { clearTimeout(timer); controller?.abort() })
</script>
<template>
  <div class="address-field">
    <div class="input-wrap" :class="{ confirmed: selected }">
      <span class="pin" aria-hidden="true">◎</span>
      <input :id="inputId" :value="text" :disabled="disabled" autocomplete="off" placeholder="Місто, вулиця, будинок" :aria-describedby="`${inputId}-hint`" :aria-expanded="options.length > 0" :aria-controls="`${inputId}-options`" @input="change" @keydown.escape="options = []">
      <span v-if="selected" class="check" aria-label="Адресу обрано">✓</span>
    </div>
    <div v-if="options.length" :id="`${inputId}-options`" class="suggestions" aria-label="Знайдені адреси">
      <button v-for="(address, index) in options" :key="index" type="button" @click="select(address)"><span aria-hidden="true">↳</span>{{ address.label }}</button>
    </div>
    <p :id="`${inputId}-hint`" class="field-hint" :class="{ 'error-text': error }" aria-live="polite">{{ searching ? 'Шукаємо адресу…' : error || (selected ? 'Адресу підтверджено' : 'Введіть від 3 символів та оберіть адресу зі списку') }}</p>
  </div>
</template>
