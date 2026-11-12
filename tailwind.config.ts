import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ── Primary (terracotta) — was the old `gobbl` scale ─────────────
        gobbl: {
          50:  "#FBF3E8",
          100: "#F4E3D5",
          200: "#EFCEB4",
          300: "#E4A78A",
          400: "#D67448",
          500: "#C0461C",  // ← primary
          600: "#A53A14",
          700: "#7A2916",
          800: "#561B0F",
          900: "#3A1209",
          950: "#1F0904",
        },
        // ── Neutrals — was the old `roost` scale ─────────────────────────
        roost: {
          50:  "#FBF6EB",  // bg
          100: "#F4ECDD",  // bg / surface-2
          200: "#E8DDC6",  // line
          300: "#D4C5A6",
          400: "#A89B82",
          500: "#8C7660",  // ink-muted
          600: "#5C4A3A",  // ink-soft
          700: "#3D3025",
          800: "#26201A",
          900: "#1A1612",  // ink
          950: "#0E0B09",
        },
        // ── Ochre / butter — was `golden` scale ──────────────────────────
        golden: {
          50:  "#FEF7E5",
          100: "#FBE9C4",
          200: "#F6D58E",
          300: "#F0BD56",
          400: "#E4A547",  // ← ochre
          500: "#C68A2B",
          600: "#9B6D1E",
          700: "#704F14",
          800: "#48340E",
          900: "#251B07",
        },
        // ── Plume — repurposed as deep red/rust for danger ───────────────
        plume: {
          50:  "#FBEDE8",
          100: "#F4D9CC",
          200: "#E5AC93",
          300: "#D2785A",
          400: "#B5482A",
          500: "#7A2916",  // danger
          600: "#601E0F",
          700: "#46160B",
          800: "#2C0E07",
          900: "#180704",
        },
        // ── NEW: Forest accent (civility / success / steady) ─────────────
        forest: {
          50:  "#EDF4EE",
          100: "#D5DFD4",
          200: "#A8C0A6",
          300: "#759B73",
          400: "#477649",
          500: "#1F4937",  // forest
          600: "#173B2C",
          700: "#102C21",
          800: "#0A1D16",
          900: "#050E0B",
        },

        // ── Semantic single-value aliases (use in new code) ──────────────
        // These are driven by CSS variables in globals.css so dark mode flips.
        bg:            "rgb(var(--bg) / <alpha-value>)",
        surface:       "rgb(var(--surface) / <alpha-value>)",
        "surface-2":   "rgb(var(--surface-2) / <alpha-value>)",
        ink:           "rgb(var(--ink) / <alpha-value>)",
        "ink-soft":    "rgb(var(--ink-soft) / <alpha-value>)",
        "ink-muted":   "rgb(var(--ink-muted) / <alpha-value>)",
        line:          "rgb(var(--line) / <alpha-value>)",
        primary:       "rgb(var(--primary) / <alpha-value>)",
        "primary-soft":"rgb(var(--primary-soft) / <alpha-value>)",
        "forest-fg":   "rgb(var(--forest) / <alpha-value>)",
        "forest-soft": "rgb(var(--forest-soft, 213 223 212) / <alpha-value>)",
        ochre:         "rgb(var(--ochre) / <alpha-value>)",
        "ochre-soft":  "rgb(var(--ochre-soft, 251 233 196) / <alpha-value>)",
        danger:        "rgb(var(--danger) / <alpha-value>)",
        "coop-wall":   "rgb(var(--coop-wall) / <alpha-value>)",
        "coop-plank":  "rgb(var(--coop-plank) / <alpha-value>)",
        "coop-shade":  "rgb(var(--coop-shade) / <alpha-value>)",
        "coop-straw":  "rgb(var(--coop-straw) / <alpha-value>)",
      },
      spacing: {
        unit: "4px",
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "40px",
        "gutter-mobile": "12px",
        "margin-mobile": "20px",
      },
      borderRadius: {
        DEFAULT: "0.875rem",   // 14px
        sm:      "0.5rem",     // 8px
        md:      "0.75rem",    // 12px
        lg:      "1.125rem",   // 18px
        xl:      "1.5rem",     // 24px
        "2xl":   "1.75rem",    // 28px
        "3xl":   "2.25rem",    // 36px
        full:    "9999px",
      },
      fontFamily: {
        // Display: Bricolage Grotesque (was Quicksand)
        display: ["var(--font-bricolage)", "ui-sans-serif", "system-ui", "sans-serif"],
        // Body: DM Sans (was Nunito Sans)
        body:    ["var(--font-dm-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        // Mono: JetBrains Mono — for numerals, stats, timestamps
        mono:    ["var(--font-jetbrains)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        // Tightened display sizes with negative tracking — Harvest spec
        "display-2xl": ["3.5rem",  { lineHeight: "1",     letterSpacing: "-0.035em", fontWeight: "700" }],
        "display-xl":  ["2.75rem", { lineHeight: "1",     letterSpacing: "-0.035em", fontWeight: "700" }],
        "display-lg":  ["2.25rem", { lineHeight: "1.05",  letterSpacing: "-0.03em",  fontWeight: "700" }],
        "display-md":  ["1.75rem", { lineHeight: "1.1",   letterSpacing: "-0.025em", fontWeight: "700" }],
        "display-sm":  ["1.375rem",{ lineHeight: "1.15",  letterSpacing: "-0.02em",  fontWeight: "700" }],
        eyebrow:       ["0.6875rem", { lineHeight: "1",   letterSpacing: "0.12em",   fontWeight: "600" }],
      },
      boxShadow: {
        // Soft warm-toned shadows
        soft:  "0 1px 0 rgba(0,0,0,0.04), 0 8px 24px rgba(122,41,22,0.06)",
        lift:  "0 8px 24px rgba(192,70,28,0.20)",
        ring:  "0 0 0 4px rgba(228,165,71,0.18)",
      },
      animation: {
        // existing
        "feather-fall": "featherFall 2s ease-in-out infinite",
        hatch:          "hatch 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards",
        strut:          "strut 0.8s ease-in-out",
        gobble:         "gobble 0.3s ease-in-out",
        float:          "float 3s ease-in-out infinite",
        wiggle:         "wiggle 1s ease-in-out infinite",
        // egg hatch (EggHatch): one-shot rock per tap, shell lifts away, chick rises
        "egg-rock":     "eggRock 0.5s ease-out",
        "shell-lift":   "shellLift 0.75s cubic-bezier(0.3,0.7,0.4,1) forwards",
        "chick-rise":   "chickRise 0.9s cubic-bezier(0.34,1.3,0.64,1) 0.25s both",
        // new
        "fade-in":      "fadeIn 0.4s ease-out forwards",
        "slide-up":     "slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        "level-pulse":  "levelPulse 1.4s cubic-bezier(0.16,1,0.3,1)",
        "score-tick":   "scoreTick 0.7s cubic-bezier(0.16,1,0.3,1)",
        "shimmer":      "shimmer 1.4s linear infinite",
      },
      keyframes: {
        featherFall: {
          "0%":   { transform: "translateY(-10px) rotate(0deg)",  opacity: "1" },
          "100%": { transform: "translateY(60px) rotate(45deg)",  opacity: "0" },
        },
        hatch: {
          "0%":   { transform: "scale(0.8) rotate(-5deg)", opacity: "0" },
          "50%":  { transform: "scale(1.1) rotate(3deg)"               },
          "100%": { transform: "scale(1) rotate(0deg)",    opacity: "1" },
        },
        strut: {
          "0%, 100%": { transform: "translateX(0) rotate(0deg)"   },
          "25%":      { transform: "translateX(4px) rotate(2deg)"  },
          "75%":      { transform: "translateX(-4px) rotate(-2deg)" },
        },
        gobble: {
          "0%, 100%": { transform: "scale(1)"    },
          "50%":      { transform: "scale(1.08)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)"    },
          "50%":      { transform: "translateY(-8px)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(0deg)"  },
          "25%":      { transform: "rotate(-3deg)" },
          "75%":      { transform: "rotate(3deg)"  },
        },
        eggRock: {
          "0%":   { transform: "rotate(0deg)" },
          "20%":  { transform: "rotate(calc(var(--rock, 4deg) * -1))" },
          "45%":  { transform: "rotate(var(--rock, 4deg))" },
          "70%":  { transform: "rotate(calc(var(--rock, 4deg) * -0.5))" },
          "100%": { transform: "rotate(0deg)" },
        },
        shellLift: {
          "0%":   { transform: "translateY(var(--sep, 0px)) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(-45%) translateX(14%) rotate(-28deg)", opacity: "0" },
        },
        chickRise: {
          "0%":   { transform: "translateY(32%)", opacity: "0" },
          "15%":  { opacity: "1" },
          "65%":  { transform: "translateY(-7%)", opacity: "1" },
          "82%":  { transform: "translateY(2%)", opacity: "1" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)"    },
        },
        levelPulse: {
          "0%":   { transform: "scale(1)",    filter: "drop-shadow(0 0 0 rgba(228,165,71,0))" },
          "40%":  { transform: "scale(1.06)", filter: "drop-shadow(0 0 32px rgba(228,165,71,0.6))" },
          "100%": { transform: "scale(1)",    filter: "drop-shadow(0 0 0 rgba(228,165,71,0))" },
        },
        scoreTick: {
          "0%":   { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)",   opacity: "1" },
        },
        shimmer: {
          "0%":   { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)"  },
        },
      },
    },
  },
  plugins: [],
};
export default config;
