/*
 * Shared CSS x-ray dev tools — ported from the Pepper repo (ChangelogPanel.tsx).
 * One vanilla script used by EVERY page: the Next.js routes load it from the root
 * layout, the legacy dashboard loads the same file inside its iframe — so there is
 * a single implementation, not per-page copies.
 *
 * A tiny fixed "xray" corner (bottom-left) with four toggles, any combination:
 *   box     outline every box — flex cyan, grid violet, positioned amber; hover for rules
 *   pad     tint every padding green (inset strips, real widths)
 *   margin  tint every margin orange (outset halo, real widths)
 *   inspect a readout follows the mouse — padding, margin, font, colours
 * State persists in localStorage ('dev.xray'). Stamps once per toggle; flip off/on
 * to re-stamp after the page changes.
 */
(function () {
  "use strict";
  if (window.__xrayLoaded) return; // idempotent: layout + iframe loads must not double up
  window.__xrayLoaded = true;

  var PAD =
    "rgb(34 197 94 / 0.12)"; /* padding: green, like devtools — a tint, not a wall */
  var MARG = "rgb(249 115 22 / 0.10)"; /* margin: orange, like devtools */
  var KEY = "dev.xray";

  var state = { box: false, pad: false, margin: false, inspect: false };
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    for (var k in state) if (typeof saved[k] === "boolean") state[k] = saved[k];
  } catch (e) {}

  /* ---------- box / pad / margin stamping ---------- */
  var stamped = []; // [el, prevTitle, prevShadow]
  var boxStyle = null;

  function clearStamps() {
    for (var i = 0; i < stamped.length; i++) {
      var s = stamped[i];
      delete s[0].dataset.dbg;
      s[0].title = s[1];
      s[0].style.boxShadow = s[2];
    }
    stamped = [];
    if (boxStyle) {
      boxStyle.remove();
      boxStyle = null;
    }
  }

  function px(v) {
    return Math.round(parseFloat(v)) || 0;
  }

  function stamp() {
    clearStamps();
    if (!state.box && !state.pad && !state.margin) return;

    if (state.box) {
      boxStyle = document.createElement("style");
      boxStyle.textContent =
        "body *:not([data-devcorner] *) { outline: 1px solid rgb(148 163 184 / 0.18); outline-offset: -1px; }" +
        "[data-dbg='flex'] { outline: 1px solid rgb(6 182 212 / 0.45); }" +
        "[data-dbg='grid'] { outline: 1px solid rgb(139 92 246 / 0.45); }" +
        "[data-dbg='pos'] { outline: 1px dashed rgb(245 158 11 / 0.45); }";
      document.head.appendChild(boxStyle);
    }

    var els = document.querySelectorAll("body *");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (!(el instanceof HTMLElement) || el.closest("[data-devcorner]")) continue;
      var s = getComputedStyle(el);
      var prevTitle = el.title;
      var prevShadow = el.style.boxShadow;

      /* the layout tool this element is using, said out loud — part of the box x-ray */
      if (state.box && (s.display === "flex" || s.display === "inline-flex")) {
        el.dataset.dbg = "flex";
        if (!el.title)
          el.title =
            s.display +
            " · " +
            s.flexDirection +
            " · justify: " +
            s.justifyContent +
            " · align: " +
            s.alignItems +
            " · gap: " +
            s.gap;
      } else if (state.box && s.display === "grid") {
        el.dataset.dbg = "grid";
        if (!el.title)
          el.title = "grid · cols: " + s.gridTemplateColumns + " · gap: " + s.gap;
      } else if (
        state.box &&
        (s.position === "absolute" || s.position === "fixed" || s.position === "sticky")
      ) {
        el.dataset.dbg = "pos";
        if (!el.title)
          el.title =
            "position: " +
            s.position +
            " · t:" +
            s.top +
            " r:" +
            s.right +
            " b:" +
            s.bottom +
            " l:" +
            s.left;
      }

      /* padding as inset green strips, margin as orange halo — per side, real widths */
      var shadows = [];
      if (state.pad) {
        var pt = px(s.paddingTop),
          pr = px(s.paddingRight),
          pb = px(s.paddingBottom),
          pl = px(s.paddingLeft);
        if (pt) shadows.push("inset 0 " + pt + "px 0 0 " + PAD);
        if (pb) shadows.push("inset 0 -" + pb + "px 0 0 " + PAD);
        if (pl) shadows.push("inset " + pl + "px 0 0 0 " + PAD);
        if (pr) shadows.push("inset -" + pr + "px 0 0 0 " + PAD);
      }
      if (state.margin) {
        var mt = px(s.marginTop),
          mr = px(s.marginRight),
          mb = px(s.marginBottom),
          ml = px(s.marginLeft);
        if (mt) shadows.push("0 -" + mt + "px 0 0 " + MARG);
        if (mb) shadows.push("0 " + mb + "px 0 0 " + MARG);
        if (ml) shadows.push("-" + ml + "px 0 0 0 " + MARG);
        if (mr) shadows.push(mr + "px 0 0 0 " + MARG);
      }
      if (shadows.length) el.style.boxShadow = shadows.join(", ");

      if (el.dataset.dbg || shadows.length) stamped.push([el, prevTitle, prevShadow]);
    }
  }

  /* ---------- inspect: readout follows the mouse ---------- */
  var tip = null;
  function toHex(rgb) {
    var m = rgb.match(/\d+(\.\d+)?/g);
    if (!m) return rgb;
    if (m.length >= 4 && parseFloat(m[3]) === 0) return "transparent";
    return (
      "#" +
      m
        .slice(0, 3)
        .map(function (n) {
          return (+n).toString(16).padStart(2, "0");
        })
        .join("")
    );
  }
  function sides(s, prop) {
    return [s[prop + "Top"], s[prop + "Right"], s[prop + "Bottom"], s[prop + "Left"]]
      .map(px)
      .join(" ");
  }
  function tagOf(el) {
    var cls =
      typeof el.className === "string" && el.className
        ? "." + el.className.split(" ")[0]
        : "";
    return el.tagName.toLowerCase() + cls;
  }

  /* Inspect paints the whole stack under the mouse (pepper xray.tsx): the hovered
     box AND every ancestor — padding green, margin orange, each edged faintly. */
  var tintedStack = []; // [el, prevShadow, prevOutline]
  var tintCur = null;
  var P_HL = "rgb(34 197 94 / 0.25)";
  var M_HL = "rgb(249 115 22 / 0.22)";
  function untintStack() {
    for (var i = 0; i < tintedStack.length; i++) {
      tintedStack[i][0].style.boxShadow = tintedStack[i][1];
      tintedStack[i][0].style.outline = tintedStack[i][2];
    }
    tintedStack = [];
    tintCur = null;
  }
  function tintOne(el) {
    var s = getComputedStyle(el);
    var pt = px(s.paddingTop),
      pr = px(s.paddingRight),
      pb = px(s.paddingBottom),
      pl = px(s.paddingLeft);
    var mt = px(s.marginTop),
      mr = px(s.marginRight),
      mb = px(s.marginBottom),
      ml = px(s.marginLeft);
    tintedStack.push([el, el.style.boxShadow, el.style.outline]);
    el.style.outline = "1px solid rgb(6 182 212 / 0.4)";
    var strips = [];
    if (pt) strips.push("inset 0 " + pt + "px 0 0 " + P_HL);
    if (pb) strips.push("inset 0 -" + pb + "px 0 0 " + P_HL);
    if (pl) strips.push("inset " + pl + "px 0 0 0 " + P_HL);
    if (pr) strips.push("inset -" + pr + "px 0 0 0 " + P_HL);
    if (mt) strips.push("0 -" + mt + "px 0 0 " + M_HL);
    if (mb) strips.push("0 " + mb + "px 0 0 " + M_HL);
    if (ml) strips.push("-" + ml + "px 0 0 0 " + M_HL);
    if (mr) strips.push(mr + "px 0 0 0 " + M_HL);
    if (strips.length) el.style.boxShadow = strips.join(", ");
  }
  function tintStack(el) {
    if (el === tintCur) return;
    untintStack();
    tintCur = el;
    for (var n = el; n && n !== document.body; n = n.parentElement) tintOne(n);
  }
  function onMove(e) {
    var el = e.target;
    if (
      !(el instanceof HTMLElement) ||
      el.closest("[data-devcorner]") ||
      el === document.body
    ) {
      untintStack();
      if (tip) tip.style.display = "none";
      return;
    }
    var s = getComputedStyle(el);
    tintStack(el);
    /* the same ancestor chain the tints paint, read into rows for the info box */
    var stack = "";
    var depth = 0;
    for (
      var a = el.parentElement;
      a && a !== document.body && depth < 6;
      a = a.parentElement, depth++
    ) {
      var as = getComputedStyle(a);
      stack +=
        "\n" + tagOf(a) + " · p " + sides(as, "padding") + " · m " + sides(as, "margin");
    }
    tip.style.display = "block";
    tip.textContent =
      tagOf(el) +
      "\npad: " +
      sides(s, "padding") +
      "  margin: " +
      sides(s, "margin") +
      "\n" +
      s.fontSize +
      " · " +
      s.fontWeight +
      " · " +
      s.fontFamily.split(",")[0].replace(/"/g, "") +
      "\ncolor " +
      toHex(s.color) +
      "  bg " +
      toHex(s.backgroundColor) +
      (stack ? "\n––" + stack : "");
    var x = e.clientX + 14,
      y = e.clientY + 14;
    if (x + 260 > innerWidth) x = e.clientX - 260;
    if (y + 200 > innerHeight) y = Math.max(2, innerHeight - 210);
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  }
  function applyInspect() {
    if (state.inspect) {
      if (!tip) {
        tip = document.createElement("div");
        tip.setAttribute("data-devcorner", "");
        tip.style.cssText =
          "position:fixed;z-index:99999;pointer-events:none;max-width:250px;white-space:pre-wrap;background:rgba(255,255,255,.95);border:1px solid #cbd5e1;border-radius:4px;padding:6px 8px;font:11px/1.5 monospace;color:#334155;box-shadow:0 2px 8px rgba(0,0,0,.15);display:none";
        document.body.appendChild(tip);
      }
      document.addEventListener("mousemove", onMove, true);
    } else {
      document.removeEventListener("mousemove", onMove, true);
      untintStack();
      if (tip) {
        tip.remove();
        tip = null;
      }
    }
  }

  /* Ctrl+F flips the whole x-ray (pepper DevCorner): all four on, or all off.
     Dev mode only — in the default view the corner is hidden, so the shortcut
     must not silently stamp the page. */
  document.addEventListener("keydown", function (e) {
    if (!e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;
    if ((e.key || "").toLowerCase() !== "f") return;
    if (document.documentElement.getAttribute("data-mode") !== "dev") return;
    e.preventDefault(); // deliberately shadows the browser find on this page
    var anyOn = state.box || state.pad || state.margin || state.inspect;
    state.box = state.pad = state.margin = state.inspect = !anyOn;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {}
    if (typeof window.__xrayPaint === "function") window.__xrayPaint();
    stamp();
    applyInspect();
  });

  /* ---------- the switchboard corner ---------- */
  function buildCorner() {
    var corner = document.createElement("div");
    corner.setAttribute("data-devcorner", "");
    corner.style.cssText =
      "position:fixed;bottom:12px;left:12px;z-index:99998;display:flex;align-items:center;background:rgba(255,255,255,.92);border:1px solid #cbd5e1;border-radius:6px;font:11px monospace;color:#64748b;box-shadow:0 1px 4px rgba(0,0,0,.12);overflow:hidden";

    var label = document.createElement("span");
    label.textContent = "xray";
    label.style.cssText = "padding:5px 7px;color:#94a3b8;cursor:pointer;user-select:none";
    corner.appendChild(label);

    var NOTE = {
      box: "outline every box — flex cyan, grid violet, positioned amber; hover one for its rules",
      pad: "tint every padding green",
      margin: "tint every margin orange",
      inspect: "a floating readout follows the mouse — padding, margin, font, colours",
    };
    var btns = {};
    Object.keys(NOTE).forEach(function (k) {
      var b = document.createElement("button");
      b.textContent = k;
      b.title = NOTE[k];
      b.type = "button";
      b.style.cssText =
        "border:none;background:none;font:inherit;padding:5px 7px;cursor:pointer;color:#64748b";
      b.addEventListener("click", function () {
        state[k] = !state[k];
        try {
          localStorage.setItem(KEY, JSON.stringify(state));
        } catch (e) {}
        paint();
        if (k === "inspect") applyInspect();
        else stamp();
      });
      btns[k] = b;
      corner.appendChild(b);
    });

    function paint() {
      Object.keys(btns).forEach(function (k) {
        btns[k].style.background = state[k] ? "#1e293b" : "none";
        btns[k].style.color = state[k] ? "#fff" : "#64748b";
      });
    }
    paint();
    window.__xrayPaint = paint; // Ctrl+F repaints the buttons after flipping all

    /* the label collapses the switchboard to just "xray" so it never crowds the page */
    var collapsed = false;
    label.addEventListener("click", function () {
      collapsed = !collapsed;
      Object.keys(btns).forEach(function (k) {
        btns[k].style.display = collapsed ? "none" : "";
      });
    });

    document.body.appendChild(corner);
  }

  function init() {
    buildCorner();
    stamp();
    applyInspect();
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
