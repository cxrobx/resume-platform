import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        macos: {
          bg:             "#1e1e1e",
          surface:        "#2d2d2d",
          elevated:       "#3d3d3d",
          border:         "#404040",
          text:           "#ffffff",
          "text-secondary": "#a0a0a0",
          accent:         "#0a84ff",
          "accent-hover": "#0070e0",
          success:        "#30d158",
          error:          "#ff453a",
          warning:        "#ffd60a",
        },
      },
      boxShadow: {
        macos:    "0 2px 8px rgba(0,0,0,0.3), 0 0 1px rgba(0,0,0,0.3)",
        "macos-lg": "0 10px 40px rgba(0,0,0,0.4), 0 0 1px rgba(0,0,0,0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
