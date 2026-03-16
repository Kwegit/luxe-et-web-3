<template>
  <div class="mx-auto max-w-xl space-y-6 rounded-3xl bg-white p-8 shadow-sm">
    <h1 class="text-2xl font-display tracking-tight">Connexion / inscription</h1>
    <p class="text-black/70">Cette page accueillera les flux nuxt-auth-utils et la creation silencieuse du wallet Privy.</p>
    <ul class="list-disc space-y-2 pl-5 text-sm text-black/70">
      <li>Inscription: creation utilisateur SQLite + wallet Privy embedded, stockage walletAddress + privyUserId.</li>
      <li>Connexion: session server-side, tokens conserves cote serveur (SSR safe).</li>
      <li>Actions: accès aux sacs, Checkout Stripe, suivi de commandes.</li>
    </ul>
  </div>
</template>
