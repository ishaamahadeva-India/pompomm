import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: { DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)" },
        accent: {
          red: "var(--accent-red)",
          cyan: "var(--accent-cyan)",
          green: "var(--accent-green)",
        },
        gold: "var(--gold-reward)",
        muted: "var(--muted)",
        destructive: "var(--destructive)",
        "glass-border": "var(--glass-border)",
      },
      backgroundImage: {
        "primary-gradient": "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #ea580c 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "count-up": "countUp 0.5s ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        countUp: { "0%": { opacity: "0", transform: "translateY(4px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};
export default config;
