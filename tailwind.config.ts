import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: { colors: { border: "hsl(var(--border))", input: "hsl(var(--input))", ring: "hsl(var(--ring))", background: "hsl(var(--background))", foreground: "hsl(var(--foreground))", primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" }, muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" }, surface: "hsl(var(--surface))", success: "hsl(var(--success))", warning: "hsl(var(--warning))", destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" }, info: "hsl(var(--info))" }, borderRadius: { DEFAULT: "var(--radius)" }, fontFamily: { sans: ["var(--font-inter)", "sans-serif"], mono: ["var(--font-jetbrains-mono)", "monospace"] } } },
  plugins: [],
}
export default config
