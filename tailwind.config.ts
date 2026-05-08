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
      },
      maxWidth: {
        mobile: "600px",
      },
      boxShadow: {
        header: "0 0 22px -4px rgba(0,0,0,0.17)",
        card: "0 4px 24px rgba(0,0,0,0.10)",
      },
    },
  },
  plugins: [],
};
export default config;
