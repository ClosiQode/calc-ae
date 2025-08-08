(function(){
  'use strict';

  const qs = (s, r=document) => r.querySelector(s);

  const els = {
    roundMode: qs('#roundMode'),
    includeVL: qs('#includeVL'),

    rateVentesSocial: qs('#rateVentesSocial'),
    rateVentesVL: qs('#rateVentesVL'),
    rateVentesCFP: qs('#rateVentesCFP'),
    rateVentesCCI: qs('#rateVentesCCI'),

    rateBicSocial: qs('#rateBicSocial'),
    rateBicVL: qs('#rateBicVL'),
    rateBicCFP: qs('#rateBicCFP'),
    rateBicCCI: qs('#rateBicCCI'),

    rateBncSocial: qs('#rateBncSocial'),
    rateBncVL: qs('#rateBncVL'),
    rateBncCFP: qs('#rateBncCFP'),

    btnClose: qs('#btnClose'),
  };

  function num(v){
    if (typeof v === 'number') return v;
    const s = String(v||'').trim().replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }

  function fill(cfg){
    if (!cfg) return;
    els.roundMode.value = cfg.roundMode || 'none';
    els.includeVL.checked = !!cfg.includeVL;
    const r = cfg.rates || {};
    const set = (el, val) => { if (el) el.value = (val ?? ''); };
    set(els.rateVentesSocial, r.VENTES?.social);
    set(els.rateVentesVL,     r.VENTES?.vl);
    set(els.rateVentesCFP,    r.VENTES?.cfp);
    set(els.rateVentesCCI,    r.VENTES?.cci);
    set(els.rateBicSocial,    r.BIC?.social);
    set(els.rateBicVL,        r.BIC?.vl);
    set(els.rateBicCFP,       r.BIC?.cfp);
    set(els.rateBicCCI,       r.BIC?.cci);
    set(els.rateBncSocial,    r.BNC?.social);
    set(els.rateBncVL,        r.BNC?.vl);
    set(els.rateBncCFP,       r.BNC?.cfp);
  }

  function collect(){
    const cfg = {
      roundMode: els.roundMode.value,
      includeVL: !!els.includeVL.checked,
      rates: {
        VENTES: {
          social: num(els.rateVentesSocial.value),
          vl:     num(els.rateVentesVL.value),
          cfp:    num(els.rateVentesCFP.value),
          cci:    num(els.rateVentesCCI.value),
        },
        BIC: {
          social: num(els.rateBicSocial.value),
          vl:     num(els.rateBicVL.value),
          cfp:    num(els.rateBicCFP.value),
          cci:    num(els.rateBicCCI.value),
        },
        BNC: {
          social: num(els.rateBncSocial.value),
          vl:     num(els.rateBncVL.value),
          cfp:    num(els.rateBncCFP.value),
          cci:    0,
        }
      }
    };
    return cfg;
  }

  function bind(){
    const inputs = Array.from(document.querySelectorAll('input, select'));
    inputs.forEach((inp) => {
      const evt = inp.tagName === 'INPUT' ? 'input' : 'change';
      inp.addEventListener(evt, () => {
        if (window.settings && typeof window.settings.set === 'function') {
          window.settings.set(collect());
        }
      });
    });

    if (els.btnClose) {
      els.btnClose.addEventListener('click', () => window.close());
    }
  }

  function init(){
    if (window.settings && typeof window.settings.get === 'function') {
      window.settings.get().then(cfg => {
        fill(cfg);
      });
    }
    bind();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
