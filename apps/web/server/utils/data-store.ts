import { randomUUID } from 'node:crypto'

type OrderStatus = 'PENDING' | 'PAYMENT_CREATED' | 'PAID' | 'FAILED'

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
    id: 'demo-user',
    email: 'demo@luxe.test',
    walletAddress: '0x0000000000000000000000000000000000000000',
    privyUserId: null
  }
]

const bags: Bag[] = [
  {
    id: 'bag-demo',
    uid: 'bag-demo-uid',
    name: 'Sac Demo Vérifié',
    description: 'Prototype certifié on-chain via UID + Pinata metadata.',
    priceCents: 125_000,
    currency: 'EUR'
  }
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
    id: randomUUID(),
    userId: input.userId,
    bagId: input.bagId,
    status: 'PAYMENT_CREATED',
    stripeSessionId: input.stripeSessionId ?? null,
    createdAt: now,
    updatedAt: now
  }
  orders.push(order)
  return order
}

export function updateOrderBySession(
  stripeSessionId: string,
  update: Partial<Pick<Order, 'status' | 'stripePaymentIntent'>>
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
