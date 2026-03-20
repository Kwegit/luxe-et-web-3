<script setup lang="ts">
import { computed } from "vue"
import photoNoirSellier from "~/assets/noir-sellier/photo-1.png"
import photoCognac from "~/assets/bag-1/photo-1.png"

const { data: bags, pending } = await useFetch("/api/bags")

const bagImageMap: Record<string, string> = {
  "bag-demo": photoNoirSellier,
  "bag-cognac": photoCognac,
}

function getBagImage(bagId: string): string {
  return bagImageMap[bagId] ?? photoNoirSellier
}

const featured = computed(() => (bags.value ?? []).slice(0, 3))
</script>

<template>
  <div class="space-y-16">
    <section class="grid items-center gap-10 lg:grid-cols-2">
      <div class="space-y-6">
        <p class="inline-flex rounded-full bg-black px-3 py-1 text-xs uppercase tracking-[0.25em] text-white">Maison William</p>
        <h1 class="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">Des pièces d'exception, livrées avec leur preuve d'authenticité.</h1>
        <p class="max-w-2xl text-lg text-black/70">
          Chaque sac est sélectionné avec soin. À l'achat, une preuve d'authenticité est automatiquement associée à votre compte.
        </p>
        <div class="flex flex-wrap gap-3">
          <NuxtLink to="/bags" class="rounded-full bg-black px-5 py-3 text-white transition hover:bg-neutral-900">Voir la collection</NuxtLink>
          <NuxtLink to="/auth" class="rounded-full border border-black px-5 py-3 text-black transition hover:bg-black hover:text-white">Créer mon espace</NuxtLink>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
          <div class="rounded-2xl bg-white p-4 shadow-sm">
            <p class="font-semibold">Authenticité garantie</p>
            <p class="text-black/60">Vérifiable depuis votre compte.</p>
          </div>
          <div class="rounded-2xl bg-white p-4 shadow-sm">
            <p class="font-semibold">Paiement sécurisé</p>
            <p class="text-black/60">Rapide et sans friction.</p>
          </div>
          <div class="rounded-2xl bg-white p-4 shadow-sm">
            <p class="font-semibold">Espace personnel</p>
            <p class="text-black/60">Créé automatiquement à l'inscription.</p>
          </div>
        </div>
      </div>

      <div class="relative overflow-hidden rounded-3xl bg-white shadow-lg">
        <div class="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/80" aria-hidden="true" />
        <img class="h-full w-full object-cover" :src="photoNoirSellier" alt="Le Noir Sellier" />
        <div class="absolute inset-0 flex flex-col justify-between p-6 text-white">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/70">Maison William</p>
            <p class="text-2xl font-semibold">Collection exclusive</p>
          </div>
          <div class="grid gap-3">
            <div class="rounded-2xl bg-white/10 p-4">
              <p class="text-xs uppercase tracking-[0.2em] text-white/80">Authenticité</p>
              <p class="text-sm">Garantie à vie</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.25em] text-black/60">Collection</p>
          <h2 class="text-2xl font-semibold">Sélection du moment</h2>
        </div>
        <NuxtLink to="/bags" class="text-sm font-semibold underline underline-offset-4">Voir tout</NuxtLink>
      </div>

      <div v-if="pending" class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        <div v-for="n in 3" :key="n" class="animate-pulse rounded-2xl bg-white p-6 shadow">
          <div class="mb-4 h-64 w-full rounded-xl bg-black/5" />
          <div class="h-4 w-2/3 rounded bg-black/10" />
          <div class="mt-2 h-4 w-1/3 rounded bg-black/10" />
        </div>
      </div>

      <div v-else class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        <article v-for="bag in featured" :key="bag.id" class="space-y-3">
          <NuxtLink :to="`/bags/${bag.id}`" class="block overflow-hidden rounded-2xl bg-white shadow transition hover:-translate-y-1">
            <img class="h-72 w-full object-cover" :src="getBagImage(bag.id)" :alt="bag.name" />
          </NuxtLink>
          <div class="flex items-start justify-between">
            <div>
              <NuxtLink :to="`/bags/${bag.id}`" class="text-lg font-semibold">{{ bag.name }}</NuxtLink>
              <!-- <p class="text-xs uppercase tracking-[0.2em] text-black/50">Certificat : {{ bag.uid }}</p> -->
            </div>
            <span class="text-lg font-semibold">€{{ (bag.priceCents / 100).toFixed(0) }}</span>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
