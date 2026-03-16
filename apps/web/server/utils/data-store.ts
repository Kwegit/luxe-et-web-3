import { randomUUID } from "node:crypto"

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
    txHash?: string | null
    createdAt: Date
    updatedAt: Date
}

const users: User[] = [
    {
        email: "demo@luxe.test",
        id: "demo-user",
        privyUserId: null,
        walletAddress: "0x0000000000000000000000000000000000000000",
    },
]

const bags: Bag[] = [
    {
        currency: "EUR",
        description: "Prototype certifié.",
        id: "bag-demo",
        name: "Sac Demo Vérifié",
        priceCents: 125_000,
        uid: "bag-demo-uid",
    },
]

const orders: Order[] = []

export function findUser(userId: string) {
    return users.find((u) => u.id === userId) || null
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
    update: Partial<Pick<Order, "status" | "stripePaymentIntent">>,
) {
    const target = orders.find((o) => o.stripeSessionId === stripeSessionId)
    if (!target) return false
    Object.assign(target, update, { updatedAt: new Date() })
    return true
}

export function listBags() {
    return bags
}

export function listOrders() {
    return orders
}
