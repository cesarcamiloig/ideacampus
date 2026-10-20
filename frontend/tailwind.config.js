/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Rojo institucional UFPS: acción principal, foco, error y selección
        ufps: {
          DEFAULT: "#c81e1e",
          hover: "#a81919",
          suave: "#fdf2f2",
          borde: "#f2c7c7",
        },
        // Fondos de trabajo del panel (mismo gris del MainLayout)
        superficie: {
          DEFAULT: "#f4f5f7",
          alta: "#fafafb",
        },
      },
      transitionTimingFunction: {
        // ease-out fuerte: arranca rápido y se asienta suave
        "out-suave": "cubic-bezier(0.23, 1, 0.32, 1)",
        // Curva de panel lateral (tipo iOS): entra decidido y se asienta sin rebote
        panel: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      keyframes: {
        aparecer: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        confirmar: {
          from: { opacity: "0", transform: "scale(0.9)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        // Variante para prefers-reduced-motion: solo opacidad, sin desplazamiento
        desvanecer: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        aparecer: "aparecer 200ms cubic-bezier(0.23, 1, 0.32, 1) both",
        confirmar: "confirmar 240ms cubic-bezier(0.23, 1, 0.32, 1) both",
        desvanecer: "desvanecer 150ms ease both",
      },
    },
  },
  plugins: [],
};
