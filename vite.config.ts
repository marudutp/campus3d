// vite.config.ts
import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  server: {
     host: '0.0.0.0',  // Ini yang penting!
    port: 5000,
    strictPort: false,
    https: {
      // Untuk development, kita bisa menggunakan self-signed certificate
      // Atau comment bagian ini jika tidak perlu HTTPS di client
      key: fs.readFileSync(path.resolve(__dirname, '../virtual-classroom-v3-5-Server/cert/localhost+2-key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, '../virtual-classroom-v3-5-Server/cert/localhost+2.pem')),
    },
    proxy: {
      '/socket.io': {
        target: 'https://localhost:8080',
        ws: true,
        secure: false, // Accept self-signed certificates
        changeOrigin: true
      },
      '/api': {
        target: 'https://localhost:8080',
        secure: false,
        changeOrigin: true
      },
      '/upload-material': {
        target: 'https://localhost:8080',
        secure: false,
        changeOrigin: true
      },
      '/presentations': {
        target: 'https://localhost:8080',
        secure: false,
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    include: ['@babylonjs/core', '@babylonjs/loaders', '@babylonjs/gui']
  }
});