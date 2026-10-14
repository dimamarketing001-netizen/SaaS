#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const root = process.cwd();
const main = fs.readFileSync(root + '/index.html', 'utf8');
const ads = fs.readFileSync(root + '/ad-intelligence.html', 'utf8');

function inlineScriptsCompile(html, name) {
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1])
    .filter(source => source.trim());

  assert.ok(scripts.length > 0, name + ': expected at least one inline script');
  scripts.forEach((source, index) => {
    assert.doesNotThrow(
      () => new vm.Script(source, { filename: name + ':inline-script-' + index }),
      name + ': inline script ' + index + ' must parse'
    );
  });
  return scripts.length;
}

const mainScripts = inlineScriptsCompile(main, 'index.html');
const adScripts = inlineScriptsCompile(ads, 'ad-intelligence.html');

assert.ok(
  main.includes('href="./ad-intelligence.html"'),
  'main dashboard must link to the expanded Ad Intelligence workspace'
);

const dateLine = ads.split('\n').find(line => line.includes('function parseDemoDate(value)'));
assert.ok(dateLine, 'date parser must exist');
const parseDemoDate = new Function(dateLine + '\nreturn parseDemoDate;')();
for (const [input, expected] of [
  ['12 окт 2026', '2026-10-12'],
  ['11 окт 2026', '2026-10-11'],
  ['9 окт 2026', '2026-10-09']
]) {
  const date = parseDemoDate(input);
  assert.ok(date instanceof Date && !Number.isNaN(date.getTime()), 'date must parse: ' + input);
  assert.equal(date.toISOString().slice(0, 10), expected, 'parsed date must match: ' + input);
}
assert.equal(parseDemoDate('not a date'), null, 'invalid date must return null');

for (const marker of [
  'function loadUserCollections()',
  'function persistUserCollections()',
  "localStorage.getItem('neon-ad-intelligence-collections')",
  "localStorage.setItem('neon-ad-intelligence-collections'",
  'userCollections.push(col);persistUserCollections();',
  'col.name=name;persistUserCollections();',
  'userCollections=userCollections.filter(x=>x.id!==col.id);persistUserCollections();',
  'col.ids=col.ids.filter(id=>id!==creativeId);persistUserCollections();',
  'col.ids.push(currentCard.dataset.id);persistUserCollections();'
]) {
  assert.ok(ads.includes(marker), 'collection persistence hook missing: ' + marker);
}

console.log('PASS: inline JavaScript parses (' + mainScripts + ' main, ' + adScripts + ' Ad Intelligence)');
console.log('PASS: main dashboard links to expanded Ad Intelligence');
console.log('PASS: Russian date parsing and invalid-date handling');
console.log('PASS: collection persistence hooks cover create, rename, delete, add and remove');
for (const tab of ['advertisers', 'alerts', 'exports']) {
  assert.ok(ads.includes('data-tab="' + tab + '"'), 'missing navigation tab: ' + tab);
  assert.ok(ads.includes('data-panel="' + tab + '"'), 'missing panel for navigation tab: ' + tab);
}
for (const marker of ['function renderAdvertisers()', 'function saveAlertSettings()', 'function renderExportHistory()', "localStorage.setItem('neon-ad-intelligence-exports'", "localStorage.setItem('neon-ad-intelligence-alerts'"]) {
  assert.ok(ads.includes(marker), 'new workspace feature missing: ' + marker);
}
for (const [name, html] of [['index.html', main], ['ad-intelligence.html', ads]]) {
  assert.doesNotMatch(html, /(?<!\$)\$\([^)]*\)\.(?:length|forEach|map|filter|reduce|some|every)\(/, name + ': querySelector helper must not be used as a collection');
}
console.log('PASS: selector helpers distinguish single elements from collections');
console.log('PASS: advertiser, alert and export-history panels are wired');
console.log('NOTE: these are static/syntax smoke tests, not full browser or backend integration tests.');
