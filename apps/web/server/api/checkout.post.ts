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
  };
}

export default defineEventHandler(async (event) => {
  console.info("[checkout] request received");

  const config = useRuntimeConfig();
  if (!config.stripeSecretKey) {
    console.error("[checkout] missing Stripe secret key");
    throw createError({
      statusCode: 500,
      statusMessage: "Stripe secret key missing",
    });
  }

  const { bagId, successUrl, cancelUrl, userId } = await readBody(event);
  console.info("[checkout] payload parsed", {
    bagId,
    hasCancelUrl: Boolean(cancelUrl),
    hasSuccessUrl: Boolean(successUrl),
    userId,
  });

  if (!bagId || !successUrl || !cancelUrl || !userId) {
    console.error("[checkout] missing required fields", {
      bagId,
      cancelUrl,
      successUrl,
      userId,
    });
    throw createError({
      statusCode: 400,
      statusMessage: "Missing bagId/userId/successUrl/cancelUrl",
    });
  }

    const user = upsertUserByPrivyId(userId)

  const bag = findBag(bagId);
  if (!bag) {
    console.error("[checkout] bag not found", { bagId });
    throw createError({ statusCode: 404, statusMessage: "Bag not found" });
  }

  const stripe = new Stripe(config.stripeSecretKey);
  console.info("[checkout] creating Stripe session", {
    bagId: bag.id,
    currency: bag.currency,
    priceCents: bag.priceCents,
    userId: user.id,
  });

  const session = await stripe.checkout.sessions.create(
    buildCheckoutSessionPayload(bag, user, cancelUrl, successUrl),
  );
  console.info("[checkout] Stripe session created", {
    sessionId: session.id,
    sessionUrl: session.url,
  });

  createOrder({
    bagId: bag.id,
    stripeSessionId: session.id,
    userId: user.id,
  });
  console.info("[checkout] order created", {
    bagId: bag.id,
    sessionId: session.id,
    userId: user.id,
  });

  return { id: session.id, url: session.url };
});
