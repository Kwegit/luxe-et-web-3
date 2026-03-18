import { findBagByUid } from "../../utils/data-store"

type PinRow = {
    ipfs_pin_hash: string
    date_pinned: string
    metadata: {
        name: string
        keyvalues?: Record<string, string> | null
    }
}

type VerificationResult = {
    authentic: boolean
    bagName?: string
    certifiedAt?: string
    certificateRef?: string
}

async function fetchPinsByBagId(
    apiKey: string,
    secretKey: string,
    bagId: string,
): Promise<PinRow[]> {
    const filter = JSON.stringify({ bagId: { op: "eq", value: bagId } })
    const qs = `status=pinned&pageLimit=100&metadata[keyvalues]=${encodeURIComponent(filter)}`
    const res = await fetch(`https://api.pinata.cloud/data/pinList?${qs}`, {
        headers: {
            pinata_api_key: apiKey,
            pinata_secret_api_key: secretKey,
        },
        signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = (await res.json()) as { rows?: PinRow[] }
    return data.rows ?? []
}

export default defineEventHandler(
    async (event): Promise<VerificationResult> => {
        const uid = getRouterParam(event, "uid")
        if (!uid) {
            throw createError({ message: "UID manquant", statusCode: 400 })
        }

        const bag = findBagByUid(uid)
        if (!bag) {
            return { authentic: false }
        }

        const config = useRuntimeConfig()
        const { pinataApiKey: apiKey, pinataSecretApiKey: secretKey } = config

        if (!apiKey || !secretKey) {
            return { authentic: true, bagName: bag.name }
        }

        const pins = await fetchPinsByBagId(apiKey, secretKey, bag.id)

        if (pins.length === 0) {
            return { authentic: true, bagName: bag.name }
        }

        const latest = pins.sort(
            (a, b) =>
                new Date(b.date_pinned).getTime() -
                new Date(a.date_pinned).getTime(),
        )[0]

        return {
            authentic: true,
            bagName: bag.name,
            certificateRef: `#${latest.ipfs_pin_hash.slice(-8).toUpperCase()}`,
            certifiedAt: latest.date_pinned,
        }
    },
)
