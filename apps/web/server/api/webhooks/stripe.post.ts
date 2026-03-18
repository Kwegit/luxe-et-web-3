import { getHeader, readRawBody } from "h3";
import {
  Contract,
  JsonRpcProvider,
  Wallet,
  ZeroAddress,
  id,
  isAddress,
} from "ethers";
import Stripe from "stripe";
import {
  findBag,
  findUser,
  getOrderBySession,
  updateOrderBySession,
} from "../../utils/data-store";
export const config = {
  api: {
    bodyParser: false,
  },
};

const REGISTRY_ABI = [
  "function registerInitialPurchase(address clientWallet,uint256 nfcTokenId,string _buyerName,string _objectName,uint256 _salePrice,string _tokenURI) external",
];

function formatError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }
  return { message: String(error) };
}

async function pinSaleOnPinata(
  runtimeConfig: ReturnType<typeof useRuntimeConfig>,
  payload: Record<string, unknown>,
) {
  if (!runtimeConfig.pinataApiKey || !runtimeConfig.pinataSecretApiKey) {
    throw new Error("Missing Pinata credentials");
  }

  const response = await fetch(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    {
      body: JSON.stringify({
        pinataContent: payload,
        pinataMetadata: {
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
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Pinata error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as { IpfsHash?: string };
  if (!data.IpfsHash) {
    throw new Error("Pinata response missing IpfsHash");
  }

  return data.IpfsHash;
}

async function registerPurchaseOnChain(input: {
  buyerName: string;
  clientWallet: string;
  contractAddress: string;
  objectName: string;
  rpcUrl: string;
  salePrice: bigint;
  signerPrivateKey: string;
  tokenId: bigint;
  tokenUri: string;
}) {
  const provider = new JsonRpcProvider(input.rpcUrl, undefined, {
    staticNetwork: true,
  });
  const signer = new Wallet(input.signerPrivateKey, provider);
  const contract = new Contract(input.contractAddress, REGISTRY_ABI, signer);

  // biome-ignore lint/suspicious/noExplicitAny: Contract ABI methods are dynamically typed
  const tx = await (contract as any).registerInitialPurchase(
    input.clientWallet,
    input.tokenId,
    input.buyerName,
    input.objectName,
    input.salePrice,
    input.tokenUri,
  );
  await tx.wait();
  return tx.hash as string;
}

export default defineEventHandler(async (event) => {
  console.info("[stripe-webhook] request received");

  const runtimeConfig = useRuntimeConfig();
  if (!runtimeConfig.stripeSecretKey) {
    console.error("[stripe-webhook] missing Stripe secret key");
    throw createError({
      statusCode: 500,
      statusMessage: "Stripe secret key missing",
    });
  }

  const signature = getHeader(event, "stripe-signature");
  if (!signature) {
    console.error("[stripe-webhook] missing stripe-signature header");
    throw createError({
      statusCode: 400,
      statusMessage: "Missing stripe signature",
    });
  }

  const rawBody = await readRawBody(event);
  if (!rawBody) {
    console.error("[stripe-webhook] missing raw request body");
    throw createError({
      statusCode: 400,
      statusMessage: "Missing raw body",
    });
  }

  const stripe = new Stripe(runtimeConfig.stripeSecretKey);
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!endpointSecret) {
    console.error("[stripe-webhook] missing STRIPE_WEBHOOK_SECRET");
    throw createError({
      statusCode: 500,
      statusMessage: "Webhook secret missing",
    });
  }

  let evt: Stripe.Event;
  try {
    evt = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
  } catch (error) {
    console.error(
      "[stripe-webhook] signature verification failed",
      formatError(error),
    );
    throw createError({
      statusCode: 400,
      statusMessage: "Webhook verification failed",
    });
  }

  console.info("[stripe-webhook] event verified", {
    eventId: evt.id,
    eventType: evt.type,
  });

  if (evt.type === "checkout.session.completed") {
    const session = evt.data.object as Stripe.Checkout.Session;
    console.info("[stripe-webhook] checkout completed", {
      paymentIntent: session.payment_intent,
      sessionId: session.id,
    });

    if (session.id) {
      const order = getOrderBySession(session.id);
      console.info("[stripe-webhook] order lookup", {
        hasOrder: Boolean(order),
        sessionId: session.id,
      });

      updateOrderBySession(session.id, {
        status: "PAID",
        stripePaymentIntent: session.payment_intent as string,
      });
      console.info("[stripe-webhook] order marked as PAID", {
        sessionId: session.id,
      });

      if (!order || order.txHash) {
        console.info("[stripe-webhook] skipping post-processing", {
          hasOrder: Boolean(order),
          hasTxHash: Boolean(order?.txHash),
          sessionId: session.id,
        });
        return { received: true };
      }

      const bag = findBag(order.bagId);
      const user = findUser(order.userId);
      if (!bag || !user) {
        console.error("[stripe-webhook] missing bag or user for paid session", {
          bagId: order.bagId,
          hasBag: Boolean(bag),
          hasUser: Boolean(user),
          sessionId: session.id,
          userId: order.userId,
        });
        updateOrderBySession(session.id, {
          processingError: "Missing bag/user for paid session",
        });
        return { received: true };
      }

      const contractAddress = runtimeConfig.public.contractAddress;
      const signerPrivateKey = runtimeConfig.signerPrivateKey;
      const rpcUrl = runtimeConfig.signerRpcUrl;
      const isWalletUsable =
        isAddress(user.walletAddress) && user.walletAddress !== ZeroAddress;

      if (
        !isAddress(contractAddress) ||
        !signerPrivateKey ||
        !rpcUrl ||
        !isWalletUsable
      ) {
        console.error("[stripe-webhook] invalid on-chain configuration", {
          contractAddress,
          hasRpcUrl: Boolean(rpcUrl),
          hasSignerPrivateKey: Boolean(signerPrivateKey),
          isWalletUsable,
          sessionId: session.id,
          walletAddress: user.walletAddress,
        });
        updateOrderBySession(session.id, {
          processingError:
            "Missing contract/rpc/signer config or invalid buyer wallet",
        });
        return { received: true };
      }

      const tokenId = BigInt(id(session.id));
      const buyerName = session.customer_details?.name || user.email || "Buyer";
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
      };

      try {
        console.info("[stripe-webhook] pinning sale payload to Pinata", {
          orderId: order.id,
          sessionId: session.id,
        });
        const pinataCid = await pinSaleOnPinata(runtimeConfig, salePayload);
        const tokenUri = `ipfs://${pinataCid}`;
        console.info("[stripe-webhook] Pinata success", {
          pinataCid,
          sessionId: session.id,
          tokenUri,
        });

        console.info("[stripe-webhook] sending registerInitialPurchase tx", {
          contractAddress,
          sessionId: session.id,
          tokenId: tokenId.toString(),
        });
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
        });
        console.info("[stripe-webhook] on-chain registration success", {
          sessionId: session.id,
          txHash,
        });

        updateOrderBySession(session.id, {
          onChainTokenId: tokenId.toString(),
          pinataCid,
          processingError: null,
          tokenUri,
          txHash,
        });
        console.info("[stripe-webhook] order post-processing completed", {
          orderId: order.id,
          sessionId: session.id,
        });
      } catch (error) {
        console.error("[stripe-webhook] post-payment processing failed", {
          error: formatError(error),
          orderId: order.id,
          sessionId: session.id,
        });
        updateOrderBySession(session.id, {
          processingError:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "Post-payment processing failed",
        });
      }
    }
  }

  if (evt.type === "payment_intent.payment_failed") {
    const pi = evt.data.object as Stripe.PaymentIntent;
    const sessionId = pi.metadata?.stripeSessionId;
    console.warn("[stripe-webhook] payment_intent.payment_failed", {
      paymentIntentId: pi.id,
      sessionId,
    });
    if (sessionId) {
      updateOrderBySession(sessionId, { status: "FAILED" });
      console.warn("[stripe-webhook] order marked as FAILED", { sessionId });
    }
  }

  return { received: true };
});
