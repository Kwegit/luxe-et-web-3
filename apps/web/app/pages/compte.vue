<script setup lang="ts">
import type { User } from "@privy-io/api-types"
import { computed, ref, watch, watchEffect } from "vue"

const nuxtApp = useNuxtApp()
const router = useRouter()
const $privy = nuxtApp.$privy
const $privyUser = nuxtApp.$privyUser ?? ref<User | null>(null)
const $privyReady = nuxtApp.$privyReady ?? ref(false)

const userEmail = computed(() => {
    // biome-ignore lint/suspicious/noExplicitAny: Privy User email shape varies by SDK version
    const u = $privyUser.value as any
    return u?.email?.address ?? u?.emails?.[0]?.address ?? null
})

const logoutLoading = ref(false)
async function logout() {
    if (!$privy || logoutLoading.value) return
    logoutLoading.value = true
    try {
        await $privy.auth.logout()
        $privyUser.value = null
        router.push("/auth")
    } finally {
        logoutLoading.value = false
    }
}

watchEffect(() => {
    if ($privyReady.value && !$privyUser.value) {
        router.push("/auth")
    }
})

const walletAddress = computed<string>(() => {
    // biome-ignore lint/suspicious/noExplicitAny: Privy linked_accounts shape varies by SDK version
    const accounts = ($privyUser.value as any)?.linked_accounts ?? []
    const embedded = accounts.find(
        // biome-ignore lint/suspicious/noExplicitAny: Privy linked_accounts shape varies by SDK version
        (a: any) =>
            a.type === "wallet" &&
            a.wallet_client_type === "privy" &&
            a.connector_type === "embedded",
    )
    return embedded?.address ?? ""
})

type Certificate = {
    id: string
    bagId: string
    bagName: string
    priceCents: number
    currency: string
    certificateRef: string | null
    certified: boolean
    createdAt: string
}

const {
    data: certificates,
    pending,
    error,
    refresh,
} = await useFetch<Certificate[]>("/api/user/certificates", {
    immediate: false,
    query: { walletAddress },
})

// Privy restores the session asynchronously — trigger the fetch once the wallet address is available
watch(
    walletAddress,
    (addr) => {
        if (addr) refresh()
    },
    { immediate: true },
)

function formatDate(date: string | Date) {
    return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(date))
}
</script>

<template>
  <div class="space-y-10">
    <div class="space-y-2">
      <p class="text-xs uppercase tracking-[0.25em] text-black/60">Espace personnel</p>
      <h1 class="text-3xl font-semibold">Mes certificats</h1>
      <p class="text-black/70">Retrouvez ici toutes vos pièces et leurs preuves d'authenticité.</p>
    </div>

    <!-- connected user bar -->
    <div
      v-if="$privyUser"
      class="flex flex-col gap-3 rounded-2xl border border-black/10 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="truncate text-sm text-black/70">
        <span v-if="userEmail">{{ userEmail }}</span>
        <span v-else class="text-black/40">Compte connecté</span>
      </div>
      <button
        class="shrink-0 rounded-full border border-black px-4 py-2.5 text-sm transition hover:bg-black hover:text-white disabled:opacity-50 sm:py-2"
        :disabled="logoutLoading"
        @click="logout"
      >
        {{ logoutLoading ? "Déconnexion…" : "Se déconnecter" }}
      </button>
    </div>

    <div v-if="!$privyReady" class="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black/80">
      Chargement de votre espace…
    </div>

    <div v-else-if="!$privyUser" class="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black/80">
      Redirection vers la connexion…
    </div>

    <div v-else class="space-y-6">
      <!-- loading skeleton -->
      <div v-if="pending" class="space-y-4">
        <div v-for="n in 3" :key="n" class="animate-pulse rounded-2xl bg-white p-6 shadow">
          <div class="flex items-center justify-between">
            <div class="space-y-2">
              <div class="h-5 w-48 rounded bg-black/10" />
              <div class="h-4 w-32 rounded bg-black/10" />
            </div>
            <div class="h-8 w-24 rounded-full bg-black/10" />
          </div>
        </div>
      </div>

      <div v-else-if="error" class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Impossible de charger vos certificats.
        <button class="ml-2 underline" @click="() => refresh()">Réessayer</button>
      </div>

      <!-- empty state -->
      <div
        v-else-if="!certificates?.length"
        class="rounded-2xl border border-black/10 bg-white px-8 py-14 text-center shadow-sm"
      >
        <p class="text-lg font-semibold">Aucune pièce pour le moment</p>
        <p class="mt-2 text-sm text-black/60">
          Vos certificats d'authenticité apparaîtront ici après votre premier achat.
        </p>
        <NuxtLink
          to="/bags"
          class="mt-6 inline-block rounded-full bg-black px-5 py-3 text-sm text-white transition hover:bg-neutral-900"
        >
          Voir la collection
        </NuxtLink>
      </div>

      <!-- certificate list -->
      <div v-else class="space-y-4">
        <article
          v-for="cert in certificates"
          :key="cert.id"
          class="rounded-2xl bg-white p-5 shadow-sm space-y-4 sm:p-6"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-1">
              <p class="font-semibold">{{ cert.bagName }}</p>
              <p class="text-sm text-black/60">Acquis le {{ formatDate(cert.createdAt) }}</p>
              <p v-if="cert.certificateRef" class="font-mono text-xs text-black/40">
                Réf. {{ cert.certificateRef }}
              </p>
            </div>
            <span
              class="shrink-0 rounded-full px-3 py-1 text-xs font-medium"
              :class="
                cert.certified
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              "
            >
              {{ cert.certified ? "Certifié" : "En cours…" }}
            </span>
          </div>
          <NuxtLink
            :to="`/bags/${cert.bagId}`"
            class="inline-block text-sm underline underline-offset-4 text-black/60 hover:text-black"
          >
            Voir la pièce →
          </NuxtLink>
        </article>
      </div>
    </div>
  </div>
</template>
