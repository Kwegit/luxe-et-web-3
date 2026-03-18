import {
    Contract,
    id,
    isAddress,
    JsonRpcProvider,
    Wallet,
    ZeroAddress,
} from "ethers"
import { getHeader, readRawBody } from "h3"
import Stripe from "stripe"
import {
    findBag,
    findUser,
    getOrderBySession,
    updateOrderBySession,
} from "../../utils/data-store"
export const config = {
    api: {
        bodyParser: false,
    },
}

const REGISTRY_ABI = [
    "function registerInitialPurchase(address clientWallet,uint256 nfcTokenId,string _buyerName,string _objectName,uint256 _salePrice,string _tokenURI) external",
]

async function pinSaleOnPinata(
    runtimeConfig: ReturnType<typeof useRuntimeConfig>,
    payload: Record<string, unknown>,
) {
    if (!runtimeConfig.pinataApiKey || !runtimeConfig.pinataSecretApiKey) {
        throw new Error("Missing Pinata credentials")
    }

    const response = await fetch(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        {
            body: JSON.stringify({
                pinataContent: payload,
                pinataMetadata: {
                    keyvalues: {
                        bagId: String(payload.bagId ?? ""),
                        bagName: String(payload.bagName ?? ""),
                        walletAddress: String(payload.walletAddress ?? ""),
                    },
                    name: `sale-${String(payload.orderId ?? "unknown")}`,
                },
            }),
            headers: {
                "Content-Type": "application/json",
                pinata_api_key: runtimeConfig.pinataApiKey,
                pinata_secret_api_key: runtimeConfig.pinataSecretApiKey,
            },
            method: "POST",
        },
    )

    if (!response.ok) {
        const body = await response.text()
        throw new Error(`Pinata error ${response.status}: ${body}`)
    }

    const data = (await response.json()) as { IpfsHash?: string }
    if (!data.IpfsHash) {
        throw new Error("Pinata response missing IpfsHash")
    }

    return data.IpfsHash
}

async function registerPurchaseOnChain(input: {
    buyerName: string
    clientWallet: string
    contractAddress: string
    objectName: string
    rpcUrl: string
    salePrice: bigint
    signerPrivateKey: string
    tokenId: bigint
    tokenUri: string
}) {
    const provider = new JsonRpcProvider(input.rpcUrl, undefined, {
        staticNetwork: true,
    })
    const signer = new Wallet(input.signerPrivateKey, provider)
    const contract = new Contract(input.contractAddress, REGISTRY_ABI, signer)

    // biome-ignore lint/suspicious/noExplicitAny: Contract ABI methods are dynamically typed
    const tx = await (contract as any).registerInitialPurchase(
        input.clientWallet,
        input.tokenId,
        input.buyerName,
        input.objectName,
        input.salePrice,
        input.tokenUri,
    )
    await tx.wait()
    return tx.hash as string
}

export default defineEventHandler(async (event) => {
    const runtimeConfig = useRuntimeConfig()
    if (!runtimeConfig.stripeSecretKey) {
        throw createError({
            statusCode: 500,
            statusMessage: "Stripe secret key missing",
        })
    }

    const signature = getHeader(event, "stripe-signature")
    if (!signature) {
        throw createError({
            statusCode: 400,
            statusMessage: "Missing stripe signature",
        })
    }

    const rawBody = await readRawBody(event)
    if (!rawBody) {
        throw createError({
            statusCode: 400,
            statusMessage: "Missing raw body",
        })
    }

    const stripe = new Stripe(runtimeConfig.stripeSecretKey)
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!endpointSecret) {
        throw createError({
            statusCode: 500,
            statusMessage: "Webhook secret missing",
        })
    }

    let evt: Stripe.Event
    try {
        evt = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret)
    } catch {
        throw createError({
            statusCode: 400,
            statusMessage: "Webhook verification failed",
        })
    }

    if (evt.type === "checkout.session.completed") {
        const session = evt.data.object as Stripe.Checkout.Session

        if (session.id) {
            const order = getOrderBySession(session.id)

            updateOrderBySession(session.id, {
                status: "PAID",
                stripePaymentIntent: session.payment_intent as string,
            })

            if (!order || order.txHash) {
                return { received: true }
            }

            const bag = findBag(order.bagId)
            const user = findUser(order.userId)
            if (!bag || !user) {
                updateOrderBySession(session.id, {
                    processingError: "Missing bag/user for paid session",
                })
                return { received: true }
            }

            const tokenId = BigInt(id(session.id))
            const buyerName =
                session.customer_details?.name || user.email || "Buyer"
            const salePayload = {
                bagId: bag.id,
                bagName: bag.name,
                buyerName,
                chainId: runtimeConfig.public.chainId,
                currency: bag.currency,
                orderId: order.id,
                priceCents: bag.priceCents,
                sessionId: session.id,
                walletAddress: user.walletAddress,
            }

            // Step 1: Always pin to Pinata (certificate creation is independent of on-chain config)
            let pinataCid: string | null = null
            let tokenUri: string | null = null
            try {
                pinataCid = await pinSaleOnPinata(runtimeConfig, salePayload)
                tokenUri = `ipfs://${pinataCid}`
                updateOrderBySession(session.id, { pinataCid, tokenUri })
            } catch (error) {
                updateOrderBySession(session.id, {
                    processingError:
                        error instanceof Error
                            ? error.message.slice(0, 500)
                            : "Pinata pinning failed",
                })
            }

            // Step 2: On-chain registration (optional — skipped if config is missing)
            const contractAddress = runtimeConfig.public.contractAddress
            const signerPrivateKey = runtimeConfig.signerPrivateKey
            const rpcUrl = runtimeConfig.signerRpcUrl
            const isWalletUsable =
                isAddress(user.walletAddress) &&
                user.walletAddress !== ZeroAddress

            if (
                !isAddress(contractAddress) ||
                !signerPrivateKey ||
                !rpcUrl ||
                !isWalletUsable ||
                !tokenUri
            ) {
                return { received: true }
            }

            try {
                const txHash = await registerPurchaseOnChain({
                    buyerName,
                    clientWallet: user.walletAddress,
                    contractAddress,
                    objectName: bag.name,
                    rpcUrl,
                    salePrice: BigInt(bag.priceCents),
                    signerPrivateKey,
                    tokenId,
                    tokenUri,
                })
                updateOrderBySession(session.id, {
                    onChainTokenId: tokenId.toString(),
                    processingError: null,
                    txHash,
                })
            } catch (error) {
                updateOrderBySession(session.id, {
                    processingError:
                        error instanceof Error
                            ? error.message.slice(0, 500)
                            : "On-chain registration failed",
                })
            }
        }
    }

    if (evt.type === "payment_intent.payment_failed") {
        const pi = evt.data.object as Stripe.PaymentIntent
        const sessionId = pi.metadata?.stripeSessionId
        if (sessionId) {
            updateOrderBySession(sessionId, { status: "FAILED" })
        }
    }

    return { received: true }
})
