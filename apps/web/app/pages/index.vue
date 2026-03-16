<template>
  <section class="grid gap-10 lg:grid-cols-[1.1fr,0.9fr]">
    <div class="space-y-6">
      <p class="inline-flex rounded-full bg-ink text-sand px-3 py-1 text-xs uppercase tracking-[0.2em]">Edition verifiee</p>
      <h1 class="text-4xl sm:text-5xl font-display leading-tight tracking-tight">Marketplace de sacs de luxe avec certification on-chain invisible.</h1>
      <p class="max-w-2xl text-lg text-black/70">
        Chaque sac est lie a un UID minte sur Sepolia, les metadonnees detaillees sont stockees via Pinata/IPFS, et le portefeuille client est cree automatiquement via Privy embedded wallet lors de l'inscription.
      </p>
      <div class="flex flex-wrap gap-3">
        <NuxtLink to="/bags" class="rounded-full bg-ink px-5 py-3 text-sand font-medium transition hover:bg-black">Parcourir la collection</NuxtLink>
        <NuxtLink to="/auth" class="rounded-full border border-ink px-5 py-3 text-ink font-medium transition hover:bg-ink hover:text-sand">Creer mon compte</NuxtLink>
      </div>
      <div class="grid grid-cols-3 gap-4 text-sm">
        <div class="rounded-2xl bg-white p-4 shadow-sm">
          <p class="font-semibold">Authenticite</p>
          <p class="text-black/60">UID on-chain, verifie a chaque transaction.</p>
        </div>
        <div class="rounded-2xl bg-white p-4 shadow-sm">
          <p class="font-semibold">Paiements Stripe</p>
          <p class="text-black/60">Checkout one-shot, cartes test pretes.</p>
        </div>
        <div class="rounded-2xl bg-white p-4 shadow-sm">
          <p class="font-semibold">Wallet invisible</p>
          <p class="text-black/60">Privy cree le wallet des l'inscription.</p>
        </div>
      </div>
    </div>

    <div class="relative overflow-hidden rounded-3xl bg-white shadow-lg">
      <div class="absolute inset-0 bg-gradient-to-br from-ink/80 via-ink to-black opacity-70" aria-hidden="true" />
      <img class="h-full w-full object-cover" src="https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=1200&auto=format&fit=crop" alt="Sac de luxe" />
      <div class="absolute inset-0 flex flex-col justify-between p-6 text-sand">
        <div>
          <p class="text-xs uppercase tracking-[0.3em]">Badge on-chain</p>
          <p class="text-2xl font-display">UID certifie</p>
        </div>
        <div class="grid gap-3">
          <div class="rounded-2xl bg-white/10 p-4">
            <p class="text-xs uppercase tracking-[0.2em] text-sand/80">Contrat Sepolia</p>
            <p class="font-mono text-sm">CONTRACT_ADDRESS -> runtimeConfig.public</p>
          </div>
          <div class="rounded-2xl bg-white/10 p-4">
            <p class="text-xs uppercase tracking-[0.2em] text-sand/80">UID</p>
            <p class="font-mono text-sm">bag-uid-xxxxx</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
