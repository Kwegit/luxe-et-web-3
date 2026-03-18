import { randomUUID } from "node:crypto"

function isWalletAddress(value: string | null | undefined): value is string {
    return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value)
}

type OrderStatus = "PENDING" | "PAYMENT_CREATED" | "PAID" | "FAILED"

type User = {
    id: string
    email: string
    walletAddress: string
    privyUserId?: string | null
}

type Bag = {
    id: string
    uid: string
    name: string
    description?: string | null
    priceCents: number
    currency: string
}

type Order = {
    id: string
    userId: string
    bagId: string
    status: OrderStatus
    stripeSessionId?: string | null
    stripePaymentIntent?: string | null
    onChainTokenId?: string | null
    pinataCid?: string | null
    tokenUri?: string | null
    txHash?: string | null
    processingError?: string | null
    createdAt: Date
    updatedAt: Date
}

const users: User[] = []

const bags: Bag[] = [
    {
        currency: "EUR",
        description:
            "Cabas en cuir grainé noir, coutures sellier contrastantes ivoire, anses tressées à la main. Doublure en daim bordeaux, poche zippée intérieure. Pièce numérotée, édition limitée à 12 exemplaires.",
        id: "bag-demo",
        name: "Le Noir Sellier",
        priceCents: 125_000,
        uid: "bag-demo-uid",
    },
    {
        currency: "EUR",
        description:
            "Sac porté épaule en veau plongé cognac, fermeture par boucle laiton massif brossé. Fond structuré, bandoulière réglable en cuir naturel. Collection Automne — édition numérotée 01/20.",
        id: "bag-cognac",
        name: "Le Cognac Boucle",
        priceCents: 98_000,
        uid: "bag-cognac-uid",
    },
]

const orders: Order[] = []

export function findUser(userId: string) {
    return (
        users.find((u) => u.id === userId || u.privyUserId === userId) || null
    )
}

export function upsertUserByPrivyId(
    privyUserId: string,
    walletAddress?: string,
): User {
    const normalizedWallet = walletAddress?.trim()
    const validWallet = isWalletAddress(normalizedWallet)
        ? normalizedWallet
        : null

    const existing = findUser(privyUserId)
    if (existing) {
        if (validWallet) {
            existing.walletAddress = validWallet
        }
        return existing
    }

    const user: User = {
        email: "",
        id: randomUUID(),
        privyUserId,
        walletAddress: validWallet ?? "",
    }
    users.push(user)
    return user
}

export function findBag(bagId: string) {
    return bags.find((b) => b.id === bagId) || null
}

export function createOrder(input: {
    userId: string
    bagId: string
    stripeSessionId?: string
}): Order {
    const now = new Date()
    const order: Order = {
        bagId: input.bagId,
        createdAt: now,
        id: randomUUID(),
        status: "PAYMENT_CREATED",
        stripeSessionId: input.stripeSessionId ?? null,
        updatedAt: now,
        userId: input.userId,
    }
    orders.push(order)
    return order
}

export function updateOrderBySession(
    stripeSessionId: string,
    update: Partial<
        Pick<
            Order,
            | "onChainTokenId"
            | "pinataCid"
            | "processingError"
            | "status"
            | "stripePaymentIntent"
            | "tokenUri"
            | "txHash"
        >
    >,
) {
    const target = orders.find((o) => o.stripeSessionId === stripeSessionId)
    if (!target) return false
    Object.assign(target, update, { updatedAt: new Date() })
    return true
}

export function getOrderBySession(stripeSessionId: string) {
    return orders.find((o) => o.stripeSessionId === stripeSessionId) || null
}

export function listBags() {
    return bags
}

export function findBagByUid(uid: string) {
    return bags.find((b) => b.uid === uid) || null
}

export function listOrders() {
    return orders
}

export function listOrdersByPrivyId(privyUserId: string) {
    const user = findUser(privyUserId)
    if (!user) return []
    return orders.filter((o) => o.userId === user.id)
}
