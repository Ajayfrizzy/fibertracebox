import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        panel: "#f7f7f3",
        line: "#d9ddd1",
        ckb: "#2e7d5b",
        signal: "#c2410c",
        cyanline: "#0e7490"
      },
      boxShadow: {
        soft: "0 18px 40px rgba(17, 24, 39, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
