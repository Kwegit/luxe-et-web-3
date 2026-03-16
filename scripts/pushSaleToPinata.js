// Push sale metadata to Pinata without extra deps (uses global fetch in Node 22)
// RENSEIGNE ICI tes clés Pinata et les valeurs par défaut (ne commit pas ce fichier avec tes vraies clés).
// Si PINATA_API_KEY / PINATA_SECRET_API_KEY sont définies dans l'env, elles écrasent ces valeurs.
// Usage CLI (les flags écrasent les valeurs par défaut) :
//   PINATA_API_KEY=xxx PINATA_SECRET_API_KEY=yyy node scripts/pushSaleToPinata.js \
//     --tokenId 1 --buyerWallet 0x... --buyerName "Buyer" \
//     --objectName "Object" --salePriceWei 1000000000000000000 \
//     --tokenURI ipfs://Qm...

import { argv, exit } from "node:process";

// === Renseigne tes infos ici (ou via variables d'env) ===
const PINATA_API_KEY = process.env.PINATA_API_KEY || "d1af2209e70f796179b3";
const PINATA_SECRET_API_KEY =
  process.env.PINATA_SECRET_API_KEY ||
  "bfc7b8a8dda13ad643cd74ac9d3bc2afe0885c76c30a17807bd33044a8fedc87";

const DEFAULT_SALE = {
  tokenId: 1,
  buyerWallet: "0xYourBuyerWallet",
  buyerName: "Buyer Name",
  objectName: "Object Name",
  salePriceWei: "1000000000000000000",
  tokenURI: "ipfs://QmYourCID",
};

function parseArgs() {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i];
    const val = argv[i + 1];
    if (!key || !val) break;
    args[key.replace(/^--/, "")] = val;
  }
  return args;
}

async function main() {
  const {
    tokenId = DEFAULT_SALE.tokenId,
    buyerWallet = DEFAULT_SALE.buyerWallet,
    buyerName = DEFAULT_SALE.buyerName,
    objectName = DEFAULT_SALE.objectName,
    salePriceWei = DEFAULT_SALE.salePriceWei,
    tokenURI = DEFAULT_SALE.tokenURI,
  } = parseArgs();

  if (
    PINATA_API_KEY === "CHANGE_ME_API_KEY" ||
    PINATA_SECRET_API_KEY === "CHANGE_ME_SECRET"
  ) {
    console.error(
      "Renseigne tes clés Pinata dans le fichier OU via l'environnement (PINATA_API_KEY / PINATA_SECRET_API_KEY)"
    );
    exit(1);
  }

  const payload = {
    tokenId: Number(tokenId),
    buyerWallet,
    buyerName,
    objectName,
    salePriceWei,
    tokenURI,
    timestamp: Date.now(),
  };

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      pinata_api_key: PINATA_API_KEY,
      pinata_secret_api_key: PINATA_SECRET_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Pinata error:", text);
    exit(1);
  }

  const out = await res.json();
  console.log("Pinned to IPFS:", out);
}

main().catch((err) => {
  console.error(err);
  exit(1);
});
