<script setup lang="ts">
import { computed, ref } from "vue"
import photoNoirSellier from "~/assets/noir-sellier/photo-1.png"
import photoCognac from "~/assets/bag-1/photo-1.png"

const bagImageMap: Record<string, string> = {
  "bag-demo": photoNoirSellier,
  "bag-cognac": photoCognac,
}

function getBagImage(bagId: string): string {
  return bagImageMap[bagId] ?? photoNoirSellier
}

const search = ref("")
const { data: bags, pending, error } = await useFetch("/api/bags")

const filtered = computed(() => {
    const term = search.value.trim().toLowerCase()
    const items = bags.value ?? []
    if (!term) return items
    return items.filter((bag) =>
        [bag.name, bag.description, bag.uid]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(term)),
    )
})
</script>

<template>
  <div class="space-y-10">
    <div class="space-y-3">
      <p class="text-xs uppercase tracking-[0.25em] text-black/60">Collection</p>
      <h1 class="text-3xl font-semibold">Sacs disponibles</h1>
      <p class="text-black/70">Chaque pièce possède un certificat numérique vérifiable.</p>
    </div>

    <div class="flex flex-wrap items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-sm">
      <input
        v-model="search"
        type="search"
        placeholder="Rechercher un sac ou un numéro de certificat"
        class="w-full flex-1 bg-transparent text-sm outline-none placeholder:text-black/40"
      />
      <span class="text-xs uppercase tracking-[0.2em] text-black/50">{{ filtered.length }} pièces</span>
    </div>

    <div v-if="error" class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      Impossible de charger la collection. Merci de réessayer.
    </div>

    <div v-if="pending" class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
      <div v-for="n in 6" :key="n" class="animate-pulse rounded-2xl bg-white p-6 shadow">
        <div class="mb-4 h-64 w-full rounded-xl bg-black/5" />
        <div class="h-4 w-2/3 rounded bg-black/10" />
        <div class="mt-2 h-4 w-1/3 rounded bg-black/10" />
      </div>
    </div>

    <div v-else class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
      <article v-for="bag in filtered" :key="bag.id" class="space-y-3">
        <NuxtLink :to="`/bags/${bag.id}`" class="block overflow-hidden rounded-2xl bg-white shadow transition hover:-translate-y-1">
          <img
            class="h-72 w-full object-cover"
            :src="getBagImage(bag.id)"
            :alt="bag.name"
          />
        </NuxtLink>
        <div class="flex items-start justify-between">
          <div>
            <NuxtLink :to="`/bags/${bag.id}`" class="text-lg font-semibold">{{ bag.name }}</NuxtLink>
            <!-- <p class="text-xs uppercase tracking-[0.2em] text-black/50">Certificat : {{ bag.uid }}</p> -->
          </div>
          <span class="text-lg font-semibold">€{{ (bag.priceCents / 100).toFixed(0) }}</span>
        </div>
        <p class="text-sm text-black/70 line-clamp-2">{{ bag.description || 'Certificat numérique inclus.' }}</p>
      </article>
    </div>
  </div>
</template>
