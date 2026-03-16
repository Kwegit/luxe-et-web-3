import { getHeader, readRawBody } from "h3"
import Stripe from "stripe"
import { updateOrderBySession } from "../../utils/data-store"
export const config = {
    api: {
        bodyParser: false,
    },
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
    } catch (_err) {
        throw createError({
            statusCode: 400,
            statusMessage: "Webhook verification failed",
        })
    }

    if (evt.type === "checkout.session.completed") {
        const session = evt.data.object as Stripe.Checkout.Session
        if (session.id) {
            updateOrderBySession(session.id, {
                status: "PAID",
                stripePaymentIntent: session.payment_intent as string,
            })
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
