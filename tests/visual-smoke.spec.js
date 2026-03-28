import { test, expect } from '@playwright/test';

test('scene loads and renders after clicking start', async ({ page }) => {
    await page.goto('/');

    // Wait for the start button to be visible
    const startBtn = page.locator('#startButton');
    await expect(startBtn).toBeVisible({ timeout: 15000 });

    // Screenshot the loading/instruction overlay
    await page.screenshot({ path: 'test-results/01-initial-load.png', fullPage: true });

    // Click start — force because the overlay div sits on top at z-index 20
    await startBtn.click({ force: true });

    // closeOverlay hides both #overlay and #instruction
    await expect(page.locator('#instruction')).toBeHidden({ timeout: 5000 });

    // Give the 3D scene a moment to render + load models
    await page.waitForTimeout(5000);

    // Screenshot the active scene
    await page.screenshot({ path: 'test-results/02-scene-active.png', fullPage: true });

    // Verify the canvas exists and has non-zero size
    const canvas = page.locator('#drawing');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box.width).toBeGreaterThan(100);
    expect(box.height).toBeGreaterThan(100);
});
