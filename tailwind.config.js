/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Thomas V2 French Agriculture Color Palette
        primary: {
          50: '#f0fdf4',   // Very light green
          100: '#dcfce7',  // Light green
          200: '#bbf7d0',  // Lighter green
          300: '#86efac',  // Light-medium green
          400: '#4ade80',  // Medium green
          500: '#22c55e',  // Main green (brand)
          600: '#16a34a',  // Dark green (titles)
          700: '#15803d',  // Darker green
          800: '#166534',  // Very dark green
          900: '#14532d',  // Darkest green
        },
        secondary: {
          // Action colors from ThomasV2 specs
          blue: '#3b82f6',    // Actions/buttons
          orange: '#f59e0b',  // Observations/warnings
          red: '#ef4444',     // Treatments/alerts
          purple: '#8b5cf6',  // Experiments/trials
          yellow: '#eab308',  // Planning/future
        },
        // Status colors for tasks/activities
        status: {
          completed: '#22c55e',   // Green
          pending: '#f59e0b',     // Orange
          cancelled: '#ef4444',   // Red
          planned: '#3b82f6',     // Blue
        }
      },
      fontFamily: {
        // French typography - clean and readable
        sans: ['System', 'ui-sans-serif', 'sans-serif'],
      },
      fontSize: {
        // French text sizing
        'xs': '12px',
        'sm': '14px',
        'base': '16px',
        'lg': '18px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '28px',
        '4xl': '32px',
      },
      spacing: {
        // Consistent spacing for mobile
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}
