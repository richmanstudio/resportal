import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        steel: "#2563eb",
        navy: "#071527",
        porcelain: "#f7f8fb"
      },
      boxShadow: {
        panel: "0 18px 48px rgba(15, 23, 42, 0.07)",
        lift: "0 18px 38px rgba(15, 23, 42, 0.10)"
      }
    }
  },
  plugins: []
} satisfies Config;
