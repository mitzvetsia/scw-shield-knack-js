// src/config.js — SCW Shield custom JS
//
// ⚠️ APP GUARD. This bundle is for the SCW Shield Knack application
// ONLY (scwinstallation.knack.com/scw-shield). Knack allocates
// view_/scene_/field_/object_ ids PER APPLICATION, so the ids every
// feature here binds to mean something entirely different in the
// installation-services app — which has its own bundle,
// github.com/mitzvetsia/scw-knack-custom-js. Loading either bundle
// into the other app silently binds features to the wrong views and
// writes to the wrong fields.
//
// SCW.appOk() below is that guard. Every feature calls it before
// binding; if the app id does not match it logs once and stands down.
window.SCW = window.SCW || {};

// Knack's loader (main.js) warns if window.SCW.init is missing. We
// don't use it — each feature initializes itself via its IIFE — so
// expose a no-op purely to silence the console noise.
if (typeof window.SCW.init !== 'function') {
  window.SCW.init = function () { /* no-op */ };
}

window.SCW.APP_ID = '5f22c26cce3ffc001555f64b';  // SCW Shield

(function (namespace) {
  var warned = false;
  // Returns true only when this bundle is running in SCW Shield.
  // Fails OPEN when Knack hasn't populated application_id yet (very
  // early boot) so a genuine Shield page is never blocked; fails
  // CLOSED, loudly and once, on a real mismatch.
  namespace.appOk = function appOk() {
    var id = '';
    try { id = (window.Knack && Knack.application_id) || ''; } catch (e) { /* ignore */ }
    if (!id) return true;
    if (id === namespace.APP_ID) return true;
    if (!warned) {
      warned = true;
      console.error(
        '[SCW Shield] WRONG APP. This bundle is for SCW Shield (' +
        namespace.APP_ID + ') but is loaded in application ' + id +
        '. Every feature has stood down. Remove this <script> from ' +
        'that app\'s Builder — its view and field ids do not match.'
      );
    }
    return false;
  };
})(window.SCW);

window.SCW.CONFIG = window.SCW.CONFIG || {
  VERSION: 'dev',

  // ───────────────────────────────────────────────────────────
  // eSignatures.com — Remote Guarding paperwork (esig-contracts.js)
  // ───────────────────────────────────────────────────────────
  // Two hooks, one per document level, fired from the "Create …"
  // modal on the Remote Monitoring pages.
  //
  // ⚠️ Make holds the eSignatures API key server-side. It is NEVER
  // shipped in this bundle — this file is public (the repo must be
  // public for jsDelivr to serve it) and the bundle is downloaded by
  // every browser that loads the app.
  //
  // ⚠️ These webhook URLs are themselves unauthenticated write
  // endpoints, public in both senses. A POST to the MSA hook creates
  // a real contract, spends money and emails an SCW-branded agreement
  // to whatever address the payload names. Hiding the URL cannot fix
  // that — the browser has to know it. Defend in the Make scenario:
  //   · verify knackRecordId exists in Knack before creating anything
  //   · check signer.email against a contact on that record rather
  //     than trusting the payload
  //   · be idempotent — if the record already carries a contract id,
  //     return it instead of creating a second contract (this also
  //     covers double-clicks)
  //   · keep test:"yes" until all of the above is in place
  //
  // Request body (application/json), identical shape for both:
  //   {
  //     kind:          'msa' | 'clf',
  //     templateId:    <eSignatures template GUID — see below>,
  //     knackObject:   'object_26' | 'object_27',
  //     knackRecordId: <24-char hex of the Company / Site record>,
  //     viewId:        <Knack view the button was clicked in>,
  //     placeholders:  { <placeholder_key>: <string>, ... },
  //     signer:        { name, email },
  //     triggeredBy:   { id, name, email }
  //   }
  //
  // Make scenario should:
  //   1. POST /contracts to eSignatures with template_id, the
  //      placeholder_fields array built from `placeholders`, and TWO
  //      signers — micah.shearer@getscw.com as signing_order 1 with
  //      auto_sign "yes" (SCW is countersigned automatically, so the
  //      contract never waits on us), and `signer` as signing_order 2.
  //      `triggeredBy` is carried for the audit trail — who clicked the
  //      button — not as a signer.
  //   2. Set metadata to "Company ID: <knackRecordId>" (msa) or
  //      "Site ID: <knackRecordId>" (clf), matching the
  //      "Project ID: …,Proposal ID: …" convention already used on
  //      the Install Agreements pipeline, so the signed callback
  //      finds its record with no lookup table.
  //   3. Set custom_webhook_url to the callback scenario rather than
  //      touching the ACCOUNT-WIDE webhook URL in eSignatures — that
  //      one is shared with Install Agreements and Credit Terms and
  //      must not be repointed.
  //   4. Write the returned contract id back to Knack: field_600 on
  //      object_26 (msa), or the Contract ID field on object_27 (clf).
  //   5. On the signed callback, upload the PDF to field_601 (msa) /
  //      the Signed CLF file field (clf).
  //
  // Response body — fire "Webhook response" at the END of the
  // scenario so the browser waits:
  //   { "success": true, "contractId": "<guid>" }  → modal closes,
  //                                                  view re-renders
  //   { "success": false, "error": "human msg" }   → shown verbatim
  //
  // Until these are filled in the buttons still render, but report
  // "webhook not configured" instead of firing.
  // → Make scenario 21.05 | CONTRACTS | Shield MSA (id 5064363).
  MAKE_ESIG_MSA_WEBHOOK: 'https://hook.us1.make.com/1qf5bc3lhtl37grbf0g4u2zale9madjo',
  MAKE_ESIG_CLF_WEBHOOK: 'PLACEHOLDER',

  // eSignatures.com template GUIDs (created 2026-11-24).
  //   MSA → SCW Remote Guarding Services Agreement (2026)
  //   CLF → Exhibit A: Remote Guarding Covered Location Form (2026)
  ESIG_TEMPLATE_MSA: '8ab679c6-a568-41fb-be3d-1b8c26293ea1',
  ESIG_TEMPLATE_CLF: '45511d2e-0664-4996-a553-31c31188c9b5',

  // Base URL for opening a contract in the eSignatures.com UI; the
  // contract id is appended. ⚠️ VERIFY against a real contract — the
  // API returns no UI URL, so this is the one value here that was not
  // read off the service.
  ESIG_CONTRACT_URL_BASE: 'https://esignatures.com/contracts/'
};

// ─────────────────────────────────────────────────────────────
// Build stamp + boot log
// ─────────────────────────────────────────────────────────────
// Printed once per page load so the LOADED bundle self-identifies,
// including the CDN URL (with its pinned git SHA). When "is the page
// running the build I just pushed?" comes up, read this line instead
// of fingerprinting the DOM.
(function () {
  'use strict';
  window.SCW.BUILD = '2026-11-24 MSA strip; SCW countersigns automatically (test mode)';
  try {
    var src = (document.currentScript && document.currentScript.src) || '';
    if (!src) {
      var scripts = document.getElementsByTagName('script');
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src && scripts[i].src.indexOf('shield-bundle') !== -1) {
          src = scripts[i].src; break;
        }
      }
    }
    console.info('[SCW Shield] bundle build:', window.SCW.BUILD, src ? '· ' + src : '');
  } catch (e) { /* logging is a nicety — never block boot */ }
})();
