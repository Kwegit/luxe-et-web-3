<script setup lang="ts">
import type { User } from "@privy-io/js-sdk-core"
import { computed, ref, watchEffect } from "vue"

type PrivyUserWithIds = Partial<Pick<User, "id">> & {
    userId?: string
    // biome-ignore lint/style/useNamingConvention: external shape from Privy SDK
    user_id?: string
}

const nuxtApp = useNuxtApp()
const router = useRouter()
const $privyUser = nuxtApp.$privyUser ?? ref<User | null>(null)
const $privyReady = nuxtApp.$privyReady ?? ref(false)
const $privyError = nuxtApp.$privyError ?? ref<string | null>(null)
const isAuthenticated = computed(() => !!$privyUser.value)

const checkoutUserId = computed(() => {
    const user = $privyUser.value as PrivyUserWithIds | null
    return user?.id ?? user?.userId ?? user?.user_id ?? "user"
})

const route = useRoute()
const bagId = computed(() => String(route.params.id))

const {
    data: bag,
    pending,
    error,
    refresh,
} = await useFetch(`/api/bags/${bagId.value}`)

const checkoutLoading = ref(false)
const feedback = ref<string | null>(null)

async function startCheckout() {
    if ($privyError.value) {
        feedback.value = "Connexion indisponible. Merci de réessayer."
        return
    }
    if (!$privyReady.value) {
        feedback.value = "Initialisation de votre compte en cours."
        return
    }
    if (!isAuthenticated.value) {
        feedback.value = "Connectez-vous pour finaliser l'achat."
        await router.push("/auth")
        return
    }
    if (!bag.value) return
    checkoutLoading.value = true
    feedback.value = null
    try {
        const { location } = globalThis
        if (!location) throw new Error("Location unavailable")
        const origin = location.origin
        const res = await $fetch("/api/checkout", {
            body: {
                bagId: bag.value.id,
                cancelUrl: `${origin}/bags/${bagId.value}?status=cancel`,
                successUrl: `${origin}/bags/${bagId.value}?status=success`,
                userId: checkoutUserId.value,
            },
            method: "POST",
        })
        if (res?.url) {
            location.href = res.url as string
        } else {
            feedback.value = "Impossible de créer le paiement pour le moment."
        }
    } catch (e) {
        feedback.value = "Paiement indisponible. Merci de réessayer."
    } finally {
        checkoutLoading.value = false
    }
}

watchEffect(() => {
    const status = route.query.status
    if (status === "success")
        feedback.value =
            "Paiement confirmé. Votre certificat est associé à votre achat."
    if (status === "cancel")
        feedback.value = "Paiement annulé. Vous pouvez réessayer à tout moment."
})
</script>

<template>
  <div class="space-y-10">
    <div v-if="pending" class="animate-pulse space-y-6 rounded-3xl bg-white p-6 shadow">
      <div class="h-80 w-full rounded-2xl bg-black/5" />
      <div class="h-6 w-1/3 rounded bg-black/10" />
      <div class="h-4 w-1/2 rounded bg-black/10" />
    </div>

    <div v-else-if="error || !bag" class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      Cette pièce n'est pas disponible ou n'existe pas.
      <button class="ml-2 underline" @click="refresh">Réessayer</button>
    </div>

    <div v-else class="grid gap-10 lg:grid-cols-[1.1fr,0.9fr]">
      <div class="overflow-hidden rounded-3xl bg-white shadow">
        <img
          class="h-full w-full object-cover"
          :src="bag.image ?? 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=1200&auto=format&fit=crop'"
          :alt="bag.name"
        />
      </div>

      <div class="space-y-6">
        <div class="space-y-2">
          <p class="text-xs uppercase tracking-[0.25em] text-black/60">Certificat numérique</p>
          <h1 class="text-3xl font-semibold">{{ bag.name }}</h1>
          <!-- <p class="text-sm uppercase tracking-[0.2em] text-black/60">UID : {{ bag.uid }}</p> -->
        </div>

        <p class="text-base text-black/70">{{ bag.description || 'Certificat sécurisé associé à votre achat.' }}</p>

        <div class="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
          <div>
            <p class="text-xs uppercase tracking-[0.2em] text-black/60">Prix</p>
            <p class="text-2xl font-semibold">€{{ (bag.priceCents / 100).toFixed(0) }}</p>
          </div>
          <button
            class="rounded-full bg-black px-5 py-3 text-white transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="checkoutLoading"
            @click="startCheckout"
          >
            {{ checkoutLoading ? 'Création du paiement...' : isAuthenticated ? 'Procéder au paiement' : 'Se connecter pour payer' }}
          </button>
        </div>

        <p v-if="!isAuthenticated" class="text-sm text-black/60">
          Connexion requise pour passer au paiement.
        </p>

        <div class="grid gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <!-- <div class="flex items-center justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-black/60">Numéro de série</p>
              <p class="font-mono text-sm">{{ bag.uid }}</p>
            </div>
            <span class="rounded-full bg-black px-3 py-1 text-xs text-white">Vérifié</span>
          </div> -->
          <p class="text-sm text-black/70">
            Le certificat est stocké dans votre coffre privé. Vous pourrez le vérifier depuis votre compte et sur votre reçu de paiement.
          </p>
        </div>

        <div v-if="feedback" class="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black/80">
          {{ feedback }}
        </div>
      </div>
    </div>
  </div>
</template>
