/* ============================================================
 * SCW SHIELD — BUNDLE LOADER (Knack-side snippet, NOT in the bundle)
 * ============================================================
 *
 * LIVES IN: Knack Builder → Settings → API & Code → **JavaScript**
 *
 * ⚠️ That panel takes JAVASCRIPT, not HTML. Pasting a
 * `<script src="…"></script>` tag there is a syntax error and nothing
 * on the page runs. Paste the code below, as-is.
 *
 * TO UPDATE THE BUNDLE: bump SHA to the commit `save.sh` printed, and
 * re-paste. SHA URLs are immutable on jsDelivr, so there is no cache
 * to bust and no release to cut — the new build is live the moment the
 * commit is pushed.
 * ============================================================ */

(function () {
  'use strict';

  // Commit SHA of mitzvetsia/scw-shield-knack-js to run. ← bump this
  var SHA = '01e33feb80daa240c7c250bb8eb05d72c77fc952';

  var SRC = 'https://cdn.jsdelivr.net/gh/mitzvetsia/scw-shield-knack-js@' +
            SHA + '/dist/shield-bundle.js';

  // Knack is a single-page app and this snippet runs once at boot, but
  // guard anyway so a re-entry can't double-load the bundle (which
  // would re-register every feature's handlers).
  if (document.querySelector('script[data-scw-shield]')) return;

  var s = document.createElement('script');
  s.src = SRC;
  s.async = false;                       // keep execution order
  s.setAttribute('data-scw-shield', SHA);

  s.onerror = function () {
    console.error('[SCW Shield] bundle FAILED to load:', SRC,
      '— check the SHA is pushed and the repo is public (jsDelivr ' +
      'cannot serve private repos).');
  };

  (document.head || document.documentElement).appendChild(s);
})();
