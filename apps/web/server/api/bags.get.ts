import { listBags } from "../utils/data-store"

export default defineEventHandler(() => {
    return listBags()
})
