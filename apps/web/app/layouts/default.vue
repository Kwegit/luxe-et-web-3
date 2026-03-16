<template>
  <div class="flex min-h-screen flex-col">
    <header class="border-b border-black/10 bg-white/80 backdrop-blur">
      <nav class="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sand font-display text-xl">L</div>
          <div>
            <p class="text-lg font-display tracking-tight">Luxe Auth</p>
            <p class="text-sm text-black/60">Marche des sacs verifies</p>
          </div>
        </div>
        <div class="flex items-center gap-3 text-sm">
          <NuxtLink class="rounded-full bg-ink px-4 py-2 text-sand transition hover:bg-black" to="/">Decouvrir</NuxtLink>
          <NuxtLink class="rounded-full border border-ink px-4 py-2 text-ink transition hover:bg-ink hover:text-sand" to="/auth">Mon compte</NuxtLink>
        </div>
      </nav>
    </header>

    <main class="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <slot />
    </main>

    <footer class="border-t border-black/10 bg-white/80 py-6 text-center text-sm text-black/60">
      Authentification invisible via blockchain (Sepolia) · Paiements Stripe · Portefeuilles Privy embedded
    </footer>
  </div>
</template>
