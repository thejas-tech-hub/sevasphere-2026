/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        seva: { blue: '#1e3a8a', orange: '#f97316' }
      }
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
