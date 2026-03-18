<script setup lang="ts">
import type { User } from "@privy-io/api-types"
import { computed, onUnmounted, ref, watchEffect } from "vue"
import { useRoute } from "vue-router"

// POC: media assets for bag-1
import photo1 from "~/assets/bag-1/photo-1.png"
import photo2 from "~/assets/bag-1/photo-2.png"
import photo3 from "~/assets/bag-1/photo-3.png"
import photo4 from "~/assets/bag-1/photo-4.png"
import photo5 from "~/assets/bag-1/photo-5.png"
import photo6 from "~/assets/bag-1/photo-6.png"
import videoSrc from "~/assets/bag-1/video.mp4"

type MediaItem =
    | { type: "video"; src: string }
    | { type: "photo"; alt: string; src: string }

const mediaByBagId: Record<string, MediaItem[]> = {
    "bag-cognac": [
        { src: videoSrc, type: "video" },
        { alt: "Photo 1", src: photo1, type: "photo" },
        { alt: "Photo 2", src: photo2, type: "photo" },
        { alt: "Photo 3", src: photo3, type: "photo" },
        { alt: "Photo 4", src: photo4, type: "photo" },
        { alt: "Photo 5", src: photo5, type: "photo" },
        { alt: "Photo 6", src: photo6, type: "photo" },
    ],
    "bag-demo": [
        { src: videoSrc, type: "video" },
        { alt: "Photo 1", src: photo1, type: "photo" },
        { alt: "Photo 2", src: photo2, type: "photo" },
        { alt: "Photo 3", src: photo3, type: "photo" },
        { alt: "Photo 4", src: photo4, type: "photo" },
        { alt: "Photo 5", src: photo5, type: "photo" },
        { alt: "Photo 6", src: photo6, type: "photo" },
    ],
}

const route = useRoute()
const bagId = computed(() => String(route.params.id ?? "bag-demo"))

const mediaItems = computed<MediaItem[]>(() => {
    return mediaByBagId[bagId.value] ?? mediaByBagId["bag-demo"] ?? []
})

const activeIndex = ref(0)
const activeItem = computed(() => mediaItems.value[activeIndex.value])
const isVideo = computed(() => activeItem.value?.type === "video")

// Declared before watchEffect to avoid temporal dead zone
const userInteracted = ref(false)
let slideshowTimer: ReturnType<typeof setTimeout> | null = null

// Reset slideshow state when the bag changes
watchEffect(() => {
    // Access bagId to track dependency
    void bagId.value
    activeIndex.value = 0
    userInteracted.value = false
    clearAutoAdvance()
})

function selectMedia(i: number) {
    userInteracted.value = true
    activeIndex.value = i
    clearAutoAdvance()
}

function onVideoEnded() {
    if (userInteracted.value) return
    startAutoAdvance(1)
}

function startAutoAdvance(fromIndex: number) {
    clearAutoAdvance()
    activeIndex.value = fromIndex
    slideshowTimer = setTimeout(function advance() {
        if (userInteracted.value) return
        const nextPhoto = activeIndex.value + 1
        if (nextPhoto < mediaItems.value.length) {
            activeIndex.value = nextPhoto
            slideshowTimer = setTimeout(advance, 3000)
        }
    }, 3000)
}

function clearAutoAdvance() {
    if (slideshowTimer) {
        clearTimeout(slideshowTimer)
        slideshowTimer = null
    }
}

onUnmounted(clearAutoAdvance)

type PrivyUserWithIds = Partial<Pick<User, "id">> & {
    userId?: string
    // biome-ignore lint/style/useNamingConvention: external shape from Privy SDK
    user_id?: string
    wallet?: { address?: string }
    wallets?: { address?: string }[]
    account?: { address?: string }
    accounts?: { address?: string }[]
    walletAddress?: string
    // biome-ignore lint/style/useNamingConvention: external shape from Privy SDK
    linked_accounts?: { type?: string; address?: string }[]
    linkedAccounts?: { type?: string; address?: string }[]
}

function isEvmAddress(value: string | null | undefined): value is string {
    return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value)
}

function resolveBuyerWallet(user: PrivyUserWithIds | null): string {
    if (!user) return ""

    const directCandidates = [
        user.wallet?.address,
        user.walletAddress,
        user.account?.address,
        user.wallets?.[0]?.address,
        user.accounts?.[0]?.address,
    ]
    for (const candidate of directCandidates) {
        if (isEvmAddress(candidate)) return candidate
    }

    const wallets = user?.linked_accounts ?? user?.linkedAccounts ?? []
    const preferred = wallets.find(
        (wallet) => wallet?.type === "embedded_wallet",
    )
    if (isEvmAddress(preferred?.address)) return preferred.address

    const firstValid = wallets.find((wallet) => isEvmAddress(wallet?.address))
    return firstValid?.address ?? ""
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
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

const checkoutBuyerWallet = computed(() => {
    const user = $privyUser.value as PrivyUserWithIds | null
    return resolveBuyerWallet(user)
})

async function waitForPrivyWallet(maxAttempts = 20, delayMs = 750) {
    const privy = nuxtApp.$privy

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const currentUser = $privyUser.value as PrivyUserWithIds | null
        const resolved = resolveBuyerWallet(currentUser)
        if (isEvmAddress(resolved)) return resolved

        if (privy?.user?.get) {
            try {
                const refreshed = await privy.user.get()
                $privyUser.value = refreshed?.user ?? null
                const refreshedWallet = resolveBuyerWallet(
                    ($privyUser.value as PrivyUserWithIds | null) ?? null,
                )
                if (isEvmAddress(refreshedWallet)) return refreshedWallet
            } catch (error) {
                console.warn(
                    "[checkout-ui] unable to refresh Privy user",
                    error,
                )
            }
        }

        if (attempt < maxAttempts - 1) {
            await sleep(delayMs)
        }
    }

    return ""
}

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
    feedback.value = "Initialisation du wallet Privy..."
    const buyerWallet = await waitForPrivyWallet()
    if (!isEvmAddress(buyerWallet)) {
        feedback.value =
            "Votre wallet Privy n'est pas prêt. Déconnectez-vous/reconnectez-vous puis réessayez."
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
                buyerWallet,
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
            "Merci pour votre achat. Votre pièce et sa preuve d'authenticité sont désormais disponibles dans votre compte."
    if (status === "cancel")
        feedback.value = "Paiement annulé. Vous pouvez réessayer à tout moment."
})
</script>

<template>
  <div class="space-y-10">
    <div
      v-if="pending"
      class="animate-pulse space-y-6 rounded-3xl bg-white p-6 shadow"
    >
      <div class="h-80 w-full rounded-2xl bg-black/5" />
      <div class="h-6 w-1/3 rounded bg-black/10" />
      <div class="h-4 w-1/2 rounded bg-black/10" />
    </div>

    <div
      v-else-if="error || !bag"
      class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      Cette pièce n'est pas disponible ou n'existe pas.
      <button class="ml-2 underline" @click="() => refresh()">Réessayer</button>
    </div>

    <div v-else class="space-y-10">
      <!-- Galerie + infos -->
      <div class="grid gap-10 lg:grid-cols-[1.1fr,0.9fr]">
        <!-- Galerie media (vidéo en premier, comme Steam) -->
        <div class="space-y-3">
          <!-- Viewer principal -->
          <div class="overflow-hidden rounded-3xl bg-black shadow aspect-[4/3]">
            <video
              v-if="isVideo"
              :key="'video'"
              class="h-full w-full object-contain"
              controls
              autoplay
              muted
              playsinline
              preload="metadata"
              :src="(activeItem as { type: 'video'; src: string }).src"
              @ended="onVideoEnded"
            />
            <img
              v-else
              :key="activeIndex"
              class="h-full w-full object-cover"
              :src="
                (activeItem as { type: 'photo'; alt: string; src: string }).src
              "
              :alt="
                (activeItem as { type: 'photo'; alt: string; src: string }).alt
              "
            />
          </div>
          <!-- Miniatures -->
          <div class="flex gap-2 overflow-x-auto pb-1">
            <button
              v-for="(item, i) in mediaItems"
              :key="i"
              class="shrink-0 w-20 h-14 overflow-hidden rounded-lg transition ring-2"
              :class="
                activeIndex === i
                  ? 'ring-black'
                  : 'ring-transparent hover:ring-black/30'
              "
              :aria-label="item.type === 'video' ? 'Lire la vidéo' : item.alt"
              @click="selectMedia(i)"
            >
              <template v-if="item.type === 'video'">
                <div
                  class="w-full h-full bg-neutral-800 flex items-center justify-center text-white"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-6 h-6"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </template>
              <img
                v-else
                :src="item.src"
                :alt="item.alt"
                class="w-full h-full object-cover"
                :loading="activeIndex === i ? 'eager' : 'lazy'"
                :decoding="activeIndex === i ? 'sync' : 'async'"
              />
            </button>
          </div>
        </div>

        <div class="space-y-6">
        <div class="space-y-2">
          <p class="text-xs uppercase tracking-[0.25em] text-black/60">Maison William</p>
          <h1 class="text-3xl font-semibold">{{ bag.name }}</h1>
        </div>

        <p class="text-base text-black/70">{{ bag.description || 'Pièce artisanale de la maison William.' }}</p>

          <div class="rounded-2xl bg-white p-4 shadow-sm space-y-4">
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-black/60">Prix</p>
              <p class="text-2xl font-semibold">€{{ (bag.priceCents / 100).toFixed(0) }}</p>
            </div>
            <button
              class="w-full rounded-full bg-black py-3.5 text-sm font-medium text-white transition hover:bg-neutral-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
              :disabled="checkoutLoading"
              @click="startCheckout"
            >
              {{
                checkoutLoading
                  ? "Création du paiement..."
                  : isAuthenticated
                    ? "Procéder au paiement"
                    : "Se connecter pour payer"
              }}
            </button>
          </div>

          <p v-if="!isAuthenticated" class="text-sm text-black/60">
            Connexion requise pour passer au paiement.
          </p>

        <div class="grid gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <p class="text-sm text-black/70">
            À l'achat, une preuve d'authenticité est automatiquement associée à votre compte, consultable à tout moment.
          </p>
        </div>

          <div
            v-if="feedback"
            class="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black/80"
          >
            {{ feedback }}
          </div>
        </div>
      </div>
      <!-- end grid -->
    </div>
    <!-- end v-else -->
  </div>
</template>
