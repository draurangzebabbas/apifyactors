import { chromium } from 'playwright';

async function test() {
    const browser = await chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
    });
    const context = await browser.newContext({
        viewport: { width: 1366, height: 768 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    await page.goto('https://www.google.com/?hl=en', { waitUntil: 'domcontentloaded' });
    const searchBox = page.locator('textarea[name="q"], input[name="q"]').first();
    await searchBox.click();
    await searchBox.pressSequentially('site:dailydogguide.com/puppy-training-schedule', { delay: 10 });
    await searchBox.press('Enter');
    await page.waitForSelector('#search, #rso, div.g', { timeout: 15000 });

    const anchor = page.locator('#search a[href], #rso a[href], div.g a[href]').first();
    console.log('Clicking anchor...');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.log('Navigation wait:', e.message)),
        anchor.click(),
    ]);

    console.log('Navigated URL:', page.url());
    console.log('Navigated Title:', await page.title());
    const referrer = await page.evaluate(() => document.referrer);
    console.log('Document Referrer:', referrer);

    await browser.close();
}

test().catch(console.error);
