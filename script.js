(function () {
  'use strict';

  // -------- Utilitaires --------
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const euros = (n) => (new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })).format(n || 0);
  const pct = (n) => (parseFloat(n) || 0) / 100;
  const num = (v) => {
    if (typeof v === 'number') return v;
    if (!v) return 0;
    const s = String(v).trim().replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };

  // -------- Références DOM --------
  const el = {
    // Mode
    radiosMode: qsa('input[name="mode"]'),
    zoneSimple: qs('#zoneSimple'),
    zoneMixte: qs('#zoneMixte'),

    // Simple
    caSimple: qs('#caSimple'),
    catSimple: qs('#catSimple'),

    // Mixte
    caVentes: qs('#caVentes'),
    caBic: qs('#caBic'),
    caBnc: qs('#caBnc'),

    // Bouton options avancées
    btnOpenOptions: qs('#btnOpenOptions'),

    // Résultats
    resCATotal: qs('#resCATotal'),
    resVentesSocial: qs('#resVentesSocial'),
    resBicSocial: qs('#resBicSocial'),
    resBncSocial: qs('#resBncSocial'),
    resSocialTotal: qs('#resSocialTotal'),
    resVLTotal: qs('#resVLTotal'),
    resCCITotal: qs('#resCCITotal'),
    resCFPTotal: qs('#resCFPTotal'),
    resChargesTotal: qs('#resChargesTotal'),
    resNet: qs('#resNet'),

    // Statut et boutons
    statusBadge: qs('#statusBadge'),
    btnExportPdf: qs('#btnExportPdf'),
    btnExportHtml: qs('#btnExportHtml'),

    // Lignes mixte-only
    mixteBlocks: qsa('[data-mixte-only]'),
    rowVentes: qs('[data-row="VENTES"]'),
    rowBic: qs('[data-row="BIC"]'),
    rowBnc: qs('[data-row="BNC"]'),

    // (Plus de champs d'options dans la page principale)
  };

  // Réglages persistants (chargés via preload)
  let settingsCache = {
    roundMode: 'none',
    includeVL: false,
    rates: {
      VENTES: { social: 12.3, vl: 1.0, cfp: 0.10, cci: 0.02 },
      BIC:    { social: 21.2, vl: 1.7, cfp: 0.10, cci: 0.04 },
      BNC:    { social: 24.6, vl: 2.2, cfp: 0.10, cci: 0 },
    }
  };

  // -------- Mode --------
  function mode() {
    const r = qs('input[name="mode"]:checked');
    return r ? r.value : 'simple';
  }

  function syncModeUI() {
    const m = mode();
    const isSimple = m === 'simple';

    // Affichage des zones
    el.zoneSimple.hidden = !isSimple;
    el.zoneMixte.hidden = isSimple;

    // Affichage des lignes réservées au mode Mixte
    el.mixteBlocks.forEach(b => b.style.display = isSimple ? 'none' : 'block');

    // Affichage des lignes par catégorie (uniquement en mixte)
    const disp = isSimple ? 'none' : '';
    if (el.rowVentes) el.rowVentes.style.display = disp;
    if (el.rowBic) el.rowBic.style.display = disp;
    if (el.rowBnc) el.rowBnc.style.display = disp;
  }

  // -------- Lecture des taux --------
  function getRates() {
    const r = settingsCache.rates || {};
    return {
      VENTES: {
        social: pct(num(r.VENTES?.social)),
        vl: pct(num(r.VENTES?.vl)),
        cfp: pct(num(r.VENTES?.cfp)),
        cci: pct(num(r.VENTES?.cci)),
      },
      BIC: {
        social: pct(num(r.BIC?.social)),
        vl: pct(num(r.BIC?.vl)),
        cfp: pct(num(r.BIC?.cfp)),
        cci: pct(num(r.BIC?.cci)),
      },
      BNC: {
        social: pct(num(r.BNC?.social)),
        vl: pct(num(r.BNC?.vl)),
        cfp: pct(num(r.BNC?.cfp)),
        cci: 0,
      },
    };
  }

  // -------- Lecture des entrées CA --------
  function getCAs() {
    const m = mode();
    if (m === 'simple') {
      const ca = num(el.caSimple.value);
      const cat = el.catSimple.value; // VENTES | BIC | BNC
      return {
        VENTES: cat === 'VENTES' ? ca : 0,
        BIC: cat === 'BIC' ? ca : 0,
        BNC: cat === 'BNC' ? ca : 0,
      };
    }
    // Mixte: trois champs
    return {
      VENTES: num(el.caVentes.value),
      BIC: num(el.caBic.value),
      BNC: num(el.caBnc.value),
    };
  }

  // -------- Calculs --------
  function calcCategory(amount, r, includeVL) {
    const social = amount * r.social;
    const vl = includeVL ? amount * r.vl : 0;
    const cfp = amount * r.cfp;
    const cci = r.cci ? amount * r.cci : 0;
    const total = social + vl + cfp + cci;
    return { amount, social, vl, cfp, cci, total };
  }

  function calc() {
    const m = mode();
    const cas = getCAs();
    const rates = getRates();
    const includeVL = !!settingsCache.includeVL;

    const resVENTES = calcCategory(cas.VENTES, rates.VENTES, includeVL);
    const resBIC = calcCategory(cas.BIC, rates.BIC, includeVL);
    // Pour BNC, on additionne le résultat HORS_CIPAV et/ou CIPAV (un seul aura un montant > 0)
    const resBNC = calcCategory(cas.BNC, rates.BNC, includeVL);

    const caTotal = resVENTES.amount + resBIC.amount + resBNC.amount;

    const socialTotal = resVENTES.social + resBIC.social + resBNC.social;
    const vlTotal = resVENTES.vl + resBIC.vl + resBNC.vl;
    const cfpTotal = resVENTES.cfp + resBIC.cfp + resBNC.cfp;
    const cciTotal = resVENTES.cci + resBIC.cci + resBNC.cci;
    const chargesTotal = socialTotal + vlTotal + cfpTotal + cciTotal;
    const net = caTotal - chargesTotal;

    // Arrondi d'affichage
    const rMode = settingsCache.roundMode || 'none';
    const applyRound = (n) => {
      if (!Number.isFinite(n)) return 0;
      switch (rMode) {
        case 'floor': return Math.floor(n);
        case 'ceil': return Math.ceil(n);
        case 'nearest': return Math.round(n);
        case 'none':
        default: return n;
      }
    };

    // MAJ lignes génériques (affichage arrondi selon option)
    el.resCATotal.textContent = euros(applyRound(caTotal));
    el.resSocialTotal.textContent = euros(applyRound(socialTotal));
    el.resVLTotal.textContent = euros(applyRound(vlTotal));
    if (el.resCCITotal) el.resCCITotal.textContent = euros(applyRound(cciTotal));
    el.resCFPTotal.textContent = euros(applyRound(cfpTotal));
    el.resChargesTotal.textContent = euros(applyRound(chargesTotal));
    el.resNet.textContent = euros(applyRound(net));

    // Lignes par catégorie visibles uniquement en mode mixte
    if (m === 'mixte') {
      if (el.rowVentes) el.resVentesSocial.textContent = euros(applyRound(resVENTES.social));
      if (el.rowBic) el.resBicSocial.textContent = euros(applyRound(resBIC.social));
      if (el.rowBnc) el.resBncSocial.textContent = euros(applyRound(resBNC.social));
    }

    setStatusOk();

    return {
      mode: m,
      inputs: { ...cas },
      rates,
      results: {
        VENTES: resVENTES,
        BIC: resBIC,
        BNC: resBNC,
        totals: {
          caTotal,
          socialTotal,
          vlTotal,
          cciTotal,
          cfpTotal,
          chargesTotal,
          net,
        },
      },
      roundMode: rMode,
      includeVL,
      timestamp: new Date().toISOString(),
    };
  }

  // -------- Statut recalcul --------
  function setStatusCalculating() {
    if (!el.statusBadge) return;
    el.statusBadge.textContent = 'Recalcul…';
    el.statusBadge.className = 'badge badge-info';
  }
  function setStatusOk() {
    if (!el.statusBadge) return;
    el.statusBadge.textContent = 'Calcul à jour';
    el.statusBadge.className = 'badge badge-ok';
  }

  // -------- Export (résultats seuls) --------
  function buildExportHTML(snapshot) {
    const fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
    const n = (v) => fmt.format(v||0);
    const s = snapshot;
    const totals = s.results.totals;
    const isMixte = s.mode === 'mixte';
    const row = (label, val, cls='') => `<tr class="${cls}"><td>${label}</td><td class="val">${n(val)}</td></tr>`;
    const rowsCat = isMixte ? (
      row('Charges sociales VENTES', s.results.VENTES.social) +
      row('Charges sociales BIC', s.results.BIC.social) +
      row('Charges sociales BNC', s.results.BNC.social)
    ) : '';
    const roundLabel = ({none:'Aucun', floor:"À l’euro inférieur", ceil:"À l’euro supérieur", nearest:"À l’euro le plus proche"})[s.roundMode] || 'Aucun';
    const vlLabel = s.includeVL ? 'incluse' : 'exclue';
    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Résultats – Calculatrice Auto-entrepreneur</title>
  <style>
  :root{--bg:#0f172a;--card:#111827;--border:#1f2937;--text:#e5e7eb;--muted:#9ca3af;--accent:#3b82f6;--ok:#10b981}
  body{margin:0;background:#0b1220;color:var(--text);font:14px/1.5 system-ui,Segoe UI,Roboto,Arial}
  .wrap{max-width:900px;margin:30px auto;padding:0 20px}
  .card{background:#111827;border:1px solid #1f2937;border-radius:12px;padding:18px;box-shadow:0 8px 24px rgba(0,0,0,.35)}
  h1{margin:0 0 6px;font-size:20px}
  .muted{color:var(--muted)}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  td{padding:10px;border-bottom:1px dashed #1f2937}
  td.val{text-align:right;font-variant-numeric:tabular-nums}
  tr.emph td{font-weight:700}
  .highlight{color:#fbbf24}
  .success{color:var(--ok)}
  .caps{letter-spacing:.02em;text-transform:uppercase;font-size:.85rem}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  @media (max-width:720px){.grid{grid-template-columns:1fr}}
  </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>Résultats de calcul</h1>
        <div class="muted caps">Mode: ${s.mode} • Arrondi: ${roundLabel} • VL ${vlLabel}</div>
        <table>
          ${row("Chiffre d'affaires total", totals.caTotal)}
          ${isMixte ? '<tr><td colspan="2" class="muted">Détail des charges sociales par catégorie</td></tr>' : ''}
          ${rowsCat}
          ${row('Charges sociales totales', totals.socialTotal)}
          ${row('Impôt (VL total)', totals.vlTotal)}
          ${row('Taxe CCI totale', totals.cciTotal)}
          ${row('CFP totale', totals.cfpTotal)}
          ${row('Total des charges', totals.chargesTotal, 'emph')}
          <tr class="emph"><td>Revenu net estimé</td><td class="val success">${n(totals.net)}</td></tr>
        </table>
      </div>
    </div>
  </body></html>`;
  }

  async function exportHTMLViaElectron(html) {
    if (window.exporter && typeof window.exporter.toHTML === 'function') {
      await window.exporter.toHTML(html);
      return true;
    }
    return false;
  }

  async function exportPDFViaElectron(html) {
    if (window.exporter && typeof window.exporter.toPDF === 'function') {
      await window.exporter.toPDF(html);
      return true;
    }
    return false;
  }

  // -------- Événements --------
  function bindAutoCalc() {
    const inputs = [
      // Mode
      ...el.radiosMode,
      // Simple
      el.caSimple, el.catSimple,
      // Mixte
      el.caVentes, el.caBic, el.caBnc,
      // Taux
      // Plus de champs d'options ici
    ].filter(Boolean);

    inputs.forEach((inp) => {
      const evt = inp.tagName === 'INPUT' ? 'input' : 'change';
      inp.addEventListener(evt, () => {
        setStatusCalculating();
        // Micro-delay pour laisser l'UI appliquer le mode avant le calcul
        queueMicrotask(() => {
          syncModeUI();
          calc();
        });
      });
    });

    // Export
    if (el.btnExportHtml) el.btnExportHtml.addEventListener('click', async () => {
      const snap = calc();
      const html = buildExportHTML(snap);
      const ok = await exportHTMLViaElectron(html);
      if (!ok) {
        // Fallback navigateur
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'resultats.html';
        document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},0);
      }
    });
    if (el.btnExportPdf) el.btnExportPdf.addEventListener('click', async () => {
      const snap = calc();
      const html = buildExportHTML(snap);
      const ok = await exportPDFViaElectron(html);
      if (!ok) {
        alert('Export PDF disponible dans l’application Electron.');
      }
    });
  }

  // -------- Init --------
  function init() {
    syncModeUI();
    bindAutoCalc();

    // Charger les réglages au démarrage (Electron)
    if (window.settings && typeof window.settings.get === 'function') {
      window.settings.get().then((cfg) => {
        settingsCache = { ...settingsCache, ...cfg, rates: { ...settingsCache.rates, ...(cfg.rates||{}) } };
        calc();
      });
      // Écouter les mises à jour depuis la fenêtre Options
      if (typeof window.settings.onUpdated === 'function') {
        window.settings.onUpdated((cfg) => {
          settingsCache = { ...settingsCache, ...cfg, rates: { ...settingsCache.rates, ...(cfg.rates||{}) } };
          setStatusCalculating();
          queueMicrotask(() => { syncModeUI(); calc(); });
        });
      }
    } else {
      // Fallback navigateur
      calc();
    }

    // Bouton Options avancées
    if (el.btnOpenOptions && window.settings && typeof window.settings.openOptions === 'function') {
      el.btnOpenOptions.addEventListener('click', () => {
        window.settings.openOptions();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
