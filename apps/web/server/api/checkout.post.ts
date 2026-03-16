import { OrderStatus } from "@prisma/client";
import Stripe from "stripe";
import { prisma } from "../utils/prisma";

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig();
	if (!config.stripeSecretKey) {
		throw createError({
			statusCode: 500,
			statusMessage: "Stripe secret key missing",
		});
	}

	const { bagId, successUrl, cancelUrl, userId } = await readBody(event);

	if (!bagId || !successUrl || !cancelUrl || !userId) {
		throw createError({
			statusCode: 400,
			statusMessage: "Missing bagId/userId/successUrl/cancelUrl",
		});
	}

	const user = await prisma.user.findUnique({ where: { id: userId } });
	if (!user) {
		throw createError({ statusCode: 404, statusMessage: "User not found" });
	}

	const bag = await prisma.bag.findUnique({ where: { id: bagId } });
	if (!bag) {
		throw createError({ statusCode: 404, statusMessage: "Bag not found" });
	}

	const stripe = new Stripe(config.stripeSecretKey);

	const session = await stripe.checkout.sessions.create({
		mode: "payment",
		success_url: successUrl,
		cancel_url: cancelUrl,
		payment_method_types: ["card"],
		line_items: [
			{
				quantity: 1,
				price_data: {
					currency: bag.currency.toLowerCase(),
					product_data: {
						name: bag.name,
						description: bag.description ?? undefined,
					},
					unit_amount: bag.priceCents,
				},
			},
		],
		metadata: {
			bagId: bag.id,
			bagUid: bag.uid,
			userId: user.id,
		},
	});

	await prisma.order.create({
		data: {
			bagId: bag.id,
			userId: user.id,
			status: OrderStatus.PAYMENT_CREATED,
			stripeSessionId: session.id,
		},
	});

	return { id: session.id, url: session.url };
});
