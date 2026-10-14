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
    page.on('pageerror', error => pageErrors.push(page.url() + ': ' + error.message));

    await page.goto('http://127.0.0.1:' + port + '/ad-intelligence.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#cards .creative[data-id="creative-1"] .save').click();
    assert.equal(await page.locator('#cards .creative[data-id="creative-1"]').getAttribute('data-saved'), '1', 'save action should mark the creative');
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('#cards .creative[data-id="creative-1"]').getAttribute('data-saved'), '1', 'saved creative should persist after reload');
    await page.locator('[data-tab="scans"]').click();
    assert.equal(await page.locator('#jobList .job').count(), 3, 'demo scan jobs should render');
    await page.locator('#jobStatusFilter').selectOption('failed');
    assert.equal(await page.locator('#jobList .job:not(.is-filtered-out)').count(), 1, 'status filter should show only failed jobs');
    await page.locator('#resetJobFilters').click();
    await page.locator('#newScan').click();
    await page.locator('#taskName').fill('Browser scan task');
    await page.locator('#taskSource').selectOption({ label: 'VK Ads' });
    await page.locator('#taskTarget').fill('https://example.test/ads');
    await page.locator('#taskForm button[type="submit"]').click();
    let scanRow = page.locator('#jobList .job').filter({ hasText: 'Browser scan task' });
    assert.equal(await scanRow.getAttribute('data-job-status'), 'queued', 'new demo scan should enter the queue');
    await scanRow.locator('[data-scan-action="start"]').click();
    scanRow = page.locator('#jobList .job').filter({ hasText: 'Browser scan task' });
    assert.equal(await scanRow.getAttribute('data-job-status'), 'running', 'demo scan should transition to running');
    await scanRow.locator('[data-scan-action="finish"]').click();
    scanRow = page.locator('#jobList .job').filter({ hasText: 'Browser scan task' });
    assert.equal(await scanRow.getAttribute('data-job-status'), 'completed', 'demo scan should finish explicitly');
    await scanRow.locator('[data-scan-action="details"]').click();
    assert.equal(await page.locator('#scanDetailOverlay').getAttribute('aria-hidden'), 'false', 'scan report drawer should open');
    assert.equal(await page.locator('#scanDetailTitle').textContent(), 'Browser scan task', 'scan report should show the selected task');
    assert.equal(await page.locator('#scanDetailContent .scan-artifact').count(), 2, 'scan report should show recognized and unknown demo artifacts');
    const rawHtml = page.locator('#scanDetailContent .scan-raw');
    assert.ok((await rawHtml.textContent()).includes('<div class="visibility-slot"'), 'unknown HTML should be shown as readable text');
    assert.equal(await rawHtml.locator('div, img, script').count(), 0, 'unknown HTML must not execute or render as DOM');
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#downloadScanReport').click();
    const reportDownload = await downloadPromise;
    assert.match(reportDownload.suggestedFilename(), /^neon-scan-demo-.*\.json$/, 'scan report should download as JSON');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#scanDetailOverlay').getAttribute('aria-hidden'), 'true', 'Escape should close scan report');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-tab="scans"]').click();
    scanRow = page.locator('#jobList .job').filter({ hasText: 'Browser scan task' });
    assert.equal(await scanRow.getAttribute('data-job-status'), 'completed', 'scan state should persist after reload');
    await page.locator('#jobSearch').fill('Browser scan task');
    assert.equal(await page.locator('#jobList .job:not(.is-filtered-out)').count(), 1, 'scan search should match task name');
    await page.locator('#resetJobFilters').click();

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
    const libraryDownloadPromise = page.waitForEvent('download');
    await page.locator('#exportNow').click();
    const download = await libraryDownloadPromise;
    assert.equal(download.suggestedFilename(), 'neon-ad-intelligence-demo.json', 'export should produce the expected JSON file');
    assert.equal(await page.locator('#exportHistoryList .job').count(), 1, 'export should be recorded in local history');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-tab="exports"]').click();
    assert.equal(await page.locator('#exportHistoryList .job').count(), 1, 'export history should persist after reload');

    await page.goto('http://127.0.0.1:' + port + '/index.html', { waitUntil: 'domcontentloaded' });
    const mainNavCount = await page.locator('[data-page="ads"]').count();
    if (!mainNavCount) {
      throw new Error('main navigation item missing; url=' + page.url() + '; title=' + await page.title() + '; body=' + (await page.locator('body').innerText()).slice(0, 500));
    }
    await page.locator('[data-page="ads"]').first().click();
    assert.equal(await page.locator('#adsWorkspace a[href="./ad-intelligence.html"]').count(), 1, 'main dashboard should expose the expanded Ad Intelligence link');

    assert.deepEqual(pageErrors, [], 'no uncaught browser JavaScript errors should occur');
    console.log('PASS: saved creative persists after reload');
    console.log('PASS: scan search, status filters, queued/running/completed transitions and persistence');
    console.log('PASS: scan details drawer and safe HTML preview');
    console.log('PASS: scan report JSON download');
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
