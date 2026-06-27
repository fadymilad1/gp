import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--pharmacy-primary, #1B76FF)',
          dark: 'var(--pharmacy-secondary, #0C4EB7)',
          light: 'var(--pharmacy-primary-light, #E7F2FF)',
        },
        neutral: {
          white: '#FFFFFF',
          light: '#F7F9FC',
          border: '#DCE3EC',
          gray: '#6C7A8A',
          dark: '#1A1A1A',
        },
        success: '#28C76F',
        warning: '#FFB020',
        error: '#FF4C4C',
        ai: '#7C3AED',
      },
      fontFamily: {
        sans: ['var(--pharmacy-font-stack, Inter)', 'Inter', 'Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config

