import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        status: {
          'on-track': '#22c55e',     // green-500
          'at-risk': '#eab308',      // yellow-500
          'delayed': '#ef4444',      // red-500
          'recovered': '#3b82f6',    // blue-500
          'completed': '#22c55e',    // green-500
          'in-progress': '#6366f1',  // indigo-500
          'not-started': '#9ca3af',  // gray-400
          'blocked': '#b91c1c',      // red-700
        },
      },
    },
  },
  plugins: [],
};

export default config;
