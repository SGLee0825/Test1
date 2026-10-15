/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 상대 경로 base: GitHub Pages 프로젝트 경로(/<repo>/)의 대소문자와 무관하게 동작
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      // UCUM 단위 정의(~230 kB)를 별도 청크로 분리
      output: { manualChunks: { ucum: ['@lhncbc/ucum-lhc'] } },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
