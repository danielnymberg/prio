/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Eisenhower Matrix quadrants
        q1: '#EF4444', // Important + Urgent (red)
        q2: '#10B981', // Important + Not Urgent (green)
        q3: '#F59E0B', // Not Important + Urgent (amber)
        q4: '#6B7280', // Not Important + Not Urgent (gray)
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
