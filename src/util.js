// src/util.js — SCW Shield binding helpers
//
// Ported from the installation-services bundle
// (github.com/mitzvetsia/scw-knack-custom-js), trimmed to what this
// app actually uses. Keep the semantics identical to that repo so a
// feature can move between the two without a rewrite.

window.SCW = window.SCW || {};

// ── Gated debug logging ──────────────────────────────────────
// Per-feature diagnostics go through SCW.log / SCW.debug rather than
// console.log, so production stays quiet (and fast — DevTools retains
// object references from every console.log). Flip on in the console
// when troubleshooting: SCW.DEBUG = true
//
// console.error and console.warn are intentionally NOT gated — real
// errors should always surface.
(function (namespace) {
  function noop() {}
  function realLog()   { if (namespace.DEBUG) console.log.apply(console, arguments); }
  function realDebug() { if (namespace.DEBUG) (console.debug || console.log).apply(console, arguments); }
  namespace.DEBUG = namespace.DEBUG || false;
  namespace.log   = realLog;
  namespace.debug = realDebug;
  namespace.nolog = noop;
})(window.SCW);

// ── View / scene render binding ──────────────────────────────
(function initBindingsHelpers(namespace) {
  function normalizeNamespace(ns) {
    if (!ns) return '.scw';
    return ns.charAt(0) === '.' ? ns : '.' + ns;
  }

  // A throw inside a render handler leaves the page half-transformed.
  // Log it loudly and re-throw so debuggers and upstream listeners
  // behave normally. (The installation bundle also paints a blocking
  // overlay because a half-rendered proposal grid can produce bad
  // invoice totals; nothing in Shield computes money client-side yet,
  // so this stays a console-level concern. Revisit if that changes.)
  function safeHandler(handler, contextLabel) {
    return function scwSafeHandler() {
      try {
        return handler.apply(this, arguments);
      } catch (err) {
        console.error('[SCW Shield render error] ' + contextLabel, err);
        throw err;
      }
    };
  }

  // ── Catch-up ──────────────────────────────────────────────
  // The bundle loads async, so on a slow connection a feature's IIFE
  // can parse AFTER Knack has already emitted its initial
  // knack-view-render event — and the feature then silently no-ops
  // until the user navigates. Poll briefly for the rendered DOM and
  // fire the matching event once, but ONLY if the real Knack event
  // never reached this binding. `firedRef.fired` is set by the bound
  // handler, so the poller stands down the moment the genuine event
  // (or a previous catch-up) has run — without that check every
  // handler runs a second time on every normal page load.
  function scheduleCatchUp(eventName, viewOrSceneId, kind, firedRef) {
    var attempts = 0;
    var maxAttempts = 20;          // ~6s at 300ms cadence
    var iv = setInterval(function () {
      attempts++;
      if (firedRef.fired) { clearInterval(iv); return; }
      var found = false;
      try {
        if (kind === 'view') {
          var view = (typeof Knack !== 'undefined' && Knack.views) ? Knack.views[viewOrSceneId] : null;
          var rootEl = document.getElementById(viewOrSceneId);
          if (rootEl && view && view.model) {
            $(document).trigger(eventName, [view]);
            found = true;
          }
        } else if (kind === 'scene') {
          var sceneEl = document.getElementById('kn-' + viewOrSceneId);
          if (sceneEl) {
            $(document).trigger(eventName);
            found = true;
          }
        }
      } catch (e) { /* keep polling */ }
      if (found || attempts >= maxAttempts) clearInterval(iv);
    }, 300);
  }

  function trackFired(fn, firedRef) {
    return function scwTrackedHandler() {
      firedRef.fired = true;
      return fn.apply(this, arguments);
    };
  }

  namespace.onViewRender = function onViewRender(viewId, handler, ns) {
    if (!viewId || typeof handler !== 'function') return;
    var nsNorm = normalizeNamespace(ns);
    var eventName = 'knack-view-render.' + viewId + nsNorm;
    var wrapped = safeHandler(handler, 'onViewRender(' + viewId + ', ns=' + (ns || '.scw') + ')');
    var firedRef = { fired: false };
    $(document).off(eventName).on(eventName, trackFired(wrapped, firedRef));
    scheduleCatchUp(eventName, viewId, 'view', firedRef);
  };

  namespace.onSceneRender = function onSceneRender(sceneId, handler, ns) {
    if (!sceneId || typeof handler !== 'function') return;
    var nsNorm = normalizeNamespace(ns);
    var eventName = 'knack-scene-render.' + sceneId + nsNorm;
    var wrapped = safeHandler(handler, 'onSceneRender(' + sceneId + ', ns=' + (ns || '.scw') + ')');
    var firedRef = { fired: false };
    $(document).off(eventName).on(eventName, trackFired(wrapped, firedRef));
    scheduleCatchUp(eventName, sceneId, 'scene', firedRef);
  };
})(window.SCW);

// ── Current user ─────────────────────────────────────────────
// Knack exposes the logged-in user client-side via
// Knack.getUserAttributes() → { id, name, email, ... }.
//
// ⚠️ Anything derived from this is a UI convenience, NOT a security
// boundary — it runs in the browser and a technical user can change
// it. Gate real data at the Knack object/view permission level.
(function (namespace) {
  namespace.currentUser = function currentUser() {
    try {
      var u = Knack.getUserAttributes && Knack.getUserAttributes();
      if (u && typeof u === 'object') {
        return { id: u.id || '', name: u.name || '', email: u.email || '' };
      }
    } catch (e) { /* ignore */ }
    return null;
  };

  namespace.getUserEmail = function getUserEmail() {
    var u = namespace.currentUser();
    return (u && u.email) ? String(u.email).trim().toLowerCase() : '';
  };
})(window.SCW);

// ── Escape ───────────────────────────────────────────────────
// Everything this bundle injects as HTML carries user/record data.
// Route it through here.
(function (namespace) {
  namespace.esc = function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  };
})(window.SCW);
