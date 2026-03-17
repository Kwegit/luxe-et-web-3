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

    // Mount hidden iframe so the embedded wallet proxy can communicate with Privy's servers.
    // The JS SDK Core doesn't do this automatically (unlike the React SDK).
    const iframe = document.createElement("iframe")
    iframe.src = client.embeddedWallet.getURL()
    iframe.style.cssText = "display:none;position:absolute;width:0;height:0;border:0;"
    document.body.appendChild(iframe)

    const handleWalletMessage = (event: MessageEvent) => {
        try {
            const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data
            if (data?.event?.startsWith?.("privy:")) {
                client.embeddedWallet.onMessage(data)
            }
        } catch { /* non-privy messages are ignored */ }
    }
    window.addEventListener("message", handleWalletMessage)

    iframe.addEventListener("load", () => {
        if (iframe.contentWindow) {
            client.embeddedWallet.setMessagePoster({
                postMessage: (msg, origin, transfer) =>
                    iframe.contentWindow!.postMessage(msg, origin, transfer as Transferable[] | undefined),
                reload: () => { iframe.src = client.embeddedWallet.getURL() },
            })
        }
    })

    client
        .initialize()
        .then(async () => {
            privyReady.value = true
            try {
                const current = await client.user.get()
                privyUser.value = current?.user ?? null
                if (privyUser.value) {
                    // biome-ignore lint/suspicious/noExplicitAny: Privy linked_accounts shape varies by SDK version
                    const wallet = (privyUser.value as any).linked_accounts?.find(
                        (a: any) => a.type === "wallet" && a.wallet_client_type === "privy" && a.connector_type === "embedded"
                    )
                    console.info("[privy] user session restored — wallet:", wallet?.address ?? "none")
                }
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
