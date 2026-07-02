/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',  // blue-600 — màu chủ đạo toàn app
          light: '#EFF6FF',    // blue-50  — background nhạt, badge
          dark: '#1D4ED8',     // blue-700 — pressed state
        },
      },
    },
  },
  plugins: [],
};
