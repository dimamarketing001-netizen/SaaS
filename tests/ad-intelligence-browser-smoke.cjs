#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

const root = process.cwd();
const port = 8765;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
  cwd: root,
  stdio: 'ignore'
});

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  let browser;
  try {
    await pause(900);
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage({ acceptDownloads: true });
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.goto('http://127.0.0.1:' + port + '/ad-intelligence.html', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-tab="advertisers"]').click();
    const advertiserCount = await page.locator('#advertiserList .job').count();
    if (advertiserCount !== 6) {
      const state = await page.evaluate(() => ({
        tabClass: document.querySelector('[data-tab="advertisers"]')?.className,
        panelHidden: document.querySelector('[data-panel="advertisers"]')?.hidden,
        listExists: !!document.querySelector('#advertiserList'),
        listHtml: document.querySelector('#advertiserList')?.innerHTML,
        pageTitle: document.querySelector('#pageTitle')?.textContent
      }));
      throw new Error('advertiser list expected 6 rows, got ' + advertiserCount + '; state=' + JSON.stringify(state) + '; pageErrors=' + JSON.stringify(pageErrors));
    }
    await page.locator('[data-advertiser-filter="EcoHome"]').click();
    assert.equal(await page.locator('#query').inputValue(), 'EcoHome', 'advertiser action should populate the library search');
    assert.equal(await page.locator('#cards .creative:not([hidden])').count(), 1, 'advertiser action should filter the matching creative');

    await page.locator('[data-tab="alerts"]').click();
    await page.locator('#alertNewCreative').uncheck();
    await page.locator('#saveAlertSettings').click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-tab="alerts"]').click();
    assert.equal(await page.locator('#alertNewCreative').isChecked(), false, 'alert preference should persist after reload');

    await page.locator('[data-tab="collections"]').click();
    await page.locator('#newCollection').click();
    await page.locator('#taskName').fill('Browser smoke collection');
    await page.locator('#taskForm button[type="submit"]').click();
    assert.equal(await page.locator('#userCollectionGrid').getByText('Browser smoke collection').count(), 1, 'new collection should appear');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-tab="collections"]').click();
    assert.equal(await page.locator('#userCollectionGrid').getByText('Browser smoke collection').count(), 1, 'collection should persist after reload');

    await page.locator('[data-tab="exports"]').click();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#exportNow').click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'neon-ad-intelligence-demo.json', 'export should produce the expected JSON file');
    assert.equal(await page.locator('#exportHistoryList .job').count(), 1, 'export should be recorded in local history');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-tab="exports"]').click();
    assert.equal(await page.locator('#exportHistoryList .job').count(), 1, 'export history should persist after reload');

    await page.goto('http://127.0.0.1:' + port + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-page="ads"]').click();
    assert.equal(await page.locator('#adsWorkspace a[href="./ad-intelligence.html"]').count(), 1, 'main dashboard should expose the expanded Ad Intelligence link');

    assert.deepEqual(pageErrors, [], 'no uncaught browser JavaScript errors should occur');
    console.log('PASS: advertiser list and filter navigation');
    console.log('PASS: alert preferences persist after reload');
    console.log('PASS: collections persist after reload');
    console.log('PASS: JSON download and export history persist after reload');
    console.log('PASS: main dashboard opens the expanded Ad Intelligence workspace');
    console.log('PASS: no uncaught browser JavaScript errors');
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
