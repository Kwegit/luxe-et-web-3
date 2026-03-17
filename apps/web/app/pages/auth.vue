<script setup lang="ts">
import type { User } from "@privy-io/js-sdk-core"
import { computed, ref, watchEffect } from "vue"

type LinkedAccount = {
    type?: string
    address?: string
}

type UserWithAccounts = User & {
    // biome-ignore lint/style/useNamingConvention: external shape from Privy SDK
    linked_accounts?: LinkedAccount[]
    linkedAccounts?: LinkedAccount[]
}

const toMessage = (err: unknown, fallback: string) => {
    if (err instanceof Error) return err.message
    if (typeof err === "string") return err
    return fallback
}

const nuxtApp = useNuxtApp()
// guard: plugin may fail if env missing; fallback to local refs to avoid runtime crash
const $privy = nuxtApp.$privy
const $privyUser = nuxtApp.$privyUser ?? ref<User | null>(null)
const $privyReady = nuxtApp.$privyReady ?? ref(false)
const $privyError =
    nuxtApp.$privyError ??
    ref<string | null>("Privy non initialisé (appId manquant)")

const step = ref<"email" | "otp" | "done">("email")
const email = ref("")
const otp = ref("")
const loading = ref(false)
const message = ref<string | null>(null)
const error = ref<string | null>(null)

const hasPrivyError = computed(() => !!$privyError.value)
const isAuthenticated = computed(() => !!$privyUser.value)
const userEmail = computed(
    () =>
        $privyUser.value?.email?.address ??
        $privyUser.value?.emails?.[0]?.address ??
        null,
)
const walletAddress = computed(() => {
    const user = $privyUser.value as UserWithAccounts | null
    const wallets =
        user?.linked_accounts ?? user?.linkedAccounts ?? ([] as LinkedAccount[])
    const embedded = wallets.find((wallet) => wallet.type === "embedded_wallet")
    return embedded?.address ?? null
})

watchEffect(() => {
    if ($privyUser.value) {
        step.value = "done"
    }
})

async function sendEmailCode() {
    if (hasPrivyError.value || !$privy) {
        error.value = $privyError.value ?? "Privy non initialisé."
        return
    }
    if (loading.value || !$privyReady.value) return
    loading.value = true
    error.value = null
    message.value = null
    try {
        await $privy.auth.email.sendCode(email.value)
        message.value = "Un code à 6 chiffres a été envoyé à votre email."
        step.value = "otp"
    } catch (err: unknown) {
        error.value = toMessage(err, "Impossible d'envoyer le code.")
    } finally {
        loading.value = false
    }
}

async function verifyEmailCode() {
    if (hasPrivyError.value || !$privy) {
        error.value = $privyError.value ?? "Privy non initialisé."
        return
    }
    if (loading.value || !$privyReady.value) return
    loading.value = true
    error.value = null
    message.value = null
    try {
        const loggedIn = await $privy.auth.email.loginWithCode(
            email.value,
            otp.value,
            "login-or-sign-up",
            {
                embedded: {
                    ethereum: { createOnLogin: "users-without-wallets" },
                },
            },
        )
        const user = await $privy.user.get()
        $privyUser.value = user.user ?? loggedIn?.user ?? null
        message.value =
            "Espace sécurisé activé. Vous pouvez poursuivre vos achats."
        step.value = "done"
    } catch (err: unknown) {
        const msg = toMessage(err, "Code incorrect ou expiré.")
        if (
            msg.toLowerCase().includes("embedded wallet proxy not initialized")
        ) {
            error.value =
                "Initialisation en cours, veuillez réessayer dans quelques secondes."
        } else {
            error.value = msg
        }
    } finally {
        loading.value = false
    }
}

async function logout() {
    if (hasPrivyError.value || !$privy) {
        error.value = $privyError.value ?? "Privy non initialisé."
        return
    }
    if (loading.value) return
    loading.value = true
    error.value = null
    message.value = null
    try {
        await $privy.auth.logout()
        $privyUser.value = null
        step.value = "email"
        message.value = "Vous avez été déconnecté."
    } catch (err: unknown) {
        error.value = toMessage(err, "Impossible de vous déconnecter.")
    } finally {
        loading.value = false
    }
}

// Debug helpers to surface env resolution client-side
const runtimePrivyAppId = computed(() => useRuntimeConfig().public?.privyAppId)
const importMetaPrivyAppId = computed(() => {
    const env = import.meta.env as Record<string, string | undefined>
    return env.NUXT_PUBLIC_PRIVY_APP_ID ?? env.PRIVY_APP_ID
})
const processEnvPrivyAppId = computed(
    () => process.env.NUXT_PUBLIC_PRIVY_APP_ID ?? process.env.PRIVY_APP_ID,
)
</script>

<template>
  <div class="mx-auto max-w-xl space-y-6 rounded-3xl bg-white p-8 shadow-sm">
    <div class="space-y-2">
      <p class="text-xs uppercase tracking-[0.25em] text-black/60">Accès sécurisé</p>
      <h1 class="text-2xl font-semibold">Connexion / inscription</h1>
      <p class="text-black/70">Créez votre espace en quelques secondes. Un coffre privé est généré automatiquement pour conserver vos certificats.</p>
    </div>

    <div v-if="!$privyReady && !$privyError" class="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black/80">
      Initialisation de Privy...
    </div>

    <p v-if="$privyError" class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ $privyError }}</p>

    <div v-else class="space-y-4">
      <div v-if="step === 'email'" class="space-y-3">
        <p class="text-sm text-black/70">Authentifiez-vous via email. Privy gère l'envoi du code et crée votre portefeuille intégré automatiquement.</p>
        <label class="space-y-2 text-sm font-medium text-black/80">
          Email
          <input
            v-model="email"
            type="email"
            required
            placeholder="vous@example.com"
            class="w-full rounded-full border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black"
          />
        </label>
        <button
          type="button"
          class="w-full rounded-full bg-black px-5 py-3 text-white transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="loading"
          @click="sendEmailCode"
        >
          {{ loading ? 'Envoi...' : "Recevoir le code" }}
        </button>
      </div>

      <div v-else-if="step === 'otp'" class="space-y-3">
        <p class="text-sm text-black/70">Saisissez le code reçu. La création du coffre intégré se fait à l'étape suivante.</p>
        <label class="space-y-2 text-sm font-medium text-black/80">
          Code reçu par email
          <input
            v-model="otp"
            type="text"
            required
            inputmode="numeric"
            pattern="[0-9]{6}"
            placeholder="123456"
            class="w-full rounded-full border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black"
          />
        </label>
        <div class="flex gap-3">
          <button
            type="button"
            class="w-full rounded-full bg-black px-5 py-3 text-white transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
            @click="verifyEmailCode"
          >
            {{ loading ? 'Vérification...' : 'Valider et créer le coffre' }}
          </button>
          <button type="button" class="rounded-full border border-black px-4 py-3 text-sm" :disabled="loading" @click="step = 'email'">Modifier l'email</button>
        </div>
      </div>

      <div v-else class="space-y-3">
        <div class="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black/80">
          <p class="font-semibold">Compte connecté</p>
          <p v-if="userEmail">Email : {{ userEmail }}</p>
          <p class="text-black/70">Votre coffre sécurisé est prêt pour vos certificats.</p>
        </div>
        <div class="flex gap-3">
          <button
            type="button"
            class="w-full rounded-full bg-black px-5 py-3 text-white transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
            @click="step = 'email'"
          >
            Relancer une connexion
          </button>
          <button
            type="button"
            class="w-full rounded-full border border-black px-5 py-3 text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
            @click="logout"
          >
            Se déconnecter
          </button>
        </div>
      </div>

      <p v-if="message" class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{{ message }}</p>
      <p v-if="error" class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ error }}</p>
    </div>
  </div>
</template>
