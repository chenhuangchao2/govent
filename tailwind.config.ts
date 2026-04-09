import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "on-surface": "#191c1d",
        "on-surface-variant": "#424752",
        "surface": "#f8f9fa",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f3f4f5",
        "surface-container": "#edeeef",
        "surface-container-high": "#e7e8e9",
        "surface-container-highest": "#e1e3e4",
        "outline": "#727783",
        "outline-variant": "#c2c6d4",
        "primary": "#00478d",
        "primary-container": "#005eb8",
        "primary-fixed": "#d6e3ff",
        "primary-fixed-dim": "#a9c7ff",
        "secondary-fixed": "#dee0ff",
        "on-secondary-fixed-variant": "#2f3f92",
        "tertiary-fixed": "#a1efff",
        "on-tertiary-fixed": "#001f25",
        "on-tertiary-fixed-variant": "#004e59",
        "error": "#ba1a1a",
      },
      fontFamily: {
        headline: ["var(--font-manrope)", "Manrope", "sans-serif"],
        body: ["var(--font-manrope)", "Manrope", "sans-serif"],
        label: ["var(--font-inter)", "Inter", "sans-serif"],
        sans: ["var(--font-inter)", "var(--font-geist-sans)", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "1rem",
        lg: "2rem",
        xl: "3rem",
        full: "9999px",
      },
    },
  },
  plugins: [],
};

export default config;
