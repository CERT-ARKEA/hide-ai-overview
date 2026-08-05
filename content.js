/*
 * Bloqueur AI Overview / AI Mode — content.js
 * ---------------------------------------------------------------
 * Stratégie (Google change ses classes CSS très fréquemment, donc
 * on évite de s'appuyer uniquement sur elles) :
 *
 *  1. Attributs d'accessibilité (aria-label) — les plus stables.
 *  2. Repli sur des motifs de texte connus (disclaimers IA), en
 *     remontant jusqu'à un conteneur "carte" plausible.
 *  3. Repli sur le libellé exact des onglets de la barre d'outils
 *     de recherche ("AI Mode" / "Mode IA").
 *  4. MutationObserver pour réagir au rendu asynchrone de Google.
 *  5. Mode strict optionnel : redirige vers udm=14 (filtre "Web"
 *     officiel de Google, sans AI Overview ni AI Mode).
 *
 * Si Google modifie son balisage et que le blocage cesse de
 * fonctionner, complète les tableaux TEXT_PATTERNS / ARIA_LABELS
 * ci-dessous après inspection du DOM (clic droit > Inspecter).
 * ---------------------------------------------------------------
 */

(function () {
  "use strict";

  const ARIA_LABELS = [
    "AI Overview",
    "Aperçu IA",
    "Aperçu généré par l'IA",
    "AI Mode",
    "Mode IA",
  ];

  const TEXT_DISCLAIMER_PATTERNS = [
    /ai overview/i,
    /aper[cç]u (g[ée]n[ée]r[ée] par l.?ia|ia)/i,
    /r[ée]ponses? (de l.?ia|g[ée]n[ée]r[ée]es? par l.?ia) peuvent contenir des erreurs/i,
    /ai responses? may include mistakes/i,
    /generative ai is experimental/i,
    /les r[ée]ponses? de l.?ia sont exp[ée]rimentales/i,
  ];

  const TAB_LABEL_PATTERNS = [/^ai mode$/i, /^mode ia$/i];

  let settings = { enabled: true, strict: false };

  function markHidden(el) {
    if (!el || el.dataset.aiBlockedByExt === "true") return;
    el.dataset.aiBlockedByExt = "true";
    el.style.setProperty("display", "none", "important");
  }

  // --- 1. Masquage par aria-label ---------------------------------
  function hideByAriaLabel(root) {
    ARIA_LABELS.forEach((label) => {
      root
        .querySelectorAll(`[aria-label="${label}"]`)
        .forEach((el) => markHidden(el));
    });
  }

  // --- 2. Masquage par texte de disclaimer, en remontant à une carte
  function looksLikeCard(el) {
    if (!el || el === document.body) return false;
    const rect = el.getBoundingClientRect();
    // Une "carte" plausible a une largeur significative mais pas
    // toute la largeur de la page complète (pour éviter de masquer
    // #search ou <body> par erreur).
    return rect.width > 200 && el.children.length >= 1;
  }

  function findCardAncestor(node, maxHops = 10) {
    let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    for (let i = 0; i < maxHops && el; i++) {
      if (el.id === "search" || el.id === "rso" || el === document.body) {
        return null; // trop large : on ne masque pas
      }
      if (looksLikeCard(el)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function hideByTextDisclaimer(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent.trim();
      if (!text) continue;
      if (TEXT_DISCLAIMER_PATTERNS.some((re) => re.test(text))) {
        const card = findCardAncestor(node);
        if (card) markHidden(card);
      }
    }
  }

  // --- 3. Masquage de l'onglet "AI Mode" dans la barre d'outils ----
  function hideAiModeTab(root) {
    const candidates = root.querySelectorAll("a, div[role='listitem'], span");
    candidates.forEach((el) => {
      const text = (el.textContent || "").trim();
      if (TAB_LABEL_PATTERNS.some((re) => re.test(text))) {
        // On remonte jusqu'à un petit conteneur d'onglet, pas plus.
        let target = el;
        for (let i = 0; i < 3; i++) {
          if (!target.parentElement) break;
          const rect = target.parentElement.getBoundingClientRect();
          if (rect.width > 400) break; // trop large, on arrête
          target = target.parentElement;
        }
        markHidden(target);
      }
    });
  }

  function runAllFilters(root) {
    if (!settings.enabled) return;
    try {
      hideByAriaLabel(root);
      hideByTextDisclaimer(root);
      hideAiModeTab(root);
    } catch (e) {
      console.warn("[Bloqueur AI Overview] erreur de filtrage :", e);
    }
  }

  // --- Mode strict : redirection vers udm=14 (filtre "Web") --------
  function applyStrictModeIfNeeded() {
    if (!settings.strict) return;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("udm") !== "14") {
        url.searchParams.set("udm", "14");
        window.location.replace(url.toString());
      }
    } catch (e) {
      // silencieux
    }
  }

  // --- Observation des changements du DOM (rendu asynchrone) -------
  const observer = new MutationObserver((mutations) => {
    if (!settings.enabled) return;
    for (const m of mutations) {
      if (m.addedNodes.length) {
        runAllFilters(document.body);
        break;
      }
    }
  });

  function start() {
    applyStrictModeIfNeeded();
    if (document.body) {
      runAllFilters(document.body);
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        runAllFilters(document.body);
        observer.observe(document.body, { childList: true, subtree: true });
      });
    }
  }

  // --- Chargement des réglages puis démarrage -----------------------
  chrome.storage.sync.get(
    { enabled: true, strict: false },
    (stored) => {
      settings = stored;
      start();
    }
  );

  // Réagir aux changements de réglages depuis le popup, sans recharger
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) settings.enabled = changes.enabled.newValue;
    if (changes.strict) settings.strict = changes.strict.newValue;
    if (settings.enabled) {
      runAllFilters(document.body);
    }
    if (settings.strict) {
      applyStrictModeIfNeeded();
    }
  });
})();
