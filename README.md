# Bloqueur AI Overview / AI Mode pour Google Search

Extension Chrome (Manifest V3) qui masque :
- le bloc **AI Overview** (résumé généré par Gemini) en haut des résultats Google Search ;
- l'onglet / menu **AI Mode** (Mode IA) dans la barre d'outils de recherche.

## Installation (mode développeur)

1. Dézippe le dossier `hide-ai-overview`.
2. Ouvre Chrome → `chrome://extensions`.
3. Active le **Mode développeur** (en haut à droite).
4. Clique sur **Charger l'extension non empaquetée** et sélectionne le dossier `hide-ai-overview`.
5. Va sur `google.com` (ou un domaine Google listé dans `manifest.json`) et lance une recherche.

## Fonctionnement

Le script `content.js` s'exécute sur les pages de résultats Google Search et applique trois filtres complémentaires, du plus au moins fiable :

1. **`aria-label`** (`AI Overview`, `Mode IA`, etc.) — les libellés d'accessibilité changent rarement, même quand Google modifie ses classes CSS.
2. **Texte des disclaimers IA** ("Les réponses de l'IA peuvent contenir des erreurs", etc.) — remonte jusqu'au conteneur "carte" le plus proche pour le masquer.
3. **Libellé exact des onglets** ("AI Mode" / "Mode IA") dans la barre d'outils.

Un `MutationObserver` réapplique ces filtres à chaque modification du DOM, car Google charge une partie du contenu de façon asynchrone.

## Popup

Le clic sur l'icône de l'extension ouvre un petit panneau avec deux réglages, stockés dans `chrome.storage.sync` :

- **Masquage actif** : active/désactive le blocage.
- **Mode strict (`udm=14`)** : redirige automatiquement toute recherche vers le paramètre officiel `udm=14` de Google, qui affiche la vue "Web" classique sans AI Overview ni AI Mode. C'est le filet de sécurité le plus robuste si Google modifie son balisage, car il s'appuie sur un paramètre d'URL documenté plutôt que sur du DOM.

## Maintenance (important)

Google modifie régulièrement le balisage de ses pages de résultats. Si le blocage cesse de fonctionner un jour :

1. Ouvre la page de résultats concernée, clic droit sur l'élément AI Overview (ou l'onglet AI Mode) → **Inspecter**.
2. Regarde s'il a toujours un `aria-label` reconnaissable, ou récupère le nouveau texte du disclaimer.
3. Ajoute la nouvelle valeur dans les tableaux `ARIA_LABELS` / `TEXT_DISCLAIMER_PATTERNS` / `TAB_LABEL_PATTERNS` en haut de `content.js`.
4. Recharge l'extension depuis `chrome://extensions` (icône ↻).

En attendant une mise à jour, active le **mode strict** dans le popup : il continuera à fonctionner tant que Google conserve le paramètre `udm=14`.

## Limites connues

- Les sélecteurs basés sur le texte sont sensibles à la langue de l'interface Google ; seuls le français et l'anglais sont couverts par défaut. Ajoute d'autres langues dans `TEXT_DISCLAIMER_PATTERNS` / `TAB_LABEL_PATTERNS` si besoin.
- L'extension ne modifie que l'affichage (les éléments sont masqués via `display: none`), elle ne bloque pas le chargement réseau du contenu AI Overview côté serveur.
- Domaines Google couverts : voir la liste dans `manifest.json` (`host_permissions` et `content_scripts.matches`). Ajoute d'autres domaines nationaux si tu utilises un TLD Google non listé.

## Fichiers

```
hide-ai-overview/
├── manifest.json   # Déclaration de l'extension (MV3)
├── content.js      # Logique de détection et masquage + mode strict
├── style.css       # Masquage CSS instantané (anti-flash)
├── popup.html      # Interface du popup
├── popup.js        # Logique du popup (chrome.storage.sync)
└── README.md
