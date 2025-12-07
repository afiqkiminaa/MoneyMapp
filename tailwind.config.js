/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#9b87f5', // Update primary color to match your UI
        secondary: '#6E59A5',
        light: {
          100: '#E1D7FF', // Lighter shade for background
          200: '#C1B1FF', // Accent light shade for hover
        },
        dark: {
          100: '#24206F', // A darker blue for dark backgrounds
          200: '#181535', // Even darker background
        },
        accent: '#AB8BFF',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Change font family to match the UI
      },
      spacing: {
        '18': '4.5rem', // Added custom spacing values
        '20': '5rem',
      },
      borderRadius: {
        'lg': '1.5rem', // Rounded buttons to match the style in the UI
      },
      boxShadow: {
        'primary': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'lg-primary': '0 10px 15px rgba(0, 0, 0, 0.1)', // Shadow for main buttons
      }
    },
  },
  plugins: [],
}
