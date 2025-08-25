
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      boxShadow: {
        glass: "0 10px 40px rgba(15,23,42,.08)",
      },
    },
  },
  plugins: [],
};
