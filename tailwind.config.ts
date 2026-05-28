import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Темная база
        ocean: {
          50: '#E8DDD0',
          100: '#D4C4B0',
          200: '#B8A388',
          300: '#9C8360',
          400: '#806238',
          500: '#805e43', // Средний коричневый для раздела "О нас"
          600: '#0F0D09',
          700: '#0A0806',
          800: '#050403',
          900: '#000000',
        },
        // Теплые акценты (золотисто-оранжевый)
        fire: {
          50: '#FFF8F0',
          100: '#FFECD9',
          200: '#FFD9B3',
          300: '#FFC68D',
          400: '#FFB367',
          500: '#D4A574', // Золотисто-бежевый
          600: '#C89456',
          700: '#B8843E',
          800: '#A07130',
          900: '#805A22',
        },
        // Золотистый цвет для акцентов
        gold: {
          500: '#D4A574',
          600: '#C89456',
        },
        // Бежевые/коричневые оттенки
        wood: {
          50: '#F5F0E8',
          100: '#E8DDD0',
          200: '#D4C4B0',
          300: '#C0AB90',
          400: '#3a2c23', // Темно-коричневый для фона секций
          500: '#8B7355', // Средний коричневый
          600: '#6F5C44',
          700: '#534533',
          800: '#372E22',
          900: '#1B1711',
        },
      },
      backgroundImage: {
        'wave-pattern': "url('/waves.svg')",
        'wood-texture': "url('/wood-texture.jpg')",
        'steam-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.3) 100%)',
        'ocean-gradient': 'linear-gradient(135deg, #2C3E50 0%, #3498DB 100%)',
        'fire-gradient': 'linear-gradient(90deg, #E67E22 0%, #D35400 100%)',
      },
      animation: {
        'wave': 'wave 3s ease-in-out infinite',
        'steam': 'steam 4s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slideUp 0.6s ease-out',
        'fade-in': 'fadeIn 0.8s ease-out',
        'scale-in': 'scaleIn 0.5s ease-out',
      },
      keyframes: {
        wave: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        steam: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '0.7' },
          '50%': { transform: 'translateY(-30px) scale(1.2)', opacity: '0.5' },
          '100%': { transform: 'translateY(-60px) scale(1.4)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
