<script setup lang="ts">
import { ref } from "vue"

const step = ref<"email" | "otp">("email")
const email = ref("")
const otp = ref("")
const loading = ref(false)
const message = ref<string | null>(null)

async function submitEmail(event: Event) {
    event.preventDefault()
    loading.value = true
    message.value = null
    setTimeout(() => {
        loading.value = false
        step.value = "otp"
        message.value = "Un code à 6 chiffres a été envoyé à votre email."
    }, 500)
}

async function submitOtp(event: Event) {
    event.preventDefault()
    loading.value = true
    message.value = null
    setTimeout(() => {
        loading.value = false
        message.value = "Coffre privé créé. Vous pouvez finaliser vos achats."
    }, 500)
}
</script>

<template>
  <div class="mx-auto max-w-xl space-y-6 rounded-3xl bg-white p-8 shadow-sm">
    <div class="space-y-2">
      <p class="text-xs uppercase tracking-[0.25em] text-black/60">Accès sécurisé</p>
      <h1 class="text-2xl font-semibold">Connexion / inscription</h1>
      <p class="text-black/70">Créez votre espace en quelques secondes. Un coffre privé est généré automatiquement pour conserver vos certificats.</p>
    </div>

    <form v-if="step === 'email'" class="flex gap-2 flex-col" @submit="submitEmail">
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
        type="submit"
        class="w-full rounded-full bg-black px-5 py-3 text-white transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="loading"
      >
        {{ loading ? 'Envoi...' : "Recevoir le code" }}
      </button>
    </form>

    <form v-else class="flex gap-2 flex-col" @submit="submitOtp">
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
      <button
        type="submit"
        class="w-full rounded-full bg-black px-5 py-3 text-white transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="loading"
      >
        {{ loading ? 'Vérification...' : 'Valider et continuer' }}
      </button>
      <button type="button" class="text-xs underline" @click="step = 'email'">Modifier l'email</button>
    </form>

    <p v-if="message" class="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black/80">{{ message }}</p>
  </div>
</template>
