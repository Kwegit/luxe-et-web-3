# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Luxe Auth Marketplace** — a luxury goods marketplace with invisible blockchain certification. Buyers purchase physical bags via Stripe, receive an ERC721 NFT certificate on Sepolia testnet with IPFS metadata (Pinata), and can track full ownership history on-chain.

## Repository Structure

Monorepo with two main workspaces:
- `apps/web/` — Nuxt 4 frontend + server routes (Bun)
- `contracts/` — Solidity smart contracts (Hardhat + Foundry, npm)

## Commands

### Web App (`apps/web/`)

```bash
bun run dev          # Dev server at localhost:3000
bun run build        # Production build
bun run preview      # Preview production build
bunx nuxi prepare    # Regenerate Nuxt type declarations

# Database (Prisma + SQLite)
bun run db:push      # Push schema changes
bun run db:seed      # Seed initial bag data

# Linting/Formatting
bunx biome check .   # Check
bunx biome lint .    # Lint only
bunx biome format .  # Format only
```

### Smart Contracts (`contracts/`)

```bash
npm run hardhat node          # Start local Hardhat network (port 8545)
npx hardhat compile           # Compile contracts
npx hardhat test              # Run Hardhat tests
npx hardhat run scripts/deploy.js --network localhost  # Deploy locally
forge build                   # Compile with Foundry
forge test                    # Test with Foundry
```

### Full Stack (Docker)

```bash
docker compose up --build     # Hardhat node + Nuxt app
docker compose --profile stripe up  # Include Stripe CLI listener
```

## Architecture

### Data Flow

1. User authenticates via **Privy** embedded wallet (created on signup)
2. User selects a bag → Stripe Checkout session created (`POST /api/checkout`)
3. Stripe webhook (`POST /api/webhooks/stripe`) fires on payment success:
   - Uploads metadata to **Pinata** IPFS
   - Calls `NFCBrandRegistry.registerInitialPurchase()` on Sepolia
   - Mints ERC721 token with `tokenURI` pointing to IPFS CID
4. Bag detail page shows ownership history from on-chain events

### Server Routes (`apps/web/server/api/`)

| Route | Purpose |
|-------|---------|
| `GET /api/bags` | List available bags |
| `GET /api/bags/[id]` | Bag details + on-chain history |
| `POST /api/checkout` | Create Stripe checkout session |
| `POST /api/webhooks/stripe` | Handle payment completion |
| `GET /api/health` | Health check |

### State

In-memory data store (`apps/web/server/utils/data-store.ts`) holds users, bags, and orders — no persistent DB currently despite Prisma being listed as a dependency.

### Smart Contract (`contracts/contract.sol`)

`NFCBrandRegistry` is ERC721 (OpenZeppelin v5). Key functions:
- `registerInitialPurchase(bagUID, buyerName, tokenURI)` → mints token
- `registerResale(tokenId, newBuyerName)` → appends to history
- `getFullHistory(tokenId)` → returns full ownership chain
- `getCurrentOwner(tokenId)` → latest buyer info

### Key Runtime Config (`apps/web/nuxt.config.ts`)

Private (server-only): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRIVY_EMBEDDED_WALLET_SECRET`, `PINATA_API_KEY`, `PINATA_SECRET_API_KEY`, `SEPOLIA_SIGNER_KEY`

Public (browser): `NUXT_PUBLIC_CHAIN_ID` (11155111 = Sepolia), `NUXT_PUBLIC_CONTRACT_ADDRESS`, `NUXT_PUBLIC_PRIVY_APP_ID`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Nuxt 4 + Vue 3 |
| Styling | Tailwind CSS 4 |
| Linting | Biome 2 |
| Auth | nuxt-auth-utils + Privy embedded wallets |
| State | Pinia |
| Blockchain | ethers.js 6, Hardhat, Foundry, Sepolia testnet |
| IPFS | Pinata SDK |
| Payments | Stripe.js + Stripe Node |
| Validation | Zod |
| Contracts | Solidity 0.8.24, OpenZeppelin v5 |

## Environment Setup

Copy `.env.example` to `.env` at the repo root. Required variables:

```
NUXT_PUBLIC_CONTRACT_ADDRESS=   # Deploy contract first, paste address here
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
PRIVY_APP_ID=
PRIVY_EMBEDDED_WALLET_SECRET=
NUXT_PUBLIC_PRIVY_APP_ID=
PINATA_API_KEY=
PINATA_SECRET_API_KEY=
SEPOLIA_SIGNER_KEY=             # Private key for on-chain transactions
DATABASE_URL=file:./apps/web/prisma/dev.db
