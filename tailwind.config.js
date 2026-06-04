/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        /**
         * Dark surface — used wherever `dark:bg-ink` appears. We use a very
         * dark grey rather than pure black so the UI feels softer and lets
         * subtle borders / shadows read against it.
         */
        ink: "#171717",
        paper: "#f7f4ed",
        /**
         * Brand accent. Key is still `amber` for backwards compatibility with
         * dozens of `bg-amber` / `text-amber` / `border-amber` usages; the
         * value is the moss-green brand color.
         */
        amber: "#4a7c4a",
        common: "#0f9d90",
        uncommon: "#2979ff",
        rare: "#7c4dff",
        legendary: "#4a7c4a",
        card: "#1f1f1f",
        border: "#2e2e2e",
      },
    },
  },
  plugins: [],
};
