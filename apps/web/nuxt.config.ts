// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite"


export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  css: ["~/assets/css/tailwind.css"],
  devtools: { enabled: true },
  modules: ["nuxt-auth-utils", "evlog/nuxt", "@pinia/nuxt"],
    future: {
        compatibilityVersion: 5,
        typescriptBundlerResolution: true,
    },

  vite: {
        // biome-ignore lint/suspicious/noExplicitAny: tailwind plugin type error
        plugins: [tailwindcss() as any],
    },

  runtimeConfig: {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    privyAppId: process.env.PRIVY_APP_ID,
    privyEmbeddedWalletSecret: process.env.PRIVY_EMBEDDED_WALLET_SECRET,
    pinataApiKey: process.env.PINATA_API_KEY,
    pinataSecretApiKey: process.env.PINATA_SECRET_API_KEY,
    signerPrivateKey: process.env.SEPOLIA_SIGNER_KEY,
    public: {
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      privyAppId: process.env.PRIVY_APP_ID,
      chainId: process.env.NUXT_PUBLIC_CHAIN_ID ?? '11155111',
      contractAddress: process.env.NUXT_PUBLIC_CONTRACT_ADDRESS ?? ''
    }
  }
})
