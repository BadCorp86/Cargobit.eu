/** @type {import('tailwindcss').Config} */
/**
 * CargoBit Design System - Tailwind Configuration
 * Generated from Design Tokens
 * Version: 1.0.0
 */

module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors
        brand: {
          primary: '#0052FF',
          'primary-hover': '#003EB3',
          secondary: '#00C2A8',
          accent: '#FFB800'
        },
        // Risk Level Colors (CargoBit Core)
        risk: {
          green: '#2ECC71',
          'green-light': '#D1FAE5',
          yellow: '#F1C40F',
          'yellow-light': '#FEF3C7',
          red: '#E74C3C',
          'red-light': '#FEE2E2'
        },
        // Insurance Brand Colors
        insurance: {
          blue: '#0077CC',
          gold: '#D4AF37',
          silver: '#C0C0C0'
        },
        // Neutral Scale
        neutral: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2933',
          900: '#111827'
        },
        // Feedback States
        feedback: {
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6'
        },
        // Background Colors
        surface: {
          page: '#F9FAFB',
          DEFAULT: '#FFFFFF',
          subtle: '#F3F4F6'
        }
      },
      // Typography
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace']
      },
      fontSize: {
        'xs': ['12px', { lineHeight: '1.5' }],
        'sm': ['14px', { lineHeight: '1.5' }],
        'base': ['16px', { lineHeight: '1.5' }],
        'lg': ['18px', { lineHeight: '1.5' }],
        'xl': ['20px', { lineHeight: '1.25' }],
        '2xl': ['24px', { lineHeight: '1.25' }],
        '3xl': ['32px', { lineHeight: '1.25' }]
      },
      // Spacing (from tokens)
      spacing: {
        '4': '4px',
        '8': '8px',
        '12': '12px',
        '16': '16px',
        '20': '20px',
        '24': '24px',
        '32': '32px',
        '40': '40px'
      },
      // Border Radius
      borderRadius: {
        'none': '0px',
        'sm': '4px',
        'DEFAULT': '8px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        'pill': '999px'
      },
      // Box Shadows
      boxShadow: {
        'none': 'none',
        'sm': '0 1px 2px rgba(15, 23, 42, 0.05)',
        'card': '0 1px 3px rgba(15, 23, 42, 0.08)',
        'dropdown': '0 10px 15px rgba(15, 23, 42, 0.15)',
        'modal': '0 20px 25px rgba(15, 23, 42, 0.20)'
      },
      // Animation
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-risk': 'pulseRisk 2s infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        pulseRisk: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' }
        }
      },
      // Responsive Breakpoints
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px'
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ]
}
