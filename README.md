# Luxe Auth Marketplace

Marketplace de sacs de luxe avec certification on-chain invisible pour l'utilisateur final. Stack : Nuxt 4 + Tailwind, bun, nuxt-auth-utils, Prisma/SQLite, Stripe Checkout, Privy embedded wallet, Pinata pour les metadonnees, contrats testes/deployes via Remix (Sepolia).

## Demarrage rapide
1) Copier l'exemple d'env : `cp .env.example .env` puis remplir les cles (Stripe, Privy, Pinata, signer Sepolia, contract address).
2) Installer les dependances : `cd apps/web && bun install`.
3) Preparer la base : `bun run db:push` puis `bun run db:seed` (toujours depuis `apps/web`).
4) Lancer le dev server : `bun run dev` (ou `docker compose up --build`).

Dev server : http://localhost:3000

## Docker
```
docker compose up --build
```
- Service `web` (bun) expose le port 3000.
- Les donnees SQLite sont persistees dans le repo (fichier `apps/web/prisma/dev.db`).

## Envs (resume)
- `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `PRIVY_APP_ID`, `PRIVY_EMBEDDED_WALLET_SECRET`
- `PINATA_API_KEY`, `PINATA_SECRET_API_KEY`
- `DATABASE_URL` (par defaut `file:./apps/web/prisma/dev.db`)
- `SEPOLIA_SIGNER_KEY`, `NUXT_PUBLIC_CHAIN_ID` (11155111), `NUXT_PUBLIC_CONTRACT_ADDRESS`

## Prisma
- Schema : `apps/web/prisma/schema.prisma`
- Scripts : `bun run db:push`, `bun run db:migrate`, `bun run db:seed`, `bun run db:studio`
- Seed : cree un user demo + un sac et une commande en attente.

## Stripe
- Endpoint Checkout : `POST /api/checkout` (bagId, userId, successUrl, cancelUrl)
- Webhook : `POST /api/webhooks/stripe` (env `STRIPE_WEBHOOK_SECRET` requis). Apres paiement, l'ordre passe a `PAID` et alimente la file de mint (a implementer).

## Auth & wallet (nuxt-auth-utils + Privy)
- Authentification geree par nuxt-auth-utils (configuration a completer) avec stockage SQLite via Prisma.
- Creation automatique de wallet via Privy embedded wallet lors de l'inscription; l'adresse est stockee en base (`walletAddress`, `privyUserId`).

## Contrats (Remix)
- Dossier : `contracts/` pour stocker ABI et adresses deployees depuis Remix sur Sepolia.
- Apres deploiement, renseigner `NUXT_PUBLIC_CONTRACT_ADDRESS` et deposer l'ABI dans `contracts/abi/` pour usage serveur.

# luxe-et-web-3