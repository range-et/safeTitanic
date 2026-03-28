import { defineConfig } from 'vite';

export default defineConfig({
    base: '/safeTitanic/',
    build: {
        outDir: 'dist',
        assetsInlineLimit: 0
    }
});
