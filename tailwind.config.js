/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts,scss}"],
  theme: {
    extend: {
      screens: {
        short: { raw: "(max-height: 810px)" },
      },
    },
  },
  plugins: [],
};
