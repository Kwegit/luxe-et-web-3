import Privy, { LocalStorage, type User } from "@privy-io/js-sdk-core"

type PublicConfig = {
    privyAppId?: string
}

const toMessage = (err: unknown, fallback: string) => {
    if (err instanceof Error) return err.message
    if (typeof err === "string") return err
    return fallback
}

export default defineNuxtPlugin(() => {
    const config = useRuntimeConfig()

    const privyUser = useState<User | null>("privyUser", () => null)
    const privyReady = useState<boolean>("privyReady", () => false)
    const privyError = useState<string | null>("privyError", () => null)

    const publicConfig = (config.public as PublicConfig | undefined) ?? {}
    const importMetaEnv = import.meta.env as Record<string, string | undefined>
    const resolvedAppId =
        publicConfig.privyAppId ||
        importMetaEnv.NUXT_PUBLIC_PRIVY_APP_ID ||
        importMetaEnv.PRIVY_APP_ID ||
        process.env.NUXT_PUBLIC_PRIVY_APP_ID ||
        process.env.PRIVY_APP_ID

    console.info("[app] auth env loaded")

    if (!resolvedAppId) {
        privyError.value =
            "PRIVY_APP_ID manquant (placez-le dans apps/web/.env ou exportez-le avant nuxt dev)."
        return {
            provide: {
                // biome-ignore lint/suspicious/noExplicitAny: guard path when env is missing
                privy: null as any,
                privyError,
                privyReady,
                privyUser,
            },
        }
    }

    const client = new Privy({
        appId: resolvedAppId,
        storage: new LocalStorage(),
    })

    client
        .initialize()
        .then(async () => {
            privyReady.value = true
            try {
                const current = await client.user.get()
                privyUser.value = current?.user ?? null
            } catch (err: unknown) {
                console.warn("[privy-plugin] unable to fetch user", err)
            }
        })
        .catch((err: unknown) => {
            privyError.value = toMessage(err, "Impossible d'initialiser Privy")
        })

    return {
        provide: {
            privy: client,
            privyError,
            privyReady,
            privyUser,
        },
    }
})
