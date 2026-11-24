/*** PAGE POLISH — typography, spacing and tables on Remote Monitoring ***
 *
 * Knack's stock rendering on these scenes is functional and ugly: the
 * record title and its "edit" link stack as two left-aligned blocks, the
 * page has no measure so a 400px card and a 950px table start at the same
 * x and end nowhere near each other, and grids are flat rules with 4px of
 * padding and a bare "No data" cell.
 *
 * This is almost entirely CSS, scoped per scene. The one DOM-level change
 * is making the label-none details block a flex row, which puts the title
 * and its action link on the same line without moving any node — so
 * Knack's re-render after an inline edit cannot undo it.
 *
 * SCOPING: every rule is prefixed with the scene id from SCENES, so
 * nothing here can leak onto a scene that has not opted in. Add a scene
 * to the list to adopt it; there is no global styling in this file by
 * design — Knack shares markup classes across every view in the app.
 ************************************************************************/
(function () {
  'use strict';

  if (!SCW.appOk()) return;

  var NS  = '.scwPagePolish';
  var TAG = '[scw-page-polish]';
  var STYLE_ID = 'scw-page-polish-css';

  var SCENES = [
    'scene_187'   // Remote Monitoring → View Company Details
  ];

  // Page measure. Knack's own container is full-bleed, which is why a
  // narrow card and a wide table never line up.
  var MAX_WIDTH = '1080px';

  function rules(scene) {
    var S = '#kn-' + scene;
    return [
      // ── page measure ──
      S + ' { max-width: ' + MAX_WIDTH + '; margin: 0 auto; padding: 4px 16px 48px; }',
      S + ' .view-group { margin-bottom: 0; }',

      // ── record title + its action link on one line ──
      // The hidden field rows (the strip owns them) drop out of flex, so
      // this collapses to exactly: title, edit.
      S + ' #view_511 .kn-label-none { display: flex; align-items: center;',
      '  gap: 14px; flex-wrap: wrap; }',
      S + ' #view_511 .kn-detail-body { padding: 0 !important; }',
      S + ' #view_511 h2 { margin: 0; font-size: 23px; font-weight: 700;',
      '  letter-spacing: -.015em; color: #0f172a; line-height: 1.2; }',
      S + ' #view_511 .kn-details-link { margin: 0; }',
      S + ' #view_511 .kn-details-link a { display: inline-flex; align-items: center;',
      '  padding: 3px 10px; border: 1px solid #cbd5e1; border-radius: 5px;',
      '  background: #fff; color: #475569 !important; font-size: 11.5px;',
      '  font-weight: 600; text-transform: capitalize;',
      '  text-decoration: none !important; line-height: 1.6; }',
      S + ' #view_511 .kn-details-link a:hover { background: #f1f5f9;',
      '  border-color: #94a3b8; color: #0f172a !important; }',

      // ── section headings ──
      S + ' .kn-title { font-size: 13px; font-weight: 700; letter-spacing: .06em;',
      '  text-transform: uppercase; color: #475569; margin: 0 0 10px; }',
      S + ' .view-header { margin-bottom: 0; }',

      // ── the "Add Site" menu button ──
      S + ' #view_515 { margin: 0 0 22px; }',
      S + ' #view_515 .knMenuLink { border-radius: 6px !important; font-weight: 600;',
      '  font-size: 12.5px; padding: 8px 15px; }',

      // ── tables ──
      S + ' .kn-table-wrapper { border: 1px solid #e2e8f0; border-radius: 8px;',
      '  overflow: hidden; box-shadow: 0 1px 2px rgba(15,23,42,.04); background: #fff; }',
      S + ' table.kn-table { border: 0 !important; margin: 0; width: 100%; }',
      S + ' table.kn-table thead th { background: #f8fafc !important;',
      '  border-bottom: 1px solid #e2e8f0 !important; border-top: 0 !important;',
      '  border-left: 0 !important; border-right: 0 !important;',
      '  padding: 9px 12px !important; font-size: 11px; font-weight: 700;',
      '  letter-spacing: .05em; text-transform: uppercase; color: #64748b;',
      '  white-space: nowrap; }',
      S + ' table.kn-table thead th a { color: #64748b !important;',
      '  text-decoration: none !important; }',
      S + ' table.kn-table thead th a:hover { color: #0f172a !important; }',
      S + ' table.kn-table tbody td { padding: 10px 12px !important;',
      '  border-left: 0 !important; border-right: 0 !important;',
      '  border-top: 0 !important; border-bottom: 1px solid #f1f5f9 !important;',
      '  font-size: 12.5px; color: #1e293b; vertical-align: middle; }',
      S + ' table.kn-table tbody tr:last-child td { border-bottom: 0 !important; }',
      S + ' table.kn-table tbody tr { background: #fff !important; }',
      S + ' table.kn-table tbody tr:hover { background: #f8fafc !important; }',
      // Knack's striping fights the hover; the hairline rules carry the rows.
      S + ' table.kn-table.is-striped tbody tr:nth-child(even) { background: #fff !important; }',

      // ── empty state ──
      // Knack renders a lone "No data" cell. Centre it and give it air so
      // it reads as a state rather than a broken row.
      S + ' .scw-pp-empty td { text-align: center !important; padding: 26px 12px !important;',
      '  color: #94a3b8 !important; font-size: 12.5px; font-style: italic; }',

      // ── records nav (filters, counts, paging) ──
      S + ' .kn-records-nav { margin-bottom: 10px; }',
      S + ' .kn-entries-summary { font-size: 12px; color: #64748b; }',
      S + ' .kn-add-filter { border-radius: 5px !important; font-size: 11.5px !important;',
      '  font-weight: 600; border: 1px solid #cbd5e1 !important; color: #475569 !important; }',

      // ── back link ──
      S + ' .kn-back-link { margin-top: 26px; }',
      S + ' .kn-back-link a { font-size: 12.5px; color: #475569 !important;',
      '  text-decoration: none !important; }',
      S + ' .kn-back-link a:hover { color: #0f172a !important; text-decoration: underline !important; }'
    ].join('\n');
  }

  function injectCss() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = SCENES.map(rules).join('\n');
    document.head.appendChild(s);
  }

  // Knack gives the "No data" row no class of its own, so tag it. Runs on
  // every scene render and is idempotent.
  function markEmptyRows(scene) {
    var root = document.getElementById('kn-' + scene);
    if (!root) return;
    var rows = root.querySelectorAll('table.kn-table tbody tr');
    for (var i = 0; i < rows.length; i++) {
      var cells = rows[i].children;
      if (cells.length === 1 && /^\s*no data\s*$/i.test(rows[i].textContent || '')) {
        rows[i].classList.add('scw-pp-empty');
      }
    }
  }

  SCENES.forEach(function (scene) {
    SCW.onSceneRender(scene, function () {
      injectCss();
      markEmptyRows(scene);
    }, NS);
  });

  SCW.log(TAG, 'module loaded for', SCENES.join(', '));
})();
