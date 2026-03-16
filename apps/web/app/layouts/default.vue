<template>
  <div class="flex min-h-screen flex-col bg-[#f9f9f7] text-black">
    <header class="sticky top-0 z-20 border-b border-black/10 bg-white/80 backdrop-blur">
      <nav class="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white text-lg font-semibold">
            W
          </div>
          <div>
            <p class="text-lg font-semibold tracking-tight">Maison William</p>
            <!-- <p class="text-xs uppercase tracking-[0.25em] text-black/60">Certificat numérique</p> -->
          </div>
        </div>
        <div class="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em]">
          <NuxtLink class="rounded-full px-4 py-2 transition hover:bg-black hover:text-white" to="/">Découvrir</NuxtLink>
          <NuxtLink class="rounded-full px-4 py-2 transition hover:bg-black hover:text-white" to="/bags">Collection</NuxtLink>
          <NuxtLink class="rounded-full border border-black px-4 py-2 transition hover:bg-black hover:text-white" to="/auth">Mon compte</NuxtLink>
        </div>
      </nav>
    </header>

    <main class="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <slot />
    </main>

    <footer class="border-t border-black/10 bg-white/80 py-6 text-center text-sm text-black/60">
      Certificat numérique associé à chaque pièce · Paiement Stripe · Coffre privé créé lors de l'inscription
    </footer>
  </div>
</template>
