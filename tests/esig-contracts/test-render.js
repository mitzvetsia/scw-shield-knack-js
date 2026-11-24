/**
 * jsdom smoke test for src/features/esig-contracts.js
 *
 * The DOM fixture below is the REAL rendered markup from
 * scene_187 / view_511 (captured 2026-11-24, company "Grant Associates").
 *
 * The important thing it pins: view_511 renders in Knack's LABEL-NONE
 * mode, so fields come out as `<div class="field_600">` with NO
 * `kn-detail` class. A selector that only looks for `.kn-detail.field_600`
 * finds nothing on this view. detailCell() must keep its bare-class
 * fallback.
 *
 * Run: node tests/esig-contracts/test-render.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..', '..');

// ── Fixture: the real view_511 markup, label-none mode ────────────
function fixture(opts) {
  opts = opts || {};
  const msaId = opts.msaId || '';
  const fileHref = opts.fileHref || '';
  const type = opts.type == null ? 'Hakimo' : opts.type;
  return `
<div class="view-column view-column-group-1">
  <div class="kn-details kn-view view_511" id="view_511">
    <section class="columns"><div class="kn-details-column first column is-horizontal">
      <div class="kn-details-group column-1 columns"><div class="kn-details-group-column column">
        <div class="kn-label-none kn-table is-unbordered">
          <div class="field_208"><div class="kn-detail-body"><span><h2><strong><span>Grant Associates</span></strong></h2></span></div></div>
          <div class="field_601"><div class="kn-detail-body"><span>${
            fileHref ? `<a href="${fileHref}">Signed_MSA.pdf</a>` : ''
          }</span></div></div>
          <div class="field_600"><div class="kn-detail-body"><span>${msaId}</span></div></div>
          <div class="field_333"><div class="kn-detail-body"><span><span>${type}</span></span></div></div>
        </div>
      </div></div>
    </div></section>
  </div>
  <div class="kn-menu kn-view view_515" id="view_515"></div>
</div>`;
}

// ── Harness ───────────────────────────────────────────────────────
function run(opts) {
  const dom = new JSDOM(
    `<!doctype html><html><head></head><body>${fixture(opts)}</body></html>`,
    { runScripts: 'outside-only' }
  );
  const { window } = dom;

  // Minimal jQuery stand-in: the module only uses $(document).off().on()
  // through SCW.onViewRender, plus Knack globals.
  const handlers = {};
  function $(sel) {
    return {
      off(ev) { delete handlers[ev]; return this; },
      on(ev, fn) { handlers[ev] = fn; return this; },
      trigger(ev, args) { if (handlers[ev]) handlers[ev].apply(null, [{}].concat(args || [])); }
    };
  }
  window.$ = $;
  window.Knack = {
    application_id: '5f22c26cce3ffc001555f64b',   // SCW Shield
    views: { view_511: { model: { id: '6ace8d99cff43cc0b0f94213' } } },
    getUserAttributes: () => ({ id: 'u1', name: 'Micah Shearer', email: 'micah.shearer@getscw.com' })
  };
  window.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });

  const src = ['src/config.js', 'src/util.js', 'src/features/esig-contracts.js']
    .map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8'))
    .join('\n;\n');
  window.eval(src);

  // Fire the view render the way Knack would.
  const ev = Object.keys(handlers).find((k) => k.indexOf('knack-view-render.view_511') === 0);
  assert.ok(ev, 'module should bind knack-view-render.view_511');
  handlers[ev]({}, window.Knack.views.view_511);

  return window.document;
}

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('  ✓ ' + name); }
  catch (e) { failures++; console.error('  ✗ ' + name + '\n      ' + e.message); }
}

console.log('esig-contracts — view_511 (label-none mode)');

check('empty Hakimo company → warning banner + Create button', () => {
  const doc = run({ msaId: '', fileHref: '', type: 'Hakimo' });
  const strip = doc.querySelector('.scw-esig[data-lvl="msa"]');
  assert.ok(strip, 'strip should be injected');
  assert.ok(!strip.querySelector('.scw-esig__miss'), 'should NOT report fields missing');
  assert.ok(strip.querySelector('.scw-esig__warn'), 'Hakimo + no MSA should warn');
  assert.ok(strip.querySelector('.scw-esig-create'), 'should offer Create MSA');
});

check('strip lands directly after the view', () => {
  const doc = run({});
  const view = doc.getElementById('view_511');
  assert.strictEqual(view.nextElementSibling.className, 'scw-esig');
});

check('contract id present → Open link, no Create button', () => {
  const doc = run({ msaId: 'abc12345-0000-1111-2222-333344445555' });
  const strip = doc.querySelector('.scw-esig');
  const open = strip.querySelector('a.scw-esig__btn');
  assert.ok(open, 'should render an open link');
  assert.ok(/abc12345/.test(open.getAttribute('href')), 'link should carry the contract id');
  assert.ok(!strip.querySelector('.scw-esig-create'), 'should not offer Create when one exists');
  assert.ok(!strip.querySelector('.scw-esig__warn'), 'no warning once a contract exists');
});

check('signed file present → PDF link, no warning', () => {
  const doc = run({ fileHref: 'https://example.com/Signed_MSA.pdf' });
  const strip = doc.querySelector('.scw-esig');
  assert.ok(!strip.querySelector('.scw-esig__warn'), 'file on record counts as on file');
  assert.ok(!strip.querySelector('.scw-esig-create'), 'should not offer Create');
});

check('non-Hakimo company with nothing on file → Create, but no warning', () => {
  const doc = run({ type: 'Global Guardian' });
  const strip = doc.querySelector('.scw-esig');
  assert.ok(strip.querySelector('.scw-esig-create'), 'Create is always available');
  assert.ok(!strip.querySelector('.scw-esig__warn'), 'only Hakimo accounts yell');
});

check('source rows for id + file are hidden', () => {
  const doc = run({ msaId: 'x' });
  assert.strictEqual(doc.querySelector('.field_600').style.display, 'none');
  assert.strictEqual(doc.querySelector('.field_601').style.display, 'none');
});

check('Create modal opens prefilled from the page', () => {
  const doc = run({});
  doc.querySelector('.scw-esig-create').dispatchEvent(
    new doc.defaultView.MouseEvent('click', { bubbles: true })
  );
  const modal = doc.querySelector('.scw-esig-backdrop');
  assert.ok(modal, 'modal should open');
  assert.strictEqual(
    modal.querySelector('[data-k="client_name"]').value,
    'Grant Associates',
    'client_name should prefill from field_208'
  );
  assert.strictEqual(modal.querySelector('[data-k="client_address"]').value, '',
    'client_address has no source on object_26 — stays blank for the user');
});

check('wrong app id → every feature stands down', () => {
  const dom = new JSDOM('<!doctype html><html><body>' + fixture({}) + '</body></html>',
    { runScripts: 'outside-only' });
  const { window } = dom;
  const handlers = {};
  window.$ = () => ({ off() { return this; }, on(ev, fn) { handlers[ev] = fn; return this; } });
  window.Knack = { application_id: 'DIFFERENT_APP', views: {}, getUserAttributes: () => ({}) };
  const src = ['src/config.js', 'src/util.js', 'src/features/esig-contracts.js']
    .map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n');
  window.eval(src);
  assert.strictEqual(Object.keys(handlers).length, 0, 'should bind nothing in the wrong app');
});

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
