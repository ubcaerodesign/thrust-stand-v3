import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Prevent Vite from clearing the terminal so Rust compiler logs stay visible
  clearScreen: false,

  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Tell Vite's file watcher to completely ignore the Rust build folder
      ignored: ["**/src-tauri/**"],
    },
  },
});