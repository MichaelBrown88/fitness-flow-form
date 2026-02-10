import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        "border-medium": "hsl(var(--border-medium))",
        "border-dark": "hsl(var(--border-dark))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        "background-secondary": "hsl(var(--background-secondary))",
        "background-tertiary": "hsl(var(--background-tertiary))",
        foreground: "hsl(var(--foreground))",
        "foreground-secondary": "hsl(var(--foreground-secondary))",
        "foreground-tertiary": "hsl(var(--foreground-tertiary))",
        "foreground-quaternary": "hsl(var(--foreground-quaternary))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        gradient: {
          from: "hsl(var(--gradient-from))",
          to: "hsl(var(--gradient-to))",
          "from-hex": "var(--gradient-from-hex)",
          "to-hex": "var(--gradient-to-hex)",
          light: "hsl(var(--gradient-light))",
          medium: "hsl(var(--gradient-medium))",
          dark: "hsl(var(--gradient-dark))",
        },
        brand: {
          DEFAULT: "var(--brand-primary)",
          light: "hsl(var(--gradient-light))",
          medium: "hsl(var(--gradient-medium))",
          dark: "hsl(var(--gradient-dark))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          elevated: "hsl(var(--card-elevated))",
          subtle: "hsl(var(--card-subtle))",
        },
        score: {
          green: {
            DEFAULT: "hsl(var(--score-green))",
            fg: "hsl(var(--score-green-fg))",
            light: "hsl(var(--score-green-light))",
            muted: "hsl(var(--score-green-muted))",
            bold: "hsl(var(--score-green-bold))",
          },
          amber: {
            DEFAULT: "hsl(var(--score-amber))",
            fg: "hsl(var(--score-amber-fg))",
            light: "hsl(var(--score-amber-light))",
            muted: "hsl(var(--score-amber-muted))",
            bold: "hsl(var(--score-amber-bold))",
          },
          red: {
            DEFAULT: "hsl(var(--score-red))",
            fg: "hsl(var(--score-red-fg))",
            light: "hsl(var(--score-red-light))",
            muted: "hsl(var(--score-red-muted))",
            bold: "hsl(var(--score-red-bold))",
          },
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        DEFAULT: "var(--radius)",      /* 12px - Apple standard */
        sm: "var(--radius-sm)",         /* 8px */
        md: "var(--radius)",            /* 12px */
        lg: "var(--radius-lg)",         /* 16px */
        xl: "var(--radius-xl)",         /* 24px */
        '2xl': "var(--radius-2xl)",     /* 28px */
        '3xl': "var(--radius-3xl)",     /* 32px */
        full: "var(--radius-full)",
      },
      transitionDuration: {
        'fast': 'var(--duration-fast)',
        'base': 'var(--duration-base)',
        'slow': 'var(--duration-slow)',
      },
      transitionTimingFunction: {
        'apple': 'var(--easing-apple)',
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "blob": {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        },
        "fadeInUp": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "scan": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(400%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "blob": "blob 10s infinite",
        "fade-in-up": "fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "float": "float 6s ease-in-out infinite",
        "scan": "scan 3s linear infinite",
      },
    },
  },
  plugins: [tailwindAnimate],
} satisfies Config;
