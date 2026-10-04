import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@soravo/payment-domain': path.resolve(
        __dirname,
        '../../packages/payment-domain/src/index.ts',
      ),
    },
  },
  test: {
    root: '.',
    include: ['**/*.test.mjs'],
    environment: 'node',
  },
});