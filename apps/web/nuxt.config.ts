// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite"

export default defineNuxtConfig({
    compatibilityDate: "2025-07-15",
    css: ["~/assets/css/tailwind.css"],
    devtools: { enabled: true },
    future: {
        compatibilityVersion: 5,
        typescriptBundlerResolution: true,
    },
    modules: ["nuxt-auth-utils", "evlog/nuxt", "@pinia/nuxt"],

    runtimeConfig: {
        pinataApiKey: process.env.PINATA_API_KEY,
        pinataSecretApiKey: process.env.PINATA_SECRET_API_KEY,
        privyAppId: process.env.PRIVY_APP_ID,
        privyEmbeddedWalletSecret: process.env.PRIVY_EMBEDDED_WALLET_SECRET,
        public: {
            chainId: process.env.NUXT_PUBLIC_CHAIN_ID ?? "11155111",
            contractAddress: process.env.NUXT_PUBLIC_CONTRACT_ADDRESS ?? "",
            privyAppId: process.env.PRIVY_APP_ID,
            stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        },
        signerPrivateKey: process.env.SEPOLIA_SIGNER_KEY,
        stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    },

    vite: {
        // biome-ignore lint/suspicious/noExplicitAny: tailwind plugin type error
        plugins: [tailwindcss() as any],
    },
})
