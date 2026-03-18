<script setup lang="ts">
type VerificationResult = {
    authentic: boolean
    bagName?: string
    certifiedAt?: string
    certificateRef?: string
}

type PageState = "idle" | "scanning" | "loading" | "result" | "error"

const state = ref<PageState>("idle")
const result = ref<VerificationResult | null>(null)
const errorMessage = ref("")
const manualUid = ref("")
const nfcSupported = ref(false)

// Détection précise de l'environnement NFC au montage
const isIos = ref(false)
const isAndroid = ref(false)

onMounted(() => {
    nfcSupported.value = "NDEFReader" in globalThis
    const ua = navigator.userAgent
    isIos.value = /iPad|iPhone|iPod/.test(ua)
    isAndroid.value = /Android/.test(ua)
})

// Affiche le bloc NFC seulement là où il peut fonctionner (Android)
// ou là où NDEFReader est déjà disponible (Android Chrome HTTPS).
const showNfcButton = computed(() => nfcSupported.value || isAndroid.value)
// Sur iOS, on affiche un message d'info à la place (pas de scan possible via navigateur)
const showIosHint = computed(() => isIos.value && !nfcSupported.value)

async function verify(uid: string) {
    state.value = "loading"
    result.value = null
    try {
        const data = await $fetch<VerificationResult>(
            `/api/verify/${encodeURIComponent(uid)}`,
        )
        result.value = data
        state.value = "result"
    } catch {
        errorMessage.value = "Une erreur est survenue. Veuillez réessayer."
        state.value = "error"
    }
}

async function startNfcScan() {
    if (!nfcSupported.value) {
        errorMessage.value =
            "Le scan NFC nécessite une connexion sécurisée. Ouvrez cette page en HTTPS, ou saisissez la référence manuellement."
        state.value = "error"
        return
    }
    state.value = "scanning"
    try {
        // @ts-expect-error Web NFC API not yet in TS lib
        // biome-ignore lint/nursery/useGlobalThis: NDEFReader uniquement disponible via window dans le contexte navigateur
        const reader = new window.NDEFReader()
        await reader.scan()
        reader.addEventListener(
            "reading",
            ({
                message,
                serialNumber,
            }: {
                message: {
                    records: { recordType: string; data: ArrayBuffer }[]
                }
                serialNumber: string
            }) => {
                let uid = serialNumber
                for (const record of message.records) {
                    if (record.recordType === "text") {
                        uid = new TextDecoder().decode(record.data)
                        break
                    }
                }
                verify(uid)
            },
        )
        reader.addEventListener("readingerror", () => {
            errorMessage.value =
                "Impossible de lire la puce. Veuillez réessayer."
            state.value = "error"
        })
    } catch (err: unknown) {
        const name = err instanceof Error ? err.name : ""
        errorMessage.value =
            name === "NotAllowedError"
                ? "L'accès à la puce a été refusé. Vérifiez les permissions de votre navigateur."
                : "La lecture NFC n'est pas disponible. Utilisez Chrome sur Android ou saisissez la référence manuellement."
        state.value = "error"
    }
}

function submitManual() {
    const uid = manualUid.value.trim()
    if (uid) verify(uid)
}

function reset() {
    state.value = "idle"
    result.value = null
    errorMessage.value = ""
    manualUid.value = ""
}

const certifiedDate = computed(() => {
    if (!result.value?.certifiedAt) return null
    return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(result.value.certifiedAt))
})
</script>

<template>
  <div class="space-y-8 sm:space-y-10">

    <!-- Page header -->
    <div class="space-y-2">
      <p class="text-xs uppercase tracking-[0.25em] text-black/60">Maison William</p>
      <h1 class="text-2xl font-semibold sm:text-3xl">Authentifier une pièce</h1>
      <p class="text-sm text-black/70 sm:text-base">Vérifiez qu'une pièce a bien été acquise auprès de Maison William.</p>
    </div>

    <!-- LOADING skeleton -->
    <div v-if="state === 'loading'" class="space-y-4">
      <div class="animate-pulse rounded-2xl bg-white p-6 shadow">
        <div class="space-y-3">
          <div class="h-4 w-24 rounded bg-black/10" />
          <div class="h-6 w-56 rounded bg-black/10" />
          <div class="h-4 w-40 rounded bg-black/10" />
        </div>
      </div>
    </div>

    <!-- SCANNING state -->
    <div v-else-if="state === 'scanning'" class="rounded-2xl bg-white px-6 py-12 shadow-sm text-center space-y-6 sm:p-10">
      <div class="flex justify-center">
        <div class="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-black">
          <span class="absolute inset-0 animate-ping rounded-full border-2 border-black/20" />
          <!-- NFC wave icon -->
          <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 3.75A4.5 4.5 0 0 1 12 2.25a4.5 4.5 0 0 1 4.5 4.5v.75M3.75 8.25A4.5 4.5 0 0 0 2.25 12a4.5 4.5 0 0 0 4.5 4.5h.75M8.25 20.25A4.5 4.5 0 0 0 12 21.75a4.5 4.5 0 0 0 4.5-4.5v-.75M20.25 15.75A4.5 4.5 0 0 0 21.75 12a4.5 4.5 0 0 0-4.5-4.5h-.75" />
            <circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" />
          </svg>
        </div>
      </div>
      <div class="space-y-1">
        <p class="font-semibold">Approchez la puce de votre téléphone</p>
        <p class="text-sm text-black/60">Maintenez la puce contre l'arrière de l'appareil</p>
      </div>
      <button class="text-sm text-black/40 underline underline-offset-4 hover:text-black" @click="reset">Annuler</button>
    </div>

    <!-- IDLE -->
    <div v-else-if="state === 'idle'" class="space-y-5">

      <!-- NFC card — Android uniquement (seule plateforme compatible) -->
      <div v-if="showNfcButton" class="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <div class="flex flex-col items-center gap-5 text-center sm:gap-6">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-black/5">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-black/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 3.75A4.5 4.5 0 0 1 12 2.25a4.5 4.5 0 0 1 4.5 4.5v.75M3.75 8.25A4.5 4.5 0 0 0 2.25 12a4.5 4.5 0 0 0 4.5 4.5h.75M8.25 20.25A4.5 4.5 0 0 0 12 21.75a4.5 4.5 0 0 0 4.5-4.5v-.75M20.25 15.75A4.5 4.5 0 0 0 21.75 12a4.5 4.5 0 0 0-4.5-4.5h-.75" />
              <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <div class="space-y-1">
            <p class="text-xs uppercase tracking-[0.2em] text-black/40">Puce intégrée</p>
            <p class="font-semibold">Scanner la pièce</p>
            <p class="text-sm text-black/60">Approchez votre téléphone de la puce pour une vérification instantanée.</p>
          </div>
          <button
            class="w-full rounded-full bg-black py-3.5 text-sm font-medium text-white transition hover:bg-neutral-900 active:scale-[0.98] sm:w-auto sm:px-8"
            @click="startNfcScan"
          >
            Scanner
          </button>
        </div>
      </div>

      <!-- Hint iOS — pas de scan possible via navigateur sur iOS -->
      <div v-if="showIosHint" class="flex items-start gap-3 rounded-2xl border border-black/10 bg-white p-5">
        <svg xmlns="http://www.w3.org/2000/svg" class="mt-0.5 h-4 w-4 shrink-0 text-black/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p class="text-sm text-black/60">
          Sur iPhone, le scan de puce n'est pas disponible depuis le navigateur. Saisissez la référence manuellement ci-dessous.
        </p>
      </div>

      <!-- Divider -->
      <div class="flex items-center gap-4">
        <div class="h-px flex-1 bg-black/10" />
        <span class="text-xs uppercase tracking-widest text-black/30">{{ (showNfcButton || showIosHint) ? 'ou' : 'Vérification manuelle' }}</span>
        <div class="h-px flex-1 bg-black/10" />
      </div>

      <!-- Manual input card -->
      <div class="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <div class="space-y-4 sm:space-y-5">
          <div class="space-y-1">
            <p class="text-xs uppercase tracking-[0.2em] text-black/40">Référence de la pièce</p>
            <p class="font-semibold">Saisie manuelle</p>
            <p class="text-sm text-black/60">Retrouvez la référence sur l'étiquette intérieure ou dans votre espace personnel.</p>
          </div>
          <form class="flex flex-col gap-3 sm:flex-row" @submit.prevent="submitManual">
            <input
              v-model="manualUid"
              type="text"
              placeholder="ex : bag-demo-uid"
              class="flex-1 rounded-2xl border border-black/15 bg-[#f9f9f7] px-4 py-3.5 text-sm outline-none placeholder:text-black/30 focus:border-black"
            />
            <button
              type="submit"
              :disabled="!manualUid.trim()"
              class="w-full rounded-full bg-black py-3.5 text-sm font-medium text-white transition hover:bg-neutral-900 active:scale-[0.98] disabled:opacity-30 sm:w-auto sm:px-6"
            >
              Vérifier
            </button>
          </form>
        </div>
      </div>

    </div>

    <!-- RESULT -->
    <div v-else-if="state === 'result' && result" class="space-y-5">

      <!-- Authentic + certified -->
      <article v-if="result.authentic && result.certifiedAt" class="rounded-2xl bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="space-y-1">
            <p class="text-xs uppercase tracking-[0.2em] text-black/40">Pièce identifiée</p>
            <p class="text-xl font-semibold">{{ result.bagName }}</p>
            <p class="text-sm text-black/60">Certifiée le {{ certifiedDate }}</p>
            <p v-if="result.certificateRef" class="font-mono text-xs text-black/40">
              Réf. {{ result.certificateRef }}
            </p>
          </div>
          <span class="self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            Authentique
          </span>
        </div>
      </article>

      <!-- Authentic but no certificate yet -->
      <article v-else-if="result.authentic" class="rounded-2xl bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="space-y-1">
            <p class="text-xs uppercase tracking-[0.2em] text-black/40">Pièce identifiée</p>
            <p class="text-xl font-semibold">{{ result.bagName }}</p>
            <p class="text-sm text-black/60">Cette pièce est enregistrée. Son certificat sera disponible dès la finalisation de l'achat.</p>
          </div>
          <span class="self-start rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            En cours…
          </span>
        </div>
      </article>

      <!-- Not authentic -->
      <div v-else class="rounded-2xl border border-black/10 bg-white px-6 py-12 text-center shadow-sm space-y-3">
        <p class="text-lg font-semibold">Pièce non reconnue</p>
        <p class="mx-auto max-w-sm text-sm text-black/60">
          Cette pièce ne figure pas dans notre registre. Elle n'a pas été acquise auprès de Maison William, ou la référence est incorrecte.
        </p>
      </div>

      <button class="text-sm text-black/40 underline underline-offset-4 hover:text-black" @click="reset">
        Vérifier une autre pièce
      </button>
    </div>

    <!-- ERROR -->
    <div v-else-if="state === 'error'" class="space-y-5">
      <div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
        {{ errorMessage }}
      </div>
      <button
        class="rounded-full border border-black px-6 py-3 text-sm transition hover:bg-black hover:text-white"
        @click="reset"
      >
        Réessayer
      </button>
    </div>

  </div>
</template>
