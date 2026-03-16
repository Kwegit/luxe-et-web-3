import { findBag } from "../../utils/data-store"

export default defineEventHandler((event) => {
    const id = event.context.params?.id
    if (!id) {
        throw createError({ statusCode: 400, statusMessage: "Missing bag id" })
    }

    const bag = findBag(id)
    if (!bag) {
        throw createError({ statusCode: 404, statusMessage: "Bag not found" })
    }

    return bag
})
