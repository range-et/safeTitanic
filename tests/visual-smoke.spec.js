import { test, expect } from '@playwright/test';

test('scene loads and renders after clicking start', async ({ page }) => {
    await page.goto('/');

    // Wait for the start button to be visible
    const startBtn = page.locator('#startButton');
    await expect(startBtn).toBeVisible({ timeout: 15000 });

    // Screenshot the loading/instruction overlay
    await page.screenshot({ path: 'test-results/01-initial-load.png', fullPage: true });

    // Click start to dismiss overlay
    await startBtn.click();

    // Wait for the overlay to disappear
    await expect(page.locator('#overlay')).toBeHidden({ timeout: 5000 });

    // Give the 3D scene a moment to render
    await page.waitForTimeout(3000);

    // Screenshot the active scene
    await page.screenshot({ path: 'test-results/02-scene-active.png', fullPage: true });

    // Verify the canvas exists and has non-zero size
    const canvas = page.locator('#drawing');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box.width).toBeGreaterThan(100);
    expect(box.height).toBeGreaterThan(100);

    // Check the canvas is rendering something (not all black)
    const pixelData = await page.evaluate(() => {
        const c = document.getElementById('drawing');
        const ctx = c.getContext('webgl2') || c.getContext('webgl');
        if (!ctx) return null;
        const pixels = new Uint8Array(4);
        ctx.readPixels(
            Math.floor(c.width / 2), Math.floor(c.height / 2),
            1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, pixels
        );
        return Array.from(pixels);
    });

    // At least one channel should have some value (not pure black)
    if (pixelData) {
        const sum = pixelData[0] + pixelData[1] + pixelData[2];
        expect(sum).toBeGreaterThan(0);
    }
});
