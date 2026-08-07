// Runs axe-core against the upload page and a completed results page. Used
// by CI (see .github/workflows/tests.yml) and can be run locally against
// `php artisan serve`:
//
//   A11Y_ANALYSIS_ID=<id-of-a-completed-analysis> npm run a11y
//
// Requires a real Chrome/Chromium install; point PUPPETEER_EXECUTABLE_PATH
// at it if it isn't in one of the default locations below.

import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';

const require = createRequire(import.meta.url);
const axeSource = require('node:fs').readFileSync(
    require.resolve('axe-core/axe.min.js'),
    'utf8',
);

const baseUrl = process.env.A11Y_BASE_URL ?? 'http://127.0.0.1:8000';
const analysisId = process.env.A11Y_ANALYSIS_ID ?? '01ARZ3NDEKTSV4RRFFQ69G5FAV';

const urls = [`${baseUrl}/`, `${baseUrl}/cv-analyses/${analysisId}`];

const defaultExecutablePath = {
    win32: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    linux: '/usr/bin/google-chrome',
}[process.platform];

const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH ?? defaultExecutablePath;

const browser = await puppeteer.launch({ executablePath, headless: true });
let failed = false;

try {
    for (const url of urls) {
        const page = await browser.newPage();

        try {
            await page.goto(url, { waitUntil: 'networkidle0' });
            await page.evaluate(axeSource);
            const results = await page.evaluate(() => axe.run());

            if (results.violations.length > 0) {
                failed = true;
                console.error(`\n✖ ${results.violations.length} accessibility violation(s) on ${url}`);
                for (const violation of results.violations) {
                    console.error(`  [${violation.impact}] ${violation.id}: ${violation.help}`);
                    for (const node of violation.nodes) {
                        console.error(`    - ${node.target.join(', ')}`);
                    }
                }
            } else {
                console.log(`✓ No accessibility violations on ${url}`);
            }
        } finally {
            await page.close();
        }
    }
} finally {
    await browser.close();
}

if (failed) {
    process.exit(1);
}
