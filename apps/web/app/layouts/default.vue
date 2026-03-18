<script setup lang="ts">
const menuOpen = ref(false)
const route = useRoute()
watch(
    () => route.path,
    () => {
        menuOpen.value = false
    },
)
</script>

<template>
  <div class="flex min-h-screen flex-col bg-[#f9f9f7] text-black">
    <header class="sticky top-0 z-20 border-b border-black/10 bg-white/80 backdrop-blur">
      <nav class="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <!-- Logo -->
        <NuxtLink class="flex items-center gap-2.5" to="/">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white font-semibold">
            W
          </div>
          <p class="text-base font-semibold tracking-tight">Maison William</p>
        </NuxtLink>

        <!-- Desktop nav -->
        <div class="hidden sm:flex items-center gap-1 text-sm font-medium uppercase tracking-[0.18em]">
          <NuxtLink class="rounded-full px-3 py-2 transition hover:bg-black hover:text-white" to="/">Découvrir</NuxtLink>
          <NuxtLink class="rounded-full px-3 py-2 transition hover:bg-black hover:text-white" to="/bags">Collection</NuxtLink>
          <NuxtLink class="rounded-full px-3 py-2 transition hover:bg-black hover:text-white" to="/verifier">Authentifier</NuxtLink>
          <NuxtLink class="rounded-full border border-black px-3 py-2 transition hover:bg-black hover:text-white" to="/compte">Mon compte</NuxtLink>
        </div>

        <!-- Mobile hamburger -->
        <button
          class="relative flex h-9 w-9 shrink-0 flex-col items-center justify-center gap-1.5 sm:hidden"
          aria-label="Ouvrir le menu"
          @click="menuOpen = !menuOpen"
        >
          <span
            class="block h-px w-5 bg-black transition-all duration-200 origin-center"
            :class="menuOpen ? 'translate-y-[7px] rotate-45' : ''"
          />
          <span
            class="block h-px w-5 bg-black transition-all duration-200"
            :class="menuOpen ? 'opacity-0 scale-x-0' : ''"
          />
          <span
            class="block h-px w-5 bg-black transition-all duration-200 origin-center"
            :class="menuOpen ? '-translate-y-[7px] -rotate-45' : ''"
          />
        </button>
      </nav>

      <!-- Mobile menu -->
      <div
        v-show="menuOpen"
        class="sm:hidden border-t border-black/10 bg-white/95 backdrop-blur"
      >
        <div class="mx-auto flex max-w-6xl flex-col px-4 py-3">
          <NuxtLink
            class="rounded-xl px-4 py-3.5 text-sm font-medium uppercase tracking-[0.18em] transition hover:bg-black/5 active:bg-black/10"
            to="/"
          >Découvrir</NuxtLink>
          <NuxtLink
            class="rounded-xl px-4 py-3.5 text-sm font-medium uppercase tracking-[0.18em] transition hover:bg-black/5 active:bg-black/10"
            to="/bags"
          >Collection</NuxtLink>
          <NuxtLink
            class="rounded-xl px-4 py-3.5 text-sm font-medium uppercase tracking-[0.18em] transition hover:bg-black/5 active:bg-black/10"
            to="/verifier"
          >Authentifier</NuxtLink>
          <NuxtLink
            class="mt-1 rounded-xl border border-black/20 px-4 py-3.5 text-sm font-medium uppercase tracking-[0.18em] transition hover:bg-black/5 active:bg-black/10"
            to="/compte"
          >Mon compte</NuxtLink>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
      <slot />
    </main>

    <footer class="border-t border-black/10 bg-white/80 px-4 py-6 text-center text-xs text-black/50 sm:text-sm">
      Certificat numérique associé à chaque pièce · Paiement Stripe · Coffre privé créé lors de l'inscription
    </footer>
  </div>
</template>
