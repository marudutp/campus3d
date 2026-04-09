import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5000,
    https: {
      key: fs.readFileSync('./cert/localhost+2-key.pem'),
      cert: fs.readFileSync('./cert/localhost+2.pem')
    },
    hmr: {
      protocol: "wss",
      host: "192.168.0.111",
      port: 5000
    }
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
      '@': path.resolve(__dirname, './src')
    }
  }
});