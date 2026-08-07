// Exercises the one flow that actually matters: upload a CV, submit, land
// on a results page that renders something coherent - not a blank page or
// a raw error. Doesn't assert a completed analysis: CI has no real
// ANTHROPIC_API_KEY and no queue worker running (QUEUE_CONNECTION=database
// with nothing consuming it), so the analysis deterministically stays
// "pending" after the redirect. That's still a meaningful assertion: it
// proves the upload, validation, dispatch, and redirect all worked.
//
// Reuses puppeteer-core (already a dependency for scripts/a11y-check.mjs)
// instead of adding a second browser-automation tool for one test.
//
// Run locally against `php artisan serve`:
//   E2E_BASE_URL=http://127.0.0.1:8000 npm run e2e

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8000';
const samplePdf = path.resolve(__dirname, '../public/samples/sample-cv.pdf');

const defaultExecutablePath = {
    win32: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    linux: '/usr/bin/google-chrome',
}[process.platform];

const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH ?? defaultExecutablePath;

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
    console.log(`✓ ${message}`);
}

const browser = await puppeteer.launch({ executablePath, headless: true });

try {
    const page = await browser.newPage();

    await page.goto(baseUrl, { waitUntil: 'networkidle0' });
    assert((await page.title()).length > 0, 'upload page loads with a title');

    const fileInput = await page.$('input[type="file"]');
    assert(fileInput !== null, 'file input is present on the page');

    await fileInput.uploadFile(samplePdf);
    await page.waitForFunction(
        () => document.body.textContent.includes('sample-cv.pdf'),
        { timeout: 5000 },
    );
    assert(true, 'dropzone reflects the selected file');

    const submitButton = await page.$('button[type="submit"]');
    await submitButton.click();

    await page.waitForFunction(
        () => /\/cv-analyses\/[^/]+$/.test(location.pathname),
        { timeout: 15000 },
    );
    assert(true, `submitting redirects to a results page (${page.url()})`);

    await page.waitForSelector('[role="status"], [role="alert"]', { timeout: 15000 });
    const bodyText = await page.evaluate(() => document.body.textContent);
    assert(
        !bodyText.includes('Server Error') && !bodyText.includes('500'),
        'results page renders a known state, not a raw server error',
    );
} finally {
    await browser.close();
}
