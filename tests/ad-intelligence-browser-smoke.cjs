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
    await page.locator('#query').fill('EcoHome');
    assert.equal(await page.locator('#cards .creative:not([hidden])').count(), 1, 'saved-search fixture should return one matching creative');
    page.once('dialog', dialog => dialog.accept('EcoHome only'));
    await page.locator('#saveSearch').click();
    assert.equal(await page.locator('#savedSearchesList .savedsearchitem').count(), 1, 'saved search should be added to the panel');
    assert.equal(await page.locator('#savedSearchesPanel').isVisible(), true, 'saved searches panel should become visible');
    await page.locator('#reset').click();
    assert.equal(await page.locator('#query').inputValue(), '', 'reset should clear the current query');
    await page.locator('#savedSearchesList [data-use-saved-search]').click();
    assert.equal(await page.locator('#query').inputValue(), 'EcoHome', 'saved search should restore its query');
    assert.equal(await page.locator('#cards .creative:not([hidden])').count(), 1, 'applying saved search should reapply filters');
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('#savedSearchesList .savedsearchitem').count(), 1, 'saved search should persist after reload');
    await page.locator('#savedSearchesList [data-use-saved-search]').click();
    assert.equal(await page.locator('#query').inputValue(), 'EcoHome', 'saved search should remain applicable after reload');
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#savedSearchesList [data-delete-saved-search]').click();
    assert.equal(await page.locator('#savedSearchesList .savedsearchitem').count(), 0, 'saved search should be deleted after confirmation');

    await page.locator('#reset').click();
    const bulkCard1 = page.locator('#cards .creative[data-id="creative-1"]');
    const bulkCard2 = page.locator('#cards .creative[data-id="creative-2"]');
    await bulkCard1.locator('[data-bulk-select]').check();
    await bulkCard2.locator('[data-bulk-select]').check();
    assert.equal(await page.locator('#bulkBar').isVisible(), true, 'bulk toolbar should appear when cards are selected');
    assert.equal(await page.locator('#bulkSelectionCount').textContent(), '2', 'bulk toolbar should report two selected cards');
    await page.locator('#bulkSaveSelected').click();
    assert.equal(await bulkCard1.getAttribute('data-saved'), '1', 'bulk save should mark the first creative as saved');
    assert.equal(await bulkCard2.getAttribute('data-saved'), '1', 'bulk save should mark the second creative as saved');
    page.once('dialog', dialog => dialog.accept('Bulk created collection'));
    await page.locator('#bulkCreateCollection').click();
    let bulkCollection = await page.evaluate(() => JSON.parse(localStorage.getItem('neon-ad-intelligence-collections') || '[]').find(item => item.name === 'Bulk created collection'));
    assert.ok(bulkCollection, 'bulk create should persist a new collection');
    assert.deepEqual(new Set(bulkCollection.ids), new Set(['creative-1', 'creative-2']), 'bulk-created collection should include the selected creatives');
    await page.locator('#bulkClearSelection').click();
    const bulkCard3 = page.locator('#cards .creative[data-id="creative-3"]');
    await bulkCard3.locator('[data-bulk-select]').check();
    await page.locator('#bulkCollectionSelect').selectOption({ label: 'Bulk created collection' });
    await page.locator('#bulkAddCollection').click();
    bulkCollection = await page.evaluate(() => JSON.parse(localStorage.getItem('neon-ad-intelligence-collections') || '[]').find(item => item.name === 'Bulk created collection'));
    assert.ok(bulkCollection.ids.includes('creative-3'), 'bulk add should append the selected creative to the chosen collection');
    const bulkDownloadPromise = page.waitForEvent('download');
    await page.locator('#bulkExportSelected').click();
    const bulkDownload = await bulkDownloadPromise;
    assert.equal(bulkDownload.suggestedFilename(), 'neon-ad-intelligence-selected-demo.json', 'bulk export should download selected creatives');
    const exportHistory = await page.evaluate(() => JSON.parse(localStorage.getItem('neon-ad-intelligence-exports') || '[]'));
    assert.equal(exportHistory[0].count, 1, 'bulk export should add the selected item count to export history');
    assert.equal(exportHistory[0].kind, 'selected', 'bulk export should be distinguishable in export history');
    await page.locator('#bulkClearSelection').click();
    assert.equal(await page.locator('#bulkBar').isVisible(), false, 'bulk toolbar should hide after clearing the selection');

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
    await page.locator('[data-artifact-filter="unknown"]').click();
    assert.equal(await page.locator('#scanDetailContent .scan-artifact:not([hidden])').count(), 1, 'unknown filter should show one artifact');
    assert.equal(await page.locator('[data-artifact-filter="unknown"]').getAttribute('aria-pressed'), 'true', 'unknown filter should expose selected state');
    const rawHtml = page.locator('#scanDetailContent .scan-raw');
    assert.equal(await rawHtml.isVisible(), true, 'unknown HTML should remain visible in the unknown filter');
    await page.locator('[data-fragment-kind="DEMO-HTML-017"]').selectOption('shadow-dom');
    await page.locator('[data-fragment-note="DEMO-HTML-017"]').fill('Проверить наличие open shadow root у контейнера.');
    await page.locator('[data-fragment-save="DEMO-HTML-017"]').click();
    assert.ok((await page.locator('.scan-annotation-status').innerText()).includes('Метка сохранена локально'), 'fragment annotation should report local save');
    const savedAnnotation = await page.evaluate(() => JSON.parse(localStorage.getItem('neon-ad-intelligence-fragment-annotations') || '{}')['DEMO-HTML-017']);
    assert.equal(savedAnnotation.kind, 'shadow-dom', 'annotation kind should be saved locally');
    assert.equal(savedAnnotation.note, 'Проверить наличие open shadow root у контейнера.', 'annotation note should be saved locally');
    await page.locator('[data-artifact-filter="recognized"]').click();
    assert.equal(await page.locator('#scanDetailContent .scan-artifact:not([hidden])').count(), 1, 'recognized filter should show one artifact');
    assert.equal(await page.locator('#scanDetailContent .scan-artifact[data-artifact-type="recognized"]').isVisible(), true, 'recognized creative should be visible');
    await page.locator('[data-artifact-filter="all"]').click();
    await page.locator('[data-version-compare-toggle]').click();
    assert.equal(await page.locator('#scanDetailContent .scan-version-compare').isVisible(), true, 'version comparison should expand');
    assert.equal(await page.locator('#scanDetailContent .scan-version-card').count(), 2, 'version comparison should show two demo versions');
    assert.ok((await page.locator('#scanDetailContent .scan-diff-list').innerText()).includes('Изменён заголовок'), 'version comparison should list changed fields');
    await page.locator('[data-version-compare-toggle]').click();
    assert.equal(await page.locator('#scanDetailContent .scan-version-compare').isVisible(), false, 'version comparison should collapse');
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
    await page.locator('[data-scan-action="details"]').first().click();
    await page.locator('[data-artifact-filter="unknown"]').click();
    assert.equal(await page.locator('[data-fragment-kind="DEMO-HTML-017"]').inputValue(), 'shadow-dom', 'fragment annotation kind should persist after reload');
    assert.equal(await page.locator('[data-fragment-note="DEMO-HTML-017"]').inputValue(), 'Проверить наличие open shadow root у контейнера.', 'fragment annotation note should persist after reload');
    await page.locator('[data-fragment-clear="DEMO-HTML-017"]').click();
    assert.equal(await page.locator('[data-fragment-kind="DEMO-HTML-017"]').inputValue(), 'unknown', 'clear annotation should restore the default type');
    await page.keyboard.press('Escape');

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

    await page.locator('[data-tab="settings"]').click();
    await page.locator('#saveUnknown').uncheck();
    await page.locator('#retention').selectOption('90');
    await page.locator('#maxSize').selectOption('1024');
    await page.locator('#saveParserSettings').click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-tab="settings"]').click();
    assert.equal(await page.locator('#saveUnknown').isChecked(), false, 'parser settings checkbox should persist');
    assert.equal(await page.locator('#retention').inputValue(), '90', 'parser retention setting should persist');
    assert.equal(await page.locator('#maxSize').inputValue(), '1024', 'maximum HTML size setting should persist');
    await page.locator('#resetParserSettings').click();
    assert.equal(await page.locator('#saveUnknown').isChecked(), true, 'reset should restore parser setting defaults');
    assert.equal(await page.locator('#retention').inputValue(), '30', 'reset should restore default retention');
    
    await page.locator('[data-tab="collections"]').click();
    await page.locator('#newCollection').click();
    await page.locator('#taskName').fill('Browser smoke collection');
    await page.locator('#taskForm button[type="submit"]').click();
    assert.equal(await page.locator('#userCollectionGrid').getByText('Browser smoke collection').count(), 1, 'new collection should appear');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-tab="collections"]').click();
    assert.equal(await page.locator('#userCollectionGrid').getByText('Browser smoke collection').count(), 1, 'collection should persist after reload');
    const sourceBulkCollectionRow = page.locator('#userCollectionGrid .usercollection').filter({ hasText: 'Bulk created collection' });
    const originalBulkCollection = await page.evaluate(() => JSON.parse(localStorage.getItem('neon-ad-intelligence-collections') || '[]').find(item => item.name === 'Bulk created collection'));
    page.once('dialog', dialog => dialog.accept('Bulk created collection — копия'));
    await sourceBulkCollectionRow.locator('[data-collection-duplicate]').click();
    const bulkCollectionCopy = await page.evaluate(() => JSON.parse(localStorage.getItem('neon-ad-intelligence-collections') || '[]').find(item => item.name === 'Bulk created collection — копия'));
    assert.ok(bulkCollectionCopy, 'duplicate collection should be persisted');
    assert.deepEqual(bulkCollectionCopy.ids, originalBulkCollection.ids, 'duplicated collection should preserve its creative membership');
    const copyCollectionRow = page.locator('#userCollectionGrid .usercollection').filter({ hasText: 'Bulk created collection — копия' });
    const collectionDownloadPromise = page.waitForEvent('download', { timeout: 5000 }).then(download => ({ download }), error => ({ error: error.message }));
    await copyCollectionRow.locator('[data-collection-export]').click();
    await page.waitForTimeout(100);
    const collectionExportHistory = await page.evaluate(() => JSON.parse(localStorage.getItem('neon-ad-intelligence-exports') || '[]'));
    const latestCollectionExport = collectionExportHistory.find(item => item.kind === 'collection' && item.collectionName === 'Bulk created collection — копия');
    if (!latestCollectionExport) {
      const diagnostic = await page.evaluate(() => ({ buttonCount: document.querySelectorAll('[data-collection-export]').length, copyButton: document.querySelector('[data-collection-export]')?.outerHTML, pageText: document.querySelector('#userCollectionGrid')?.innerText }));
      throw new Error('Collection export action did not update local history: ' + JSON.stringify(diagnostic));
    }
    const collectionDownloadResult = await collectionDownloadPromise;
    assert.ok(collectionDownloadResult.download, 'collection export should trigger a download; result=' + JSON.stringify(collectionDownloadResult));
    assert.ok(collectionDownloadResult.download.suggestedFilename().startsWith('neon-ad-intelligence-collection-'), 'collection export should download a JSON report');
    assert.equal(latestCollectionExport.count, originalBulkCollection.ids.length, 'collection export should include all collection creatives');

    await page.locator('[data-tab="exports"]').click();
    const libraryDownloadPromise = page.waitForEvent('download');
    await page.locator('#exportNow').click();
    const download = await libraryDownloadPromise;
    assert.equal(download.suggestedFilename(), 'neon-ad-intelligence-demo.json', 'export should produce the expected JSON file');
    assert.equal(await page.locator('#exportHistoryList .job').count(), 3, 'library export should be recorded alongside selected and collection exports');
    assert.equal(await page.locator('#exportHistoryList').getByText('neon-ad-intelligence-demo.json').count(), 1, 'library export should have its own history entry');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-tab="exports"]').click();
    assert.equal(await page.locator('#exportHistoryList .job').count(), 3, 'all three export history entries should persist after reload');
    assert.equal(await page.locator('#exportHistoryList').getByText('neon-ad-intelligence-selected-demo.json').count(), 1, 'selected export entry should persist after reload');

    await page.goto('http://127.0.0.1:' + port + '/index.html', { waitUntil: 'domcontentloaded' });
    const mainNavCount = await page.locator('[data-page="ads"]').count();
    if (!mainNavCount) {
      throw new Error('main navigation item missing; url=' + page.url() + '; title=' + await page.title() + '; body=' + (await page.locator('body').innerText()).slice(0, 500));
    }
    await page.locator('[data-page="ads"]').first().click();
    assert.equal(await page.locator('#adsWorkspace a[href="./ad-intelligence.html"]').count(), 1, 'main dashboard should expose the expanded Ad Intelligence link');

    assert.deepEqual(pageErrors, [], 'no uncaught browser JavaScript errors should occur');
    console.log('PASS: saved creative persists after reload');
    console.log('PASS: saved searches can be created, applied, persisted and deleted');
    console.log('PASS: bulk selection, favorite actions, collection creation/addition and selected JSON export');
    console.log('PASS: scan search, status filters, queued/running/completed transitions and persistence');
    console.log('PASS: scan details drawer and safe HTML preview');
    console.log('PASS: unknown HTML annotation persists, exports and clears locally');
    console.log('PASS: recognized/unknown artifact filters and demo version comparison');
    console.log('PASS: scan report JSON download');
    console.log('PASS: advertiser list and filter navigation');
    console.log('PASS: alert preferences persist after reload');
    console.log('PASS: parser settings persist and reset to defaults');
    console.log('PASS: collections persist after reload');
    console.log('PASS: user collections can be duplicated and exported with their creatives');
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
