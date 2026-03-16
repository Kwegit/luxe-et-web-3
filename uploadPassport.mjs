// uploadPassport.mjs
// Usage : node uploadPassport.mjs
// Prérequis : npm install axios form-data dotenv

import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import "dotenv/config";

// ─── Config ────────────────────────────────────────────────────────────────
const JWT = process.env.PINATA_JWT;
if (!JWT) {
  console.error("❌  PINATA_JWT manquant dans le fichier .env");
  process.exit(1);
}

const PINATA_URL_FILE = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_URL_JSON = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
const GATEWAY      = "https://gateway.pinata.cloud/ipfs";

// ─── Helpers ───────────────────────────────────────────────────────────────

// Upload d'un fichier local → retourne le CID
async function uploadFile(filePath, pinataName) {
  const fileName = path.basename(filePath);
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath), fileName);
  form.append(
    "pinataMetadata",
    JSON.stringify({ name: pinataName })
  );

  console.log(`  ⬆  Upload fichier : ${fileName}`);
  const res = await axios.post(PINATA_URL_FILE, form, {
    headers: { Authorization: `Bearer ${JWT}`, ...form.getHeaders() },
    maxBodyLength: Infinity,
  });
  const cid = res.data.IpfsHash;
  console.log(`  ✅ CID obtenu : ${cid}`);
  return cid;
}

// Upload d'un objet JSON → retourne le CID
async function uploadJSON(jsonObject, pinataName) {
  console.log(`  ⬆  Upload JSON : ${pinataName}`);
  const res = await axios.post(
    PINATA_URL_JSON,
    { pinataMetadata: { name: pinataName }, pinataContent: jsonObject },
    { headers: { Authorization: `Bearer ${JWT}`, "Content-Type": "application/json" } }
  );
  const cid = res.data.IpfsHash;
  console.log(`  ✅ CID obtenu : ${cid}`);
  return cid;
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🧳  Passeport Numérique — Maison Aurel #001");
  console.log("─".repeat(50));

  // ── Étape 1 : Upload des assets ──────────────────
  console.log("\n📁  Étape 1 — Upload des assets");

  // ⚠️  Remplace ces chemins par tes vraies photos
  const photoPrincipaleCID = await uploadFile(
    "./assets/sac-principal.png",
    "MA-001-photo-principale"
  );
  const photoInterieurCID = await uploadFile(
    "./assets/sac-interieur.png",
    "MA-001-photo-interieur"
  );
  const photoQuincaillerieCID = await uploadFile(
    "./assets/sac-quincaillerie.png",
    "MA-001-photo-quincaillerie"
  );
  const certificatPDFCID = await uploadFile(
    "./assets/certificat-001.pdf",
    "MA-001-certificat"
  );

  // ── Étape 2 : Construction du JSON avec les CIDs ─
  console.log("\n📝  Étape 2 — Construction du JSON");

  const metadata = {
    name: "Maison Aurel — Sac N°001",
    description:
      "Passeport numérique officiel. Sac à main cousu main en cuir d'alligator noir, quincaillerie or jaune 18k. Pièce unique certifiée par Maison Aurel.",
    image: `ipfs://${photoPrincipaleCID}`,
    external_url: "https://passport.maison-aurel.com/001",

    attributes: [
      { trait_type: "Type de cuir",        value: "Alligator mississippiensis" },
      { trait_type: "Couleur",             value: "marron profond" },
      { trait_type: "Finition",            value: "Lisse" },
      { trait_type: "Quincaillerie",       value: "Or jaune 18k" },
      { trait_type: "Manufacture",         value: "Maison william — Atelier Paris 6e" },
      { trait_type: "Artisan",             value: "Jean-Pierre william" },
      { trait_type: "Année de fabrication", value: 2024 },
      { trait_type: "Numéro de série",     value: "MA-2024-001" },
      { trait_type: "Modèle",              value: "Le Faubourg 28" },
      { trait_type: "Dimensions",          value: "28 × 22 × 10 cm" },
      { trait_type: "Coutures",            value: "Sellier main — fil lin ciré" },
    ],

    maison_aurel: {
      certificate_id:   "MA-CERT-2024-001",
      warranty_years:   3,
      certificate_pdf:  `ipfs://${certificatPDFCID}`,
      photo_details: [
        `ipfs://${photoInterieurCID}`,
        `ipfs://${photoQuincaillerieCID}`,
      ],
      service_history: [],
    },
  };

  console.log("  ✅ JSON construit avec les CIDs injectés");

  // ── Étape 3 : Upload du JSON final ───────────────
  console.log("\n🌐  Étape 3 — Upload du JSON sur Pinata");
  const metadataCID = await uploadJSON(metadata, "MA-001-metadata");

  // ── Résultat final ────────────────────────────────
  const tokenURI = `ipfs://${metadataCID}`;

  console.log("\n" + "─".repeat(50));
  console.log("🎉  Upload terminé !\n");
  console.log(`  tokenURI (à passer à safeMint) :`);
  console.log(`  ${tokenURI}\n`);
  console.log(`  Aperçu sur gateway :`);
  console.log(`  ${GATEWAY}/${metadataCID}\n`);

  // Sauvegarde dans un fichier pour Antoine
  const output = {
    tokenURI,
    metadataCID,
    assets: {
      photoPrincipale:   `ipfs://${photoPrincipaleCID}`,
      photoInterieur:    `ipfs://${photoInterieurCID}`,
      photoQuincaillerie:`ipfs://${photoQuincaillerieCID}`,
      certificatPDF:     `ipfs://${certificatPDFCID}`,
    },
  };
  fs.writeFileSync("./output-cids.json", JSON.stringify(output, null, 2));
  console.log("  📄 CIDs sauvegardés dans output-cids.json (à transmettre à Antoine)");
  console.log("─".repeat(50) + "\n");
}

main().catch((err) => {
  console.error("❌  Erreur :", err.response?.data || err.message);
  process.exit(1);
});
