import type { Privy, User } from "@privy-io/js-sdk-core"
import type { Ref } from "vue"

declare module "#app" {
    interface NuxtApp {
        $privy: Privy
        $privyUser: Ref<User | null>
        $privyReady: Ref<boolean>
        $privyError: Ref<string | null>
    }
}

declare module "vue" {
    interface ComponentCustomProperties {
        $privy: Privy
        $privyUser: Ref<User | null>
        $privyReady: Ref<boolean>
        $privyError: Ref<string | null>
    }
}
