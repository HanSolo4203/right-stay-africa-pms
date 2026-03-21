import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        green: {
          DEFAULT: "#2D6A4F",
          dark: "#1B4332",
          light: "#D8F3DC",
          accent: "#52B788",
        },
      },
    },
  },
  plugins: [],
}

export default config
