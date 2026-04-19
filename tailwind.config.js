/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#0b0b0b",
        paper: "#f7f4ed",
        amber: "#BA7517",
        common: "#0f9d90",
        uncommon: "#2979ff",
        rare: "#7c4dff",
        legendary: "#BA7517",
        card: "#151515",
        border: "#2a2a2a",
      },
    },
  },
  plugins: [],
};
