import Stripe from "stripe"
import { createOrder, findBag, upsertUserByPrivyId } from "../utils/data-store"

function buildCheckoutSessionPayload(
    bag: NonNullable<ReturnType<typeof findBag>>,
    user: NonNullable<ReturnType<typeof findUser>>,
    cancelUrl: string,
    successUrl: string,
): Stripe.Checkout.SessionCreateParams {
    return {
        // biome-ignore lint/style/useNamingConvention: Stripe API expects snake_case keys
        cancel_url: cancelUrl,
        // biome-ignore lint/style/useNamingConvention: Stripe API expects snake_case keys
        line_items: [
            {
                // biome-ignore lint/style/useNamingConvention: Stripe API expects snake_case keys
                price_data: {
                    currency: bag.currency.toLowerCase(),
                    // biome-ignore lint/style/useNamingConvention: Stripe API expects snake_case keys
                    product_data: {
                        description: bag.description ?? undefined,
                        name: bag.name,
                    },
                    // biome-ignore lint/style/useNamingConvention: Stripe API expects snake_case keys
                    unit_amount: bag.priceCents,
                },
                quantity: 1,
            },
        ],
        metadata: {
            bagId: bag.id,
            bagUid: bag.uid,
            userId: user.id,
        },
        mode: "payment",
        // biome-ignore lint/style/useNamingConvention: Stripe API expects snake_case keys
        payment_method_types: ["card"],
        // biome-ignore lint/style/useNamingConvention: Stripe API expects snake_case keys
        success_url: successUrl,
    }
}

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    if (!config.stripeSecretKey) {
        throw createError({
            statusCode: 500,
            statusMessage: "Stripe secret key missing",
        })
    }

    const { bagId, successUrl, cancelUrl, userId } = await readBody(event)

    if (!bagId || !successUrl || !cancelUrl || !userId) {
        throw createError({
            statusCode: 400,
            statusMessage: "Missing bagId/userId/successUrl/cancelUrl",
        })
    }

    const user = upsertUserByPrivyId(userId)

    const bag = findBag(bagId)
    if (!bag) {
        throw createError({ statusCode: 404, statusMessage: "Bag not found" })
    }

    const stripe = new Stripe(config.stripeSecretKey)

    const session = await stripe.checkout.sessions.create(
        buildCheckoutSessionPayload(bag, user, cancelUrl, successUrl),
    )

    createOrder({
        bagId: bag.id,
        stripeSessionId: session.id,
        userId: user.id,
    })

    return { id: session.id, url: session.url }
})
