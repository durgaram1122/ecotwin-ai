import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#07111f',
        navy: '#0b1b2d',
        panel: '#10263a',
        cyan: '#54d7f2',
        emerald: '#55e6a5',
        amber: '#f2bb63',
        signal: '#f16f66'
      }
    }
  },
  plugins: []
};

export default config;
