import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#e8eaf6',
          100: '#c5c9e8',
          200: '#9fa5d9',
          300: '#7881ca',
          400: '#5a65be',
          500: '#3c49b3',
          600: '#2c3a9a',
          700: '#1a2a7c',
          800: '#0d1b5e',
          900: '#060d40',
          950: '#020820',
        },
        ember: {
          50:  '#fff8e1',
          100: '#ffecb3',
          200: '#ffe082',
          300: '#ffd54f',
          400: '#ffca28',
          500: '#ffc107',
          600: '#ffb300',
          700: '#ffa000',
          800: '#ff8f00',
          900: '#ff6f00',
        },
        orange: {
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'ember-gradient': 'linear-gradient(135deg, #ffa000 0%, #f97316 50%, #ea580c 100%)',
        'navy-gradient': 'linear-gradient(135deg, #060d40 0%, #0d1b5e 50%, #1a2a7c 100%)',
      },
      animation: {
        'flame-flicker': 'flicker 2s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'check-draw': 'checkDraw 0.6s ease-out forwards',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.02)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(255,160,0,0.4)' },
          '50%': { boxShadow: '0 0 24px rgba(249,115,22,0.7)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        checkDraw: {
          from: { strokeDashoffset: '100' },
          to: { strokeDashoffset: '0' },
        },
      },
      boxShadow: {
        'ember': '0 4px 24px rgba(255,160,0,0.25)',
        'navy': '0 4px 24px rgba(6,13,64,0.25)',
      },
    },
  },
  plugins: [],
}

export default config
