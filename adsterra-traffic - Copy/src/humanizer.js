/**
 * Humanizer utilities for simulating organic user activity:
 * - Natural reading pauses
 * - Human-like variable scrolling (downwards and occasional re-reading back up)
 * - Mouse cursor movements & hovering
 */

export function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Simulates gentle mouse movements on the page.
 */
export async function simulateRandomMouseMovements(page) {
    try {
        const viewport = page.viewportSize() || { width: 1280, height: 900 };
        const moves = randomBetween(2, 5);

        for (let i = 0; i < moves; i++) {
            const x = randomBetween(50, Math.max(100, viewport.width - 50));
            const y = randomBetween(50, Math.max(100, viewport.height - 50));
            await page.mouse.move(x, y, { steps: randomBetween(5, 15) });
            await sleep(randomBetween(100, 350));
        }
    } catch {
        // Page might be navigating or closed
    }
}

/**
 * Performs human-like scrolling and reading behavior for a given duration.
 * Returns the maximum scroll depth achieved (0 - 100%).
 */
export async function humanRandomScroll(page, durationMs) {
    const startTime = Date.now();
    let maxScrollPercent = 0;

    try {
        // Initial reading pause at top of page (1.5 - 3.5 seconds)
        const initialPause = Math.min(randomBetween(1500, 3500), Math.max(0, durationMs - 1000));
        if (initialPause > 0) {
            await simulateRandomMouseMovements(page);
            await sleep(initialPause);
        }

        while (Date.now() - startTime < durationMs) {
            // Measure scroll positions
            const scrollInfo = await page.evaluate(() => {
                const { documentElement: doc, body } = document;
                const scrollTop = window.pageYOffset || doc.scrollTop || (body ? body.scrollTop : 0) || 0;
                const scrollHeight = Math.max(doc.scrollHeight, body ? body.scrollHeight : 0);
                const clientHeight = window.innerHeight || doc.clientHeight || 0;
                const maxScrollable = Math.max(1, scrollHeight - clientHeight);
                const percent = Math.min(100, Math.round((scrollTop / maxScrollable) * 100));

                return { scrollTop, scrollHeight, clientHeight, maxScrollable, percent };
            });

            if (scrollInfo.percent > maxScrollPercent) {
                maxScrollPercent = scrollInfo.percent;
            }

            // Decide direction: 80% down, 20% up (if not near top)
            const shouldScrollUp = scrollInfo.percent > 20 && Math.random() < 0.22;
            let deltaY;

            if (shouldScrollUp) {
                // Scroll up slightly (50 - 180px)
                deltaY = -randomBetween(50, 180);
            } else if (scrollInfo.percent >= 96) {
                // Already at the bottom, just do mouse movements and small reading pause
                await simulateRandomMouseMovements(page);
                const waitTime = Math.min(
                    randomBetween(1000, 2500),
                    Math.max(200, durationMs - (Date.now() - startTime)),
                );
                await sleep(waitTime);
                continue;
            } else {
                // Scroll down in variable human chunks (120 - 380px)
                deltaY = randomBetween(120, 380);
            }

            // Smooth scroll execution
            await page.evaluate((delta) => {
                window.scrollBy({ top: delta, behavior: 'smooth' });
            }, deltaY);

            // Occasional mouse movement while reading
            if (Math.random() < 0.45) {
                await simulateRandomMouseMovements(page);
            }

            // Reading pause between scrolls (800ms - 2800ms)
            const remaining = durationMs - (Date.now() - startTime);
            if (remaining <= 0) break;
            const pauseMs = Math.min(randomBetween(800, 2600), remaining);
            await sleep(pauseMs);
        }

        // Final check of scroll depth
        const finalPercent = await page.evaluate(() => {
            const { documentElement: doc, body } = document;
            const scrollTop = window.pageYOffset || doc.scrollTop || (body ? body.scrollTop : 0) || 0;
            const scrollHeight = Math.max(doc.scrollHeight, body ? body.scrollHeight : 0);
            const clientHeight = window.innerHeight || doc.clientHeight || 0;
            const maxScrollable = Math.max(1, scrollHeight - clientHeight);
            return Math.min(100, Math.round((scrollTop / maxScrollable) * 100));
        });

        maxScrollPercent = Math.max(maxScrollPercent, finalPercent || 0);
    } catch {
        // Page navigation or disconnect
    }

    return maxScrollPercent;
}

/**
 * Fallback linear slow scroll
 */
export async function linearSlowScroll(page, durationMs) {
    const startTime = Date.now();
    let maxScrollPercent = 0;

    try {
        while (Date.now() - startTime < durationMs) {
            const percent = await page.evaluate(() => {
                window.scrollBy({ top: 250, behavior: 'smooth' });
                const { documentElement: doc, body } = document;
                const scrollTop = window.pageYOffset || doc.scrollTop || (body ? body.scrollTop : 0) || 0;
                const scrollHeight = Math.max(doc.scrollHeight, body ? body.scrollHeight : 0);
                const clientHeight = window.innerHeight || doc.clientHeight || 0;
                const maxScrollable = Math.max(1, scrollHeight - clientHeight);
                return Math.min(100, Math.round((scrollTop / maxScrollable) * 100));
            });

            if (percent > maxScrollPercent) maxScrollPercent = percent;
            await sleep(500);
        }
    } catch {
        // Ignore navigation
    }

    return maxScrollPercent;
}
