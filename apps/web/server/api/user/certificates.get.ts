type PinRow = {
  ipfs_pin_hash: string;
  date_pinned: string;
  mime_type?: string;
  metadata: {
    name: string;
    keyvalues?: Record<string, string> | null;
  };
};

type Certificate = {
  id: string;
  bagId: string;
  bagName: string;
  certificateRef: string;
  certified: true;
  createdAt: string;
};

async function fetchPinList(
  apiKey: string,
  secretKey: string,
  filter?: string,
): Promise<PinRow[]> {
  const qs = filter
    ? `status=pinned&pageLimit=100&metadata[keyvalues]=${encodeURIComponent(filter)}`
    : "status=pinned&pageLimit=100";
  const res = await fetch(`https://api.pinata.cloud/data/pinList?${qs}`, {
    headers: {
      pinata_api_key: apiKey,
      pinata_secret_api_key: secretKey,
    },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { rows?: PinRow[] };
  return data.rows ?? [];
}

async function fetchIpfsContent(
  cid: string,
  apiKey: string,
  secretKey: string,
): Promise<Record<string, unknown> | null> {
  // Try Pinata gateway with API key auth first (faster, avoids public rate limits)
  const gateways = [
    {
      url: `https://gateway.pinata.cloud/ipfs/${cid}`,
      headers: { pinata_api_key: apiKey, pinata_secret_api_key: secretKey } as Record<string, string>,
    },
    { url: `https://ipfs.io/ipfs/${cid}`, headers: {} },
  ];

  for (const { url, headers } of gateways) {
    try {
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      return (await res.json()) as Record<string, unknown>;
    } catch {
      // try next gateway
    }
  }
  return null;
}

function toRow(pin: PinRow, content?: Record<string, unknown>): Certificate {
  const bagId = pin.metadata.keyvalues?.bagId ?? String(content?.bagId ?? "");
  const bagName =
    pin.metadata.keyvalues?.bagName ??
    String(content?.bagName ?? pin.metadata.name);
  return {
    id: pin.ipfs_pin_hash,
    bagId,
    bagName,
    certificateRef: `#${pin.ipfs_pin_hash.slice(-8).toUpperCase()}`,
    certified: true,
    createdAt: pin.date_pinned,
  };
}

export default defineEventHandler(async (event) => {
  const { walletAddress } = getQuery(event) as { walletAddress?: string };
  if (!walletAddress) return [];

  const config = useRuntimeConfig();
  const { pinataApiKey: apiKey, pinataSecretApiKey: secretKey } = config;
  if (!apiKey || !secretKey) return [];

  // 1. Fast path: pins with wallet in keyvalues (new purchases)
  const filter = JSON.stringify({ walletAddress: { value: walletAddress, op: "eq" } });
  const byKeyvalue = await fetchPinList(apiKey, secretKey, filter);

  const foundCids = new Set(byKeyvalue.map((p) => p.ipfs_pin_hash));
  const results: Certificate[] = byKeyvalue.map((p) => toRow(p));

  // 2. Fallback: fetch sale-* JSON pins and match by content walletAddress
  const allPins = await fetchPinList(apiKey, secretKey);
  const salePins = allPins.filter(
    (p) =>
      !foundCids.has(p.ipfs_pin_hash) &&
      p.metadata.name.startsWith("sale-") &&
      (p.mime_type === "application/json" || !p.mime_type),
  );

  const legacyResults = await Promise.all(
    salePins.map(async (pin) => {
      const content = await fetchIpfsContent(pin.ipfs_pin_hash, apiKey, secretKey);
      if (!content || content.walletAddress !== walletAddress) return null;
      return toRow(pin, content);
    }),
  );

  for (const r of legacyResults) {
    if (r) results.push(r);
  }

  return results.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
});
