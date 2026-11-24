/*** ESIGNATURES CONTRACTS — Remote Guarding MSA + Covered Location Form ***
 *
 * Puts the contract state for a Remote Guarding record on the record's own
 * page, and gives staff one button to create the missing document.
 *
 * Per level (see LEVELS below) the strip renders one of:
 *   · contract id on record  → "Open in eSignatures" (new tab)
 *   · signed file on record  → "Signed PDF" (new tab)
 *   · neither                → "Create …" button
 * and, when the record is a Hakimo account with no agreement on file, a
 * loud banner above the buttons.
 *
 * "Create …" opens a modal pre-filled from whatever the page already
 * knows; anything the page does not know is a blank the user fills. On
 * submit it POSTs to the level's Make webhook (Make holds the eSignatures
 * API key — never this bundle) and waits for Make's response before
 * closing. Make writes the contract id back to Knack; the view re-renders
 * so the strip flips to "Open in eSignatures".
 *
 * ── BUILDER DEPENDENCY ───────────────────────────────────────────────
 * This feature reads its state out of the rendered details view. The
 * fields below MUST be present on that view or the strip cannot tell
 * what exists and renders its "fields missing" notice instead:
 *
 *   view_511 (scene_187, object_26) needs: field_600, field_601, field_333
 *   the site details view            needs: its Contract ID / Signed CLF /
 *                                           field_334 equivalents
 *
 * They can be positioned anywhere on the view — the strip hides the raw
 * rows itself (HIDE_SOURCE_ROWS). Reading them from the DOM is deliberate:
 * it keeps the live Knack REST API key out of the browser, per Known
 * Issue #17.
 *
 * SITE LEVEL (clf) is wired but DISABLED — its view id and field keys are
 * not known yet. Fill in the `clf` entry and flip `enabled: true`.
 ***************************************************************************/
(function () {
  'use strict';

  var NS  = '.scwEsigContracts';
  var TAG = '[scw-esig-contracts]';
  var STYLE_ID = 'scw-esig-contracts-css';

  // Loud banner copy. Reworded here, not in the logic.
  var WARN_HEAD = 'HEY — GET THIS SIGNED.';

  // Inline SVGs — no icon font dependency, inherits currentColor.
  var SVG_OPEN = '<svg class="scw-esig__warn-bang" viewBox="0 0 24 24" width="17" height="17" ' +
                 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
                 'stroke-linejoin="round">';
  var ICON_WARN = SVG_OPEN +
    '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>' +
    '<line x1="12" y1="9" x2="12" y2="13"></line>' +
    '<line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
  var ICON_EXTERNAL =
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>' +
    '<polyline points="15 3 21 3 21 9"></polyline>' +
    '<line x1="10" y1="14" x2="21" y2="3"></line></svg>';
  var ICON_DOC =
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>' +
    '<polyline points="14 2 14 8 20 8"></polyline></svg>';
  var ICON_PLUS =
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" ' +
    'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
    '<line x1="12" y1="5" x2="12" y2="19"></line>' +
    '<line x1="5" y1="12" x2="19" y2="12"></line></svg>';

  var LEVELS = {
    msa: {
      enabled:   true,
      kind:      'msa',
      label:     'Master Agreement',
      viewId:    'view_511',          // scene_187 · View Company Details
      object:    'object_26',
      F_ID:      'field_600',         // MSA ID (eSignatures contract guid)
      F_FILE:    'field_601',         // Signed MSA (file)
      F_TYPE:    'field_333',         // Monitoring Type
      F_NAME:    'field_208',         // Company Name
      templateKey: 'ESIG_TEMPLATE_MSA',
      webhookKey:  'MAKE_ESIG_MSA_WEBHOOK',
      createLabel: 'Create MSA',
      openLabel:   'Open MSA in eSignatures',
      fileLabel:   'Signed MSA (PDF)',
      warnBody:    'This is a Hakimo account with no master agreement on ' +
                   'file. No site can go live until it is signed.',
      // Modal fields → eSignatures placeholder keys on the MSA template.
      // `from` names a field on the view to pre-fill from; null = blank.
      modal: [
        { key: 'client_name',           label: 'Client legal name',  from: 'field_208', required: true },
        { key: 'client_address',        label: 'Client address',     from: null,        required: true,
          hint: 'Street, city, state, ZIP — goes in the preamble.' },
        { key: 'client_notice_address', label: 'Notice address',     from: null,        required: true,
          hint: 'Section 9.6. Same as above is fine.', sameAs: 'client_address' }
      ]
    },

    clf: {
      enabled:   false,               // ← flip on once the Builder fields exist
      kind:      'clf',
      label:     'Covered Location Form',
      viewId:    '',                  // ← site details view
      object:    'object_27',
      F_ID:      '',                  // ← Contract ID field on object_27
      F_FILE:    '',                  // ← Signed CLF file field
      F_TYPE:    'field_334',         // Monitoring Type (site)
      F_NAME:    'field_209',         // Monitored Site Name
      templateKey: 'ESIG_TEMPLATE_CLF',
      webhookKey:  'MAKE_ESIG_CLF_WEBHOOK',
      createLabel: 'Create Covered Location Form',
      openLabel:   'Open CLF in eSignatures',
      fileLabel:   'Signed CLF (PDF)',
      warnBody:    'This is a Hakimo site with no Covered Location Form on ' +
                   'file. It is not under contract.',
      modal: [
        { key: 'client_name',               label: 'Client legal name',   from: null,        required: true },
        { key: 'site_address',              label: 'Site address',        from: 'field_210', required: true },
        { key: 'camera_count',              label: 'Monitored cameras',   from: 'field_226', required: true },
        { key: 'coverage_window',           label: 'Coverage window',     from: 'field_225', required: true },
        { key: 'site_profile',              label: 'Site profile',        from: null,        required: true,
          hint: 'Low traffic or High traffic.' },
        { key: 'onboarding_fee',            label: 'Onboarding fee',      from: null,        required: true },
        { key: 'monitoring_fee_per_camera', label: 'Fee per camera / mo', from: null,        required: true },
        { key: 'monthly_total',             label: 'Monthly total',       from: null,        required: true },
        { key: 'initial_term',              label: 'Initial term',        from: null,        required: true,
          hint: 'e.g. 12 months.' },
        { key: 'billing_interval',          label: 'Billing interval',    from: null,        required: true,
          hint: 'e.g. Monthly, in advance.' },
        { key: 'replacement_cap',           label: 'Replacement cap',     from: null,        required: true,
          hint: 'Section 3.4. $1,400 unless agreed otherwise.' }
      ]
    }
  };

  var HAKIMO = 'hakimo';
  var HIDE_SOURCE_ROWS = true;

  /* ── helpers ────────────────────────────────────────────────────── */

  var esc = SCW.esc;

  function detailCell(view, fieldKey) {
    if (!view || !fieldKey) return null;
    return view.querySelector('.kn-detail.' + fieldKey) ||
           view.querySelector('.' + fieldKey);
  }

  function detailBody(view, fieldKey) {
    var cell = detailCell(view, fieldKey);
    return cell ? cell.querySelector('.kn-detail-body') : null;
  }

  function readDetail(view, fieldKey) {
    var body = detailBody(view, fieldKey);
    return body ? (body.textContent || '').trim() : '';
  }

  // File fields render as an <a href> to the stored asset.
  function readDetailHref(view, fieldKey) {
    var body = detailBody(view, fieldKey);
    var a = body && body.querySelector('a[href]');
    return a ? a.getAttribute('href') : '';
  }

  function recordId(viewId) {
    try {
      var v = window.Knack && Knack.views && Knack.views[viewId];
      if (v && v.model && v.model.id) return v.model.id;
    } catch (e) { /* ignore */ }
    // Fall back to the last 24-hex segment of the URL (Knack puts the
    // record id in the scene path on a details page).
    var m = (location.hash || location.pathname).match(/([a-f0-9]{24})(?!.*[a-f0-9]{24})/);
    return m ? m[1] : '';
  }

  function cfg(key) {
    return (window.SCW && SCW.CONFIG && SCW.CONFIG[key]) || '';
  }

  function configured(url) {
    return !!url && !/PLACEHOLDER/i.test(url);
  }

  /* ── css ────────────────────────────────────────────────────────── */

  function injectCss() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '.scw-esig { margin: 14px 0 18px; max-width: 760px;',
      '  font: 13px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }',
      // ── warning ──
      '.scw-esig__warn { display: flex; gap: 11px; align-items: flex-start;',
      '  background: #fff1f2; border: 1px solid #fecdd3; border-left: 4px solid #e11d48;',
      '  border-radius: 7px; padding: 11px 14px; margin-bottom: 10px; }',
      '.scw-esig__warn-bang { flex: none; width: 17px; height: 17px; margin-top: 1px; color: #e11d48; }',
      '.scw-esig__warn-head { font-size: 13px; font-weight: 700; color: #9f1239;',
      '  letter-spacing: .02em; margin-bottom: 2px; }',
      '.scw-esig__warn-body { color: #9f1239; font-size: 12.5px; opacity: .85; }',
      // ── card ──
      '.scw-esig__card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;',
      '  overflow: hidden; box-shadow: 0 1px 2px rgba(15,23,42,.04); }',
      '.scw-esig__head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap;',
      '  padding: 9px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }',
      '.scw-esig__title { font-size: 11px; font-weight: 700; letter-spacing: .07em;',
      '  text-transform: uppercase; color: #475569; }',
      '.scw-esig__spacer { flex: 1 1 auto; }',
      // status pill
      '.scw-esig__pill { display: inline-flex; align-items: center; gap: 6px;',
      '  padding: 3px 9px 3px 7px; border-radius: 999px; font-size: 11.5px; font-weight: 600;',
      '  border: 1px solid transparent; white-space: nowrap; }',
      '.scw-esig__dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }',
      '.scw-esig__pill--missing { background: #fff1f2; color: #be123c; border-color: #fecdd3; }',
      '.scw-esig__pill--pending { background: #fffbeb; color: #b45309; border-color: #fde68a; }',
      '.scw-esig__pill--signed  { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }',
      // monitoring-type chip
      '.scw-esig__chip { display: inline-flex; align-items: center; padding: 3px 9px;',
      '  border-radius: 999px; font-size: 11.5px; font-weight: 600; color: #334155;',
      '  background: #eef2f6; border: 1px solid #e2e8f0; white-space: nowrap; }',
      // body + buttons
      '.scw-esig__body { display: flex; gap: 8px; align-items: center; flex-wrap: wrap;',
      '  padding: 11px 14px; }',
      '.scw-esig__btn { display: inline-flex; align-items: center; gap: 7px;',
      '  padding: 7px 14px; border-radius: 6px; border: 1px solid #0f4c75;',
      '  background: #0f4c75; color: #fff !important; font-weight: 600;',
      '  font-size: 12.5px; line-height: 1.2; cursor: pointer;',
      '  text-decoration: none !important; transition: background .12s ease; }',
      '.scw-esig__btn:hover { background: #0d3f61; color: #fff !important; }',
      '.scw-esig__btn:focus-visible { outline: 2px solid #0f4c75; outline-offset: 2px; }',
      '.scw-esig__btn--ghost { background: #fff; color: #0f4c75 !important; }',
      '.scw-esig__btn--ghost:hover { background: #eff6ff; color: #0f4c75 !important; }',
      '.scw-esig__btn svg { flex: none; }',
      '.scw-esig__note { color: #64748b; font-size: 12px; }',
      '.scw-esig__miss { background: #fffbeb; border: 1px solid #fde68a;',
      '  border-left: 4px solid #f59e0b; border-radius: 7px; padding: 11px 14px;',
      '  color: #92400e; font-size: 12.5px; }',
      // modal
      '.scw-esig-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,.55);',
      '  z-index: 100000; display: flex; align-items: center; justify-content: center; padding: 18px; }',
      '.scw-esig-modal { background: #fff; color: #0f172a; border-radius: 10px; width: 100%;',
      '  max-width: 520px; max-height: 90vh; overflow: auto;',
      '  box-shadow: 0 20px 50px rgba(0,0,0,.35);',
      '  font: 13px/1.45 system-ui, -apple-system, sans-serif; }',
      '.scw-esig-modal__head { padding: 12px 16px; background: #0f4c75; color: #fff;',
      '  font-weight: 700; font-size: 13.5px; position: sticky; top: 0; }',
      '.scw-esig-modal__body { padding: 14px 16px; }',
      '.scw-esig-modal__intro { margin: 0 0 12px; color: #475569; font-size: 12.5px; }',
      '.scw-esig-f { margin-bottom: 11px; }',
      '.scw-esig-f__lab { display: block; font-weight: 600; font-size: 12px;',
      '  color: #334155; margin-bottom: 3px; }',
      '.scw-esig-f__lab span { font-weight: 400; color: #94a3b8; }',
      '.scw-esig-f input { width: 100%; box-sizing: border-box; padding: 7px 9px;',
      '  border: 1px solid #cbd5e1; border-radius: 5px; font-size: 13px; }',
      '.scw-esig-f input:focus { outline: none; border-color: #0f4c75;',
      '  box-shadow: 0 0 0 2px rgba(15,76,117,.15); }',
      '.scw-esig-f__hint { color: #64748b; font-size: 11.5px; margin-top: 3px; }',
      '.scw-esig-f--prefilled input { background: #f8fafc; }',
      '.scw-esig-modal__sub { margin: 16px 0 8px; font-weight: 700; font-size: 12px;',
      '  text-transform: uppercase; letter-spacing: .4px; color: #475569;',
      '  border-top: 1px solid #e2e8f0; padding-top: 12px; }',
      '.scw-esig-modal__err { color: #b91c1c; font-weight: 600; margin: 8px 0 0; }',
      '.scw-esig-modal__status { color: #0f4c75; font-weight: 600; margin: 8px 0 0; }',
      '.scw-esig-modal__foot { display: flex; justify-content: flex-end; gap: 8px;',
      '  padding: 12px 16px; border-top: 1px solid #e2e8f0; background: #f8fafc; }',
      '.scw-esig-modal__foot button { padding: 7px 16px; border-radius: 6px;',
      '  font-weight: 600; font-size: 12.5px; cursor: pointer; }',
      '.scw-esig-cancel { background: #fff; border: 1px solid #cbd5e1; color: #334155; }',
      '.scw-esig-ok { background: #0f4c75; border: 1px solid #0f4c75; color: #fff; }',
      '.scw-esig-ok[disabled] { opacity: .55; cursor: default; }'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ── modal ──────────────────────────────────────────────────────── */

  function openModal(level, state) {
    injectCss();

    var rows = level.modal.map(function (f) {
      var pre = state.prefill[f.key] || '';
      return '<div class="scw-esig-f' + (pre ? ' scw-esig-f--prefilled' : '') + '">' +
               '<label class="scw-esig-f__lab" for="scw-esig-' + esc(f.key) + '">' +
                 esc(f.label) + (f.required ? '' : ' <span>(optional)</span>') +
               '</label>' +
               '<input id="scw-esig-' + esc(f.key) + '" data-k="' + esc(f.key) + '" ' +
                 'type="text" value="' + esc(pre) + '">' +
               (f.hint ? '<div class="scw-esig-f__hint">' + esc(f.hint) + '</div>' : '') +
             '</div>';
    }).join('');

    var backdrop = document.createElement('div');
    backdrop.className = 'scw-esig-backdrop';
    backdrop.innerHTML =
      '<div class="scw-esig-modal" role="dialog" aria-modal="true">' +
        '<div class="scw-esig-modal__head">' + esc(level.createLabel) + '</div>' +
        '<div class="scw-esig-modal__body">' +
          '<p class="scw-esig-modal__intro">Anything already on this page is ' +
            'filled in. Check it, complete the rest, and this goes out for ' +
            'signature — you sign first, then the client.</p>' +
          rows +
          '<div class="scw-esig-modal__sub">Client signer</div>' +
          '<div class="scw-esig-f">' +
            '<label class="scw-esig-f__lab" for="scw-esig-signer-name">Signer name</label>' +
            '<input id="scw-esig-signer-name" data-k="__signer_name" type="text">' +
          '</div>' +
          '<div class="scw-esig-f">' +
            '<label class="scw-esig-f__lab" for="scw-esig-signer-email">Signer email</label>' +
            '<input id="scw-esig-signer-email" data-k="__signer_email" type="email">' +
          '</div>' +
          '<div class="scw-esig-modal__err" hidden></div>' +
          '<div class="scw-esig-modal__status" hidden></div>' +
        '</div>' +
        '<div class="scw-esig-modal__foot">' +
          '<button type="button" class="scw-esig-cancel">Cancel</button>' +
          '<button type="button" class="scw-esig-ok">Send for signature</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(backdrop);

    var $err    = backdrop.querySelector('.scw-esig-modal__err');
    var $status = backdrop.querySelector('.scw-esig-modal__status');
    var $ok     = backdrop.querySelector('.scw-esig-ok');

    function close() {
      backdrop.remove();
      document.removeEventListener('keydown', onKey, true);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey, true);

    backdrop.querySelector('.scw-esig-cancel').addEventListener('click', close);
    backdrop.addEventListener('mousedown', function (e) {
      if (e.target === backdrop) close();
    });

    // "Notice address" mirrors the client address until it is edited.
    var mirrorDirty = false;
    level.modal.forEach(function (f) {
      if (!f.sameAs) return;
      var tgt = backdrop.querySelector('[data-k="' + f.key + '"]');
      var src = backdrop.querySelector('[data-k="' + f.sameAs + '"]');
      if (!tgt || !src) return;
      tgt.addEventListener('input', function () { mirrorDirty = true; });
      src.addEventListener('input', function () {
        if (!mirrorDirty && !tgt.value.trim()) return;
        if (!mirrorDirty) tgt.value = src.value;
      });
      src.addEventListener('blur', function () {
        if (!mirrorDirty && !tgt.value.trim()) tgt.value = src.value;
      });
    });

    $ok.addEventListener('click', function () {
      $err.hidden = true;

      var placeholders = {};
      var missing = [];
      level.modal.forEach(function (f) {
        var el = backdrop.querySelector('[data-k="' + f.key + '"]');
        var v  = el ? el.value.trim() : '';
        if (f.required && !v) missing.push(f.label);
        placeholders[f.key] = v;
      });

      var signer = {
        name:  (backdrop.querySelector('[data-k="__signer_name"]').value || '').trim(),
        email: (backdrop.querySelector('[data-k="__signer_email"]').value || '').trim()
      };
      if (!signer.name)  missing.push('Signer name');
      if (!signer.email) missing.push('Signer email');
      if (signer.email && signer.email.indexOf('@') < 1) missing.push('a valid signer email');

      if (missing.length) {
        $err.textContent = 'Still needed: ' + missing.join(', ') + '.';
        $err.hidden = false;
        return;
      }

      var url = cfg(level.webhookKey);
      if (!configured(url)) {
        $err.textContent = 'Webhook not configured yet (SCW.CONFIG.' +
                           level.webhookKey + '). Nothing was sent.';
        $err.hidden = false;
        console.warn(TAG, 'webhook URL not configured for', level.kind);
        return;
      }

      var payload = {
        kind:          level.kind,
        templateId:    cfg(level.templateKey),
        knackObject:   level.object,
        knackRecordId: state.recordId,
        viewId:        level.viewId,
        placeholders:  placeholders,
        signer:        signer,
        triggeredBy:   SCW.currentUser()
      };

      $ok.disabled = true;
      $status.textContent = 'Sending…';
      $status.hidden = false;
      SCW.log(TAG, 'firing webhook', payload);

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (resp) {
        return resp.json().catch(function () { return { success: resp.ok }; });
      }).then(function (data) {
        if (data && data.success === false) {
          $status.hidden = true;
          $err.textContent = data.error || 'Make reported a failure.';
          $err.hidden = false;
          $ok.disabled = false;
          return;
        }
        $status.textContent = 'Sent. Refreshing…';
        close();
        refreshView(level.viewId);
      }).catch(function (e) {
        // A Make timeout still usually means the scenario ran.
        console.warn(TAG, 'webhook error', e);
        $status.hidden = true;
        $err.textContent = 'Could not reach Make. Check the scenario before resending.';
        $err.hidden = false;
        $ok.disabled = false;
      });
    });

    var first = backdrop.querySelector('input');
    if (first) first.focus();
    return { close: close, backdrop: backdrop };
  }

  // Make writes the contract id back asynchronously, so re-pull the view
  // a couple of times rather than once.
  function refreshView(viewId) {
    function pull() {
      try {
        var v = window.Knack && Knack.views && Knack.views[viewId];
        if (v && v.model && v.model.fetch) v.model.fetch();
        else if (v && v.render) v.render();
      } catch (e) { /* ignore */ }
    }
    setTimeout(pull, 2500);
    setTimeout(pull, 7000);
  }

  /* ── strip ──────────────────────────────────────────────────────── */

  function render(level) {
    var view = document.getElementById(level.viewId);
    if (!view) return;

    injectCss();

    var old = view.parentNode.querySelector('.scw-esig[data-lvl="' + level.kind + '"]');
    if (old) old.remove();

    var wrap = document.createElement('div');
    wrap.className = 'scw-esig';
    wrap.setAttribute('data-lvl', level.kind);

    // The Builder dependency: without the id field on the view we cannot
    // tell "no contract" from "field not rendered", so say so instead of
    // offering a button that might duplicate a live contract.
    if (!detailCell(view, level.F_ID)) {
      wrap.innerHTML =
        '<div class="scw-esig__miss"><strong>' + esc(level.label) + ' status unavailable.</strong> ' +
        'Add ' + esc(level.F_ID) + (level.F_FILE ? ', ' + esc(level.F_FILE) : '') +
        ' and ' + esc(level.F_TYPE) + ' to ' + esc(level.viewId) +
        ' in the Knack Builder and this panel will light up.</div>';
      view.parentNode.insertBefore(wrap, view.nextSibling);
      return;
    }

    var contractId = readDetail(view, level.F_ID);
    var fileHref   = readDetailHref(view, level.F_FILE);
    var type       = readDetail(view, level.F_TYPE);
    var name       = readDetail(view, level.F_NAME);
    var isHakimo   = type.toLowerCase().indexOf(HAKIMO) !== -1;
    var hasAny     = !!(contractId || fileHref);

    // State drives the pill, not the button list — one source of truth.
    var state = fileHref   ? { key: 'signed',  label: 'Signed' }
              : contractId ? { key: 'pending', label: 'Out for signature' }
                           : { key: 'missing', label: 'Not signed' };

    var html = '';

    if (isHakimo && !hasAny) {
      html +=
        '<div class="scw-esig__warn">' +
          ICON_WARN +
          '<div>' +
            '<div class="scw-esig__warn-head">' + esc(WARN_HEAD) + '</div>' +
            '<div class="scw-esig__warn-body">' + esc(level.warnBody) + '</div>' +
          '</div>' +
        '</div>';
    }

    var btns = [];
    if (contractId) {
      btns.push('<a class="scw-esig__btn" target="_blank" rel="noopener" href="' +
                esc(cfg('ESIG_CONTRACT_URL_BASE') + contractId) + '">' +
                ICON_EXTERNAL + esc(level.openLabel) + '</a>');
    }
    if (fileHref) {
      btns.push('<a class="scw-esig__btn scw-esig__btn--ghost" target="_blank" rel="noopener" href="' +
                esc(fileHref) + '">' + ICON_DOC + esc(level.fileLabel) + '</a>');
    }
    if (!hasAny) {
      btns.push('<button type="button" class="scw-esig__btn scw-esig-create">' +
                ICON_PLUS + esc(level.createLabel) + '</button>');
    }
    if (contractId && !fileHref) {
      btns.push('<span class="scw-esig__note">Waiting on signatures — no signed PDF on record yet.</span>');
    }

    html +=
      '<div class="scw-esig__card">' +
        '<div class="scw-esig__head">' +
          '<span class="scw-esig__title">' + esc(level.label) + '</span>' +
          '<span class="scw-esig__pill scw-esig__pill--' + state.key + '">' +
            '<span class="scw-esig__dot"></span>' + esc(state.label) +
          '</span>' +
          '<span class="scw-esig__spacer"></span>' +
          // The monitoring type renders on this view as a bare, unlabelled
          // line. Surfacing it here as a chip is why the raw row is hidden
          // below — otherwise the value reads as orphaned text.
          (type ? '<span class="scw-esig__chip">' + esc(type) + '</span>' : '') +
        '</div>' +
        '<div class="scw-esig__body">' + btns.join('') + '</div>' +
      '</div>';

    wrap.innerHTML = html;
    view.parentNode.insertBefore(wrap, view.nextSibling);

    if (HIDE_SOURCE_ROWS) {
      [level.F_ID, level.F_FILE, level.F_TYPE].forEach(function (fk) {
        var cell = detailCell(view, fk);
        if (cell) cell.style.display = 'none';
      });
    }

    var createBtn = wrap.querySelector('.scw-esig-create');
    if (createBtn) {
      createBtn.addEventListener('click', function () {
        var prefill = {};
        level.modal.forEach(function (f) {
          if (f.from) prefill[f.key] = readDetail(view, f.from);
        });
        // The MSA names the client; the CLF names the site's client.
        if (!prefill.client_name && name) prefill.client_name = name;
        openModal(level, { prefill: prefill, recordId: recordId(level.viewId) });
      });
    }
  }

  /* ── bind ───────────────────────────────────────────────────────── */

  // Wrong-app guard: view/field ids are per-application, so binding
  // these in any app but SCW Shield would write to unrelated records.
  if (!SCW.appOk()) return;

  Object.keys(LEVELS).forEach(function (k) {
    var level = LEVELS[k];
    if (!level.enabled) return;
    if (!level.viewId) {
      console.warn(TAG, 'level "' + k + '" enabled but has no viewId — skipping');
      return;
    }
    SCW.onViewRender(level.viewId, function () { render(level); }, NS + k);
  });

  SCW.log(TAG, 'module loaded');
})();
