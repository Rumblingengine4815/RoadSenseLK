/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#7C5CFC',
        accent: '#F97316',
        success: '#10B981',
        danger: '#EF4444',
        background: '#0D0D14',
        card: '#1E1E30',
        textPrimary: '#F0EEFF',
        textSecondary: '#7C7A99',
      }
    },
  },
  plugins: [],
}
