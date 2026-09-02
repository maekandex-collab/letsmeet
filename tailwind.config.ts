import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        urbanist: ["Urbanist", "sans-serif"],
      },
      colors: {
        primary: "#F759F5",
        "primary-light": "#FAE8F9",
        accent: "#3E36ED",
        dark: "#12151C",
        "dark-alt": "#0F0F0F",
        muted: "#616568",
        border: "#F5F5F5",
        "border-dark": "#E8E8E8",
        surface: "#FBF7FC",
      },
      maxWidth: {
        mobile: "var(--app-max-width)",
      },
      boxShadow: {
        header: "0 8px 28px -10px rgba(62,54,237,0.12)",
        card: "0 8px 28px rgba(34,24,44,0.08)",
        nav: "0 -8px 28px rgba(42,20,54,0.08)",
        soft: "0 4px 18px rgba(247,89,245,0.12)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        press: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.96)" },
          "100%": { transform: "scale(1)" },
        },
        fadeUpSoft: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
        press: "press 0.25s ease-out",
        "fade-up": "fadeUpSoft 0.3s cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [],
};
export default config;
