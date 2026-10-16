import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    root: here,
    include: ['release-candidate.test.mjs'],
    environment: 'node',
  },
});
