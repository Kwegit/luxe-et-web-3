# Luxe Auth Marketplace

Marketplace de sacs de luxe avec certification invisible pour l'utilisateur final. À chaque achat, un certificat d'authenticité est créé sur IPFS (Pinata) et optionnellement enregistré sur la blockchain Sepolia. L'acheteur retrouve ses certificats dans son espace personnel.

Stack : Nuxt 4 + Tailwind, Bun, Privy embedded wallet, Stripe Checkout, Pinata IPFS, contrat ERC721 déployé sur Sepolia via Hardhat.

## Démarrage rapide

1. Copier l'exemple d'env : `cp .env.example .env` puis remplir les clés.
2. Installer les dépendances : `cd apps/web && bun install`.
3. Lancer le dev server : `bun run dev` (ou `docker compose up --build`).

Dev server : http://localhost:3000

## Docker

```
docker compose up --build
# Avec écoute Stripe CLI (webhooks en local) :
docker compose --profile stripe up
```

- Service `web` (Bun/Nuxt) expose le port 3000.
- Service `hardhat` expose le nœud local sur le port 8545.
- Les données sont en mémoire (perdues au redémarrage du container `web`).

## Variables d'environnement

| Variable | Description |
|---|---|
| `STRIPE_PUBLISHABLE_KEY` | Clé publique Stripe |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secret du webhook Stripe |
| `PRIVY_APP_ID` | App ID Privy |
| `NUXT_PUBLIC_PRIVY_APP_ID` | App ID Privy (côté client) |
| `PRIVY_EMBEDDED_WALLET_SECRET` | Secret wallet embarqué Privy |
| `PINATA_API_KEY` | Clé API Pinata (v1) |
| `PINATA_SECRET_API_KEY` | Secret API Pinata (v1) |
| `SEPOLIA_SIGNER_KEY` | Clé privée du signer on-chain |
| `NUXT_PUBLIC_CHAIN_ID` | `11155111` (Sepolia) |
| `NUXT_PUBLIC_CONTRACT_ADDRESS` | Adresse du contrat ERC721 déployé |

## Flux d'achat

1. L'utilisateur s'authentifie via Privy (wallet embarqué créé automatiquement).
2. Il sélectionne un sac → `POST /api/checkout` crée une session Stripe.
3. Après paiement, le webhook Stripe (`POST /api/webhooks/stripe`) :
   - Épingle les métadonnées sur **Pinata IPFS** (certificat permanent).
   - Si `NUXT_PUBLIC_CONTRACT_ADDRESS` est configuré : enregistre l'achat on-chain (ERC721).
4. Le certificat apparaît dans l'espace personnel (`/compte`).

## Contrat ERC721 (`contracts/`)

```bash
npm run hardhat node          # Nœud local (port 8545)
npx hardhat compile           # Compiler
npx hardhat run scripts/deploy.js --network localhost  # Déployer en local
```

Après déploiement sur Sepolia, renseigner `NUXT_PUBLIC_CONTRACT_ADDRESS` dans `.env`.
