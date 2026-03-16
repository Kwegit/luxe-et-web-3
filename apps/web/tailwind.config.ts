import type { Config } from "tailwindcss"

export default {
    content: [
        "./app/**/*.{vue,js,ts}",
        "./components/**/*.{vue,js,ts}",
        "./layouts/**/*.{vue,js,ts}",
        "./pages/**/*.{vue,js,ts}",
        "./plugins/**/*.{js,ts}",
        "./error.vue",
    ],
    plugins: [],
    theme: {
        extend: {
            colors: {
                gold: "#c9a227",
                ink: "#0f172a",
                sand: "#f5f1e8",
            },
            fontFamily: {
                display: ['"Playfair Display"', "serif"],
                sans: ['"DM Sans"', "system-ui", "sans-serif"],
            },
        },
    },
} satisfies Config
