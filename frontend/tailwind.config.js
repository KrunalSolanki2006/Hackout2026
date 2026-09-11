/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Enterprise SaaS Palette
        sidebar: {
          DEFAULT: '#080B20',
          darker: '#060818',
          card: '#0D1228',
          hover: '#131A38',
          border: '#1E2548',
          muted: '#8A92A6',
        },
        brand: {
          DEFAULT: '#5546E8',
          hover: '#4335D6',
          light: '#EEF0FD',
          subtle: '#F4F5FD',
        },
        canvas: {
          DEFAULT: '#F7F8FC',
          subtle: '#F1F3F9',
        },
        card: {
          DEFAULT: '#FFFFFF',
        },
        enterprise: {
          border: '#E5E7EB',
          'border-light': '#F3F4F6',
          title: '#111827',
          body: '#374151',
          muted: '#6B7280',
          subtle: '#9CA3AF',
        },
        status: {
          'success-bg': '#DEF7EC',
          'success-text': '#03543F',
          'success-border': '#BCF0DA',
          'warning-bg': '#FEF08A',
          'warning-text': '#854D0E',
          'warning-border': '#FDE047',
          'danger-bg': '#FDE8E8',
          'danger-text': '#9B1C1C',
          'danger-border': '#F8B4B4',
          'info-bg': '#E1EFFE',
          'info-text': '#1E429F',
          'info-border': '#B4C6FC',
          'neutral-bg': '#F3F4F6',
          'neutral-text': '#4B5563',
          'neutral-border': '#E5E7EB',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        card: '12px',
      }
    },
  },
  plugins: [],
}
