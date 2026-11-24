/**
 * jsdom smoke test for the Covered Location Form level of
 * src/features/esig-contracts.js
 *
 * The fixture is the REAL rendered markup from scene_189 / site-details
 * (captured 2026-11-24, "Mott Haven, NY" under Grant Associates), reduced
 * to the four views the feature reads.
 *
 * What it pins, and why each one could break silently:
 *   · view_514 is LABEL-TOP, so every field renders TWICE — a
 *     `.kn-label-top.field_X` carrying only the label, then a bare
 *     `.field_X` carrying the value. Taking the first match finds a cell
 *     with no `.kn-detail-body` in it at all.
 *   · the site address is <br>-separated, and textContent runs the lines
 *     together ("2417 Third Avenue6th Floor").
 *   · the company name and the signer live on OTHER views of the same
 *     scene (view_575, view_592), not on the level's own view.
 *
 * Run: node tests/esig-contracts/test-clf.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..', '..');

// label-top: label cell and value cell are separate siblings
const lt = (f, label, value) => `
  <div class="kn-label-top ${f}"><div class="kn-detail-label"><span>${label}</span></div></div>
  <div class="${f}"><div class="kn-detail-body"><span>${value}</span></div></div>`;

function fixture(opts) {
  opts = opts || {};
  const clfId = opts.clfId || '';
  const fileHref = opts.fileHref || '';
  return `
<div class="kn-scene" id="kn-scene_189">
  <div class="kn-details kn-view view_575" id="view_575">
    <div class="kn-label-none kn-table is-unbordered">
      <div class="field_208"><div class="kn-detail-body"><span><h1><strong><span>Grant Associates</span></strong></h1></span></div></div>
      <div class="field_600"><div class="kn-detail-body"><span></span></div></div>
      <div class="field_601"><div class="kn-detail-body"><span></span></div></div>
    </div>
  </div>
  <div class="kn-details kn-view view_514" id="view_514">
    <div class="kn-label-top kn-table is-unbordered">
      ${lt('field_209', 'Site Name', 'Mott Haven, NY')}
      ${lt('field_210', 'Site Address', '2417 Third Avenue<br>6th Floor, Suite 600<br>Bronx, NY 10451')}
      ${lt('field_203', 'Monthly $$', opts.monthly || '')}
      ${lt('field_604', 'Covered Location Form ID', clfId)}
      ${lt('field_605', 'Signed Covered Location Form', fileHref ? `<a href="${fileHref}">form.pdf</a>` : '')}
    </div>
  </div>
  <div class="kn-details kn-view view_592" id="view_592">
    <div class="kn-label-top kn-table is-unbordered">
      ${lt('field_238', 'Point of Contact', 'Michael Rodriguez')}
      ${lt('field_241', 'PoC Email', '<a href="mailto:michael.rodriguez@grantassociatesinc.com">michael.rodriguez@grantassociatesinc.com</a>')}
    </div>
  </div>
</div>`;
}

function run(opts) {
  const dom = new JSDOM(
    `<!doctype html><html><head></head><body>${fixture(opts)}</body></html>`,
    { runScripts: 'outside-only' }
  );
  const { window } = dom;

  const handlers = {};
  window.$ = () => ({
    off(ev) { delete handlers[ev]; return this; },
    on(ev, fn) { handlers[ev] = fn; return this; }
  });
  window.Knack = {
    application_id: '5f22c26cce3ffc001555f64b',
    views: {
      view_511: { model: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa' } },
      view_514: { model: { id: '6ace8e249ab8466850bf9702' } }
    },
    getUserAttributes: () => ({ id: 'u1', name: 'Micah Shearer', email: 'micah.shearer@getscw.com' })
  };
  window.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });

  const src = ['src/config.js', 'src/util.js', 'src/features/esig-contracts.js']
    .map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8'))
    .join('\n;\n');
  window.eval(src);

  const ev = Object.keys(handlers).find((k) => k.indexOf('knack-view-render.view_514') === 0);
  assert.ok(ev, 'the clf level should bind knack-view-render.view_514');
  handlers[ev]({}, window.Knack.views.view_514);

  return window.document;
}

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('  ✓ ' + name); }
  catch (e) { failures++; console.error('  ✗ ' + name + '\n      ' + e.message); }
}

console.log('esig-contracts — view_514 (label-top mode, site page)');

check('reads a label-top view instead of finding the label cell', () => {
  const doc = run({});
  const strip = doc.querySelector('.scw-esig[data-lvl="clf"]');
  assert.ok(strip, 'strip should be injected');
  assert.ok(!strip.querySelector('.scw-esig__miss'),
    'field_604 IS on this view — must not report it missing');
});

check('a site with no form warns, Hakimo or not', () => {
  const strip = run({}).querySelector('.scw-esig[data-lvl="clf"]');
  assert.ok(strip.querySelector('.scw-esig__warn'), 'every site needs a form');
  assert.ok(/NO COVERED LOCATION FORM/.test(strip.textContent));
  assert.ok(strip.querySelector('.scw-esig-create'));
});

check('a site with a form does not warn', () => {
  const strip = run({ clfId: 'abc' }).querySelector('.scw-esig[data-lvl="clf"]');
  assert.ok(!strip.querySelector('.scw-esig__warn'));
  assert.ok(strip.querySelector('.scw-esig__pill--pending'));
});

check('both label and value cells are hidden for the source fields', () => {
  const doc = run({ clfId: 'abc' });
  const cells = doc.querySelectorAll('#view_514 .field_604');
  assert.strictEqual(cells.length, 2, 'label-top renders the field twice');
  cells.forEach((c) => assert.strictEqual(c.style.display, 'none',
    'hiding only one leaves a heading over nothing'));
});

check('multi-line site address keeps its separators', () => {
  const doc = run({});
  doc.querySelector('.scw-esig-create').dispatchEvent(
    new doc.defaultView.MouseEvent('click', { bubbles: true })
  );
  assert.strictEqual(
    doc.querySelector('[data-k="site_address"]').value,
    '2417 Third Avenue, 6th Floor, Suite 600, Bronx, NY 10451'
  );
});

check('client name comes from the company view on the same scene', () => {
  const doc = run({});
  doc.querySelector('.scw-esig-create').dispatchEvent(
    new doc.defaultView.MouseEvent('click', { bubbles: true })
  );
  assert.strictEqual(doc.querySelector('[data-k="client_name"]').value, 'Grant Associates');
});

check('signer prefills from the PoC block', () => {
  const doc = run({});
  doc.querySelector('.scw-esig-create').dispatchEvent(
    new doc.defaultView.MouseEvent('click', { bubbles: true })
  );
  assert.strictEqual(doc.querySelector('[data-k="__signer_name"]').value, 'Michael Rodriguez');
  assert.strictEqual(
    doc.querySelector('[data-k="__signer_email"]').value,
    'michael.rodriguez@grantassociatesinc.com'
  );
});

check('fields with no source on the page fall back to their default', () => {
  const doc = run({});
  doc.querySelector('.scw-esig-create').dispatchEvent(
    new doc.defaultView.MouseEvent('click', { bubbles: true })
  );
  assert.strictEqual(doc.querySelector('[data-k="replacement_cap"]').value, '$1,400');
  assert.strictEqual(doc.querySelector('[data-k="initial_term"]').value, '12 months');
  assert.strictEqual(doc.querySelector('[data-k="billing_interval"]').value, 'Monthly, in advance');
  assert.strictEqual(doc.querySelector('[data-k="camera_count"]').value, '',
    'no source and no default stays blank for the user');
});

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
