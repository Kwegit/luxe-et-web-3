import { OrderStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
	const demoUser = await prisma.user.upsert({
		where: { email: "demo@luxe.test" },
		update: {},
		create: {
			email: "demo@luxe.test",
			walletAddress: "0x0000000000000000000000000000000000000000",
		},
	});

	const bag = await prisma.bag.upsert({
		where: { uid: "bag-demo-uid" },
		update: {},
		create: {
			uid: "bag-demo-uid",
			name: "Sac Demo Vérifié",
			description: "Prototype certifié on-chain via UID + Pinata metadata.",
			priceCents: 125000,
			currency: "EUR",
		},
	});

	await prisma.order.upsert({
		where: { id: "seed-order" },
		update: {},
		create: {
			id: "seed-order",
			userId: demoUser.id,
			bagId: bag.id,
			status: OrderStatus.PENDING,
		},
	});

	console.log("Seed complete");
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
