<script setup lang="ts">
import type { User } from "@privy-io/js-sdk-core"
import { computed, onUnmounted, ref, watchEffect } from "vue"

// POC: media assets for bag-1
import photo1 from "~/assets/bag-1/photo-1.png"
import photo2 from "~/assets/bag-1/photo-2.png"
import photo3 from "~/assets/bag-1/photo-3.png"
import photo4 from "~/assets/bag-1/photo-4.png"
import photo5 from "~/assets/bag-1/photo-5.png"
import photo6 from "~/assets/bag-1/photo-6.png"
import videoSrc from "~/assets/bag-1/video.mp4"

type MediaItem = { type: "video"; src: string } | { type: "photo"; alt: string; src: string }

const mediaItems: MediaItem[] = [
    { type: "video", src: videoSrc },
    { type: "photo", alt: "Photo 1", src: photo1 },
    { type: "photo", alt: "Photo 2", src: photo2 },
    { type: "photo", alt: "Photo 3", src: photo3 },
    { type: "photo", alt: "Photo 4", src: photo4 },
    { type: "photo", alt: "Photo 5", src: photo5 },
    { type: "photo", alt: "Photo 6", src: photo6 },
]
const activeIndex = ref(0)
const activeItem = computed(() => mediaItems[activeIndex.value])
const isVideo = computed(() => activeItem.value.type === "video")

// Auto-advance photos after video ends, unless user has manually selected a photo
const userInteracted = ref(false)
let slideshowTimer: ReturnType<typeof setTimeout> | null = null

function selectMedia(i: number) {
    if (i !== 0) userInteracted.value = true
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
        if (nextPhoto < mediaItems.length) {
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
              :src="(activeItem as { type: 'video'; src: string }).src"
              @ended="onVideoEnded"
            />
            <img
              v-else
              :key="activeIndex"
              class="h-full w-full object-cover"
              :src="(activeItem as { type: 'photo'; alt: string; src: string }).src"
              :alt="(activeItem as { type: 'photo'; alt: string; src: string }).alt"
            />
          </div>
          <!-- Miniatures -->
          <div class="flex gap-2 overflow-x-auto pb-1">
            <button
              v-for="(item, i) in mediaItems"
              :key="i"
              class="shrink-0 w-20 h-14 overflow-hidden rounded-lg transition ring-2"
              :class="activeIndex === i ? 'ring-black' : 'ring-transparent hover:ring-black/30'"
              @click="selectMedia(i)"
            >
              <template v-if="item.type === 'video'">
                <div class="w-full h-full bg-neutral-800 flex items-center justify-center text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </template>
              <img v-else :src="item.src" :alt="item.alt" class="w-full h-full object-cover" />
            </button>
          </div>
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
      </div><!-- end grid -->

    </div><!-- end v-else -->
  </div>
</template>
