import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    outputDir: './test-results',
    timeout: 30000,
    use: {
        baseURL: 'http://localhost:4173',
        screenshot: 'only-on-failure'
    },
    webServer: {
        command: 'npx vite preview --port 4173',
        port: 4173,
        reuseExistingServer: !process.env.CI
    },
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' }
        }
    ]
});
