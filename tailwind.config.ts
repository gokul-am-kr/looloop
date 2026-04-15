import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Looloop brand colors
        habits: "#FF6B35",   // terracotta orange — habit rings & accents
        sleep:  "#5AC8FA",   // sky blue — sleep rings & accents
        card:   "#1C1C1E",   // elevated card surface
        card2:  "#2C2C2E",   // secondary card
        muted:  "#8E8E93",   // secondary text
        dim:    "#3A3A3C",   // borders, dividers
      },
      fontFamily: {
        sans: [
          "-apple-system", "BlinkMacSystemFont", "SF Pro Display",
          "Segoe UI", "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
