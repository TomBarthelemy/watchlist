import { defineConfig } from 'vite';

export default defineConfig(() => ({
  // Vite préfixera TOUTES les URLs absolues (HTML/CSS/JS) par ce base.
  base: process.env['APP_BASE'] || '/',
}));
