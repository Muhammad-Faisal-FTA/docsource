import type { Config } from "tailwindcss";

// Small, intentional design-token layer (see ARCHITECTURE.md).
// Kept minimal on purpose: this is a utility product (a document editor),
// not a marketing surface, so tokens favor clarity and hierarchy over
// decoration.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1c1c1e",
        paper: "#fafaf9",
        line: "#e4e4e1",
        accent: "#3b5bdb",
        "accent-soft": "#eef1fd",
        owned: "#2f7d4f",
        "owned-soft": "#eaf6ee",
        shared: "#b5720a",
        "shared-soft": "#fdf3e3",
        danger: "#c0362c",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
