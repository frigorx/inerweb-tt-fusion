/**
 * tp-manager.js — Module autonome de création et gestion de TP/activités
 *
 * Expose : window.tpManager
 * Approche simple : onclick direct, pas de délégation complexe
 */
;(function () {
  'use strict';

  var COULEURS = {
    'EP2':   {bg:'#2d5a8c', light:'#e8f0f8'},
    'EP3-A': {bg:'#9b59b6', light:'#f3e5f5'},
    'EP3-B': {bg:'#3498db', light:'#d1ecf1'},
    'EP3-C': {bg:'#1abc9c', light:'#d4f4e2'}
  };

  // Garde-fou
  if (!window.appCfg) window.appCfg = {};
  if (!Array.isArray(window.appCfg.activites)) window.appCfg.activites = [];

  // ── État du formulaire ──
  window._tpForm = { ep: 'EP2', comps: [], eleves: [], phasesEleves: {} };

  // ── Helpers ──

  function _comps(epr) {
    if (epr === 'EP2') return window.COMP_EP2 || [];
    var sit = epr.replace('EP3-', '');
    return (window.COMP_EP3 || []).filter(function (c) {
      return c.sits && c.sits.indexOf(sit) !== -1;
    });
  }

  function _studentName(code) {
    var s = (window.students || []).find(function(e){ return e.code === code; });
    if (!s) return code;
    return (s.nom || '') + ' ' + (s.prenom ? s.prenom.charAt(0) + '.' : '');
  }

  function _today() {
    return new Date().toISOString().split('T')[0];
  }

  function _nextId() {
    var acts = window.appCfg.activites || [];
    var max = 0;
    acts.forEach(function (a) {
      var n = parseInt(a.id.replace('ACT-', ''), 10);
      if (n > max) max = n;
    });
    return 'ACT-' + String(max + 1).padStart(3, '0');
  }

  // ══════════════════════════════════════════════════════════════
  // FORMULAIRE DE CRÉATION
  // ══════════════════════════════════════════════════════════════

  function openCreate() {
    window._tpForm = { ep: 'EP2', comps: [], eleves: [], phasesEleves: {} };
    var sts = window.students || [];

    var h = '<div style="font-size:.85rem">';

    // 1. Épreuve
    h += '<div style="font-weight:700;margin-bottom:.4rem">Épreuve</div>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.4rem;margin-bottom:.75rem">';
    ['EP2','EP3-A','EP3-B','EP3-C'].forEach(function(ep) {
      var c = COULEURS[ep];
      var sel = (ep === 'EP2');
      h += '<button type="button" id="tpEp_' + ep.replace('-','') + '" '
        + 'onclick="tpManager.pickEp(\'' + ep + '\')" '
        + 'style="padding:.6rem;border:2px solid ' + c.bg + ';background:' + (sel ? c.bg : c.light)
        + ';color:' + (sel ? '#fff' : c.bg) + ';border-radius:10px;font-weight:700;font-size:.82rem;cursor:pointer">'
        + ep + '</button>';
    });
    h += '</div>';

    // 2. Titre
    h += '<div style="margin-bottom:.75rem">';
    h += '<div style="font-weight:700;margin-bottom:.3rem">Titre du TP / Séance</div>';
    h += '<input id="tpTitre" type="text" placeholder="Ex : Brasage atelier S12" '
      + 'style="width:100%;padding:.5rem .75rem;border:2px solid var(--gris3);border-radius:10px;font-size:.85rem;box-sizing:border-box">';
    h += '</div>';

    // 3. Date
    h += '<div style="margin-bottom:.75rem">';
    h += '<div style="font-weight:700;margin-bottom:.3rem">Date</div>';
    h += '<input id="tpDate" type="date" value="' + _today() + '" '
      + 'style="padding:.5rem .75rem;border:2px solid var(--gris3);border-radius:10px;font-size:.85rem">';
    h += '</div>';

    // 4. Compétences
    h += '<div style="margin-bottom:.75rem">';
    h += '<div onclick="tpManager.toggleSection(\'tpCompsZone\',\'tpArrowC\')" style="display:flex;justify-content:space-between;align-items:center;'
      + 'padding:.5rem .6rem;background:var(--gris3);border-radius:8px;cursor:pointer;margin-bottom:.3rem">'
      + '<span style="font-weight:700">🎯 Compétences <span id="tpCompCount" style="font-weight:400;color:var(--gris);font-size:.78rem">(0)</span></span>'
      + '<div style="display:flex;gap:.3rem;align-items:center">'
      + '<button type="button" onclick="event.stopPropagation();tpManager.toggleAllComps()" '
      + 'style="background:none;border:1px solid #ccc;border-radius:6px;padding:.2rem .5rem;font-size:.7rem;cursor:pointer">Tout cocher</button>'
      + '<span id="tpArrowC">▼</span></div></div>';
    h += '<div id="tpCompsZone" style="display:flex;flex-wrap:wrap;gap:.3rem">';
    // Rendre les compétences EP2 directement dans le HTML
    var comps = _comps('EP2');
    var c = COULEURS['EP2'];
    if (comps.length) {
      comps.forEach(function(comp) {
        h += '<button type="button" id="tpC_' + comp.code.replace('.','_') + '" '
          + 'onclick="tpManager.toggleComp(\'' + comp.code + '\')" '
          + 'style="padding:.35rem .6rem;border:2px solid ' + c.bg + '44;background:#fff;color:' + c.bg
          + ';border-radius:8px;font-size:.78rem;cursor:pointer;font-weight:600">'
          + comp.code + ' ' + comp.nom + '</button>';
      });
    } else {
      h += '<span style="color:var(--gris);font-size:.78rem">Aucune compétence pour EP2</span>';
    }
    h += '</div></div>';

    // 5. Élèves
    h += '<div style="margin-bottom:.75rem">';
    h += '<div onclick="tpManager.toggleSection(\'tpElevesZone\',\'tpArrowE\')" style="display:flex;justify-content:space-between;align-items:center;'
      + 'padding:.5rem .6rem;background:var(--gris3);border-radius:8px;cursor:pointer;margin-bottom:.3rem">'
      + '<span style="font-weight:700">👥 Élèves <span id="tpElvCount" style="font-weight:400;color:var(--gris);font-size:.78rem">(0/' + sts.length + ')</span></span>'
      + '<div style="display:flex;gap:.3rem;align-items:center">'
      + '<button type="button" onclick="event.stopPropagation();tpManager.toggleAllEleves()" '
      + 'style="background:none;border:1px solid #ccc;border-radius:6px;padding:.2rem .5rem;font-size:.7rem;cursor:pointer">Tout cocher</button>'
      + '<span id="tpArrowE">▼</span></div></div>';
    h += '<div id="tpElevesZone" style="display:flex;flex-wrap:wrap;gap:.3rem">';
    if (sts.length) {
      sts.forEach(function (s) {
        h += '<button type="button" id="tpE_' + s.code.replace(/[^a-zA-Z0-9]/g,'_') + '" '
          + 'onclick="tpManager.toggleEleve(\'' + s.code + '\')" '
          + 'style="padding:.35rem .6rem;border:2px solid var(--gris3);background:#fff;border-radius:8px;'
          + 'font-size:.78rem;cursor:pointer;font-weight:600">'
          + (s.nom || '') + ' ' + (s.prenom ? s.prenom.charAt(0) + '.' : '') + '</button>';
      });
    } else {
      h += '<span style="color:var(--rouge);font-size:.78rem;font-weight:600">⚠️ Aucun élève chargé. Ajoutez des élèves ou utilisez le mode démo.</span>';
    }
    h += '</div></div>';

    // 6. Zone dispatch phases par élève
    h += '<div id="tpDispatchZone" style="margin-bottom:.75rem;display:none">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem;flex-wrap:wrap;gap:.3rem">'
      + '<span style="font-weight:700;font-size:.85rem">📋 Phase par élève</span>'
      + '<div style="display:flex;gap:.3rem">'
      + '<button type="button" onclick="tpManager.allPhase(\'formatif\')" '
      + 'style="padding:.25rem .5rem;border:2px solid var(--bleu2);background:var(--bleu3);color:var(--bleu2);border-radius:6px;font-size:.68rem;font-weight:700;cursor:pointer">📘 Tous formatif</button>'
      + '<button type="button" onclick="tpManager.allPhase(\'certificatif\')" '
      + 'style="padding:.25rem .5rem;border:2px solid var(--orange);background:var(--orange2);color:var(--orange);border-radius:6px;font-size:.68rem;font-weight:700;cursor:pointer">📙 Tous certif.</button>'
      + '</div></div>';
    h += '<div id="tpDispatchList"></div>';
    h += '</div>';

    h += '</div>';

    var actions = '<button type="button" onclick="tpManager.submit()" '
      + 'style="width:100%;padding:.7rem;border:none;background:var(--bleu2);color:#fff;border-radius:10px;'
      + 'font-size:.9rem;font-weight:700;cursor:pointer">✅ Créer le TP</button>';

    window.showModal('📋 Nouveau TP / Activité', h, actions);
  }

  // ══════════════════════════════════════════════════════════════
  // ACTIONS (appelées par onclick)
  // ══════════════════════════════════════════════════════════════

  function pickEp(ep) {
    var f = window._tpForm;
    f.ep = ep;
    f.comps = [];

    // Mettre à jour les boutons épreuve
    ['EP2','EP3A','EP3B','EP3C'].forEach(function(id) {
      var btn = document.getElementById('tpEp_' + id);
      if (!btn) return;
      var epVal = id.replace('EP3', 'EP3-');
      if (epVal === 'EP3-') epVal = 'EP3'; // ne devrait pas arriver
      // Reconstruire la vraie valeur
      var realEp = btn.textContent.trim();
      var c = COULEURS[realEp];
      if (!c) return;
      var sel = (realEp === ep);
      btn.style.background = sel ? c.bg : c.light;
      btn.style.color = sel ? '#fff' : c.bg;
    });

    // Recharger les compétences
    var zone = document.getElementById('tpCompsZone');
    if (!zone) return;
    var comps = _comps(ep);
    var c = COULEURS[ep];
    if (!comps.length) {
      zone.innerHTML = '<span style="color:var(--gris);font-size:.78rem">Aucune compétence pour ' + ep + '</span>';
    } else {
      zone.innerHTML = comps.map(function(comp) {
        return '<button type="button" id="tpC_' + comp.code.replace('.','_') + '" '
          + 'onclick="tpManager.toggleComp(\'' + comp.code + '\')" '
          + 'style="padding:.35rem .6rem;border:2px solid ' + c.bg + '44;background:#fff;color:' + c.bg
          + ';border-radius:8px;font-size:.78rem;cursor:pointer;font-weight:600">'
          + comp.code + ' ' + comp.nom + '</button>';
      }).join('');
    }
    _updateCompCount();
  }

  function toggleComp(code) {
    var f = window._tpForm;
    var c = COULEURS[f.ep];
    var btn = document.getElementById('tpC_' + code.replace('.','_'));
    var idx = f.comps.indexOf(code);
    if (idx === -1) {
      f.comps.push(code);
      if (btn) { btn.style.background = c.bg; btn.style.color = '#fff'; btn.style.borderColor = c.bg; }
    } else {
      f.comps.splice(idx, 1);
      if (btn) { btn.style.background = '#fff'; btn.style.color = c.bg; btn.style.borderColor = c.bg + '44'; }
    }
    _updateCompCount();
  }

  function toggleAllComps() {
    var f = window._tpForm;
    var comps = _comps(f.ep);
    var c = COULEURS[f.ep];
    var allSel = (f.comps.length === comps.length && comps.length > 0);
    f.comps = [];
    comps.forEach(function(comp) {
      var btn = document.getElementById('tpC_' + comp.code.replace('.','_'));
      if (allSel) {
        if (btn) { btn.style.background = '#fff'; btn.style.color = c.bg; btn.style.borderColor = c.bg + '44'; }
      } else {
        f.comps.push(comp.code);
        if (btn) { btn.style.background = c.bg; btn.style.color = '#fff'; btn.style.borderColor = c.bg; }
      }
    });
    _updateCompCount();
  }

  function toggleEleve(code) {
    var f = window._tpForm;
    var btn = document.getElementById('tpE_' + code.replace(/[^a-zA-Z0-9]/g,'_'));
    var idx = f.eleves.indexOf(code);
    if (idx === -1) {
      f.eleves.push(code);
      f.phasesEleves[code] = 'formatif';
      if (btn) { btn.style.background = 'var(--bleu2)'; btn.style.color = '#fff'; btn.style.borderColor = 'var(--bleu2)'; }
    } else {
      f.eleves.splice(idx, 1);
      delete f.phasesEleves[code];
      if (btn) { btn.style.background = '#fff'; btn.style.color = 'inherit'; btn.style.borderColor = 'var(--gris3)'; }
    }
    _updateElvCount();
    _renderDispatch();
  }

  function toggleAllEleves() {
    var f = window._tpForm;
    var sts = window.students || [];
    var allSel = (f.eleves.length === sts.length && sts.length > 0);
    f.eleves = [];
    f.phasesEleves = {};
    sts.forEach(function(s) {
      var btn = document.getElementById('tpE_' + s.code.replace(/[^a-zA-Z0-9]/g,'_'));
      if (allSel) {
        if (btn) { btn.style.background = '#fff'; btn.style.color = 'inherit'; btn.style.borderColor = 'var(--gris3)'; }
      } else {
        f.eleves.push(s.code);
        f.phasesEleves[s.code] = 'formatif';
        if (btn) { btn.style.background = 'var(--bleu2)'; btn.style.color = '#fff'; btn.style.borderColor = 'var(--bleu2)'; }
      }
    });
    _updateElvCount();
    _renderDispatch();
  }

  function setElevePhase(code, ph) {
    window._tpForm.phasesEleves[code] = ph;
    _renderDispatch();
  }

  function allPhase(ph) {
    var f = window._tpForm;
    f.eleves.forEach(function(code) { f.phasesEleves[code] = ph; });
    _renderDispatch();
  }

  function toggleSection(zoneId, arrowId) {
    var zone = document.getElementById(zoneId);
    var arrow = document.getElementById(arrowId);
    if (!zone) return;
    var hidden = (zone.style.display === 'none');
    zone.style.display = hidden ? 'flex' : 'none';
    if (arrow) arrow.textContent = hidden ? '▲' : '▼';
  }

  // ── Compteurs ──

  function _updateCompCount() {
    var cnt = document.getElementById('tpCompCount');
    if (cnt) cnt.textContent = '(' + window._tpForm.comps.length + ')';
  }

  function _updateElvCount() {
    var cnt = document.getElementById('tpElvCount');
    if (cnt) cnt.textContent = '(' + window._tpForm.eleves.length + '/' + (window.students || []).length + ')';
  }

  // ── Dispatch phases ──

  function _renderDispatch() {
    var zone = document.getElementById('tpDispatchZone');
    var list = document.getElementById('tpDispatchList');
    if (!zone || !list) return;
    var f = window._tpForm;

    if (!f.eleves.length) { zone.style.display = 'none'; return; }
    zone.style.display = 'block';

    list.innerHTML = f.eleves.map(function(code) {
      var ph = f.phasesEleves[code] || 'formatif';
      var isF = (ph === 'formatif');
      return '<div style="display:flex;align-items:center;gap:.4rem;padding:.35rem .5rem;margin-bottom:.25rem;'
        + 'background:' + (isF ? '#e8f0f8' : '#fff3e0') + ';border-radius:8px;border:1px solid ' + (isF ? '#2196F388' : '#FF980088') + '">'
        + '<span style="flex:1;font-size:.78rem;font-weight:600">' + _studentName(code) + '</span>'
        + '<select onchange="tpManager.setElevePhase(\'' + code + '\',this.value)" '
        + 'style="padding:.25rem .4rem;border:2px solid ' + (isF ? 'var(--bleu2)' : 'var(--orange)')
        + ';border-radius:6px;font-size:.72rem;font-weight:700;cursor:pointer;background:#fff">'
        + '<option value="formatif"' + (isF ? ' selected' : '') + '>📘 Formatif</option>'
        + '<option value="certificatif"' + (!isF ? ' selected' : '') + '>📙 Certificatif</option></select>'
        + '</div>';
    }).join('');
  }

  // ══════════════════════════════════════════════════════════════
  // SOUMISSION
  // ══════════════════════════════════════════════════════════════

  function submit() {
    var f = window._tpForm;
    var titre = (document.getElementById('tpTitre').value || '').trim();
    var date = document.getElementById('tpDate').value || _today();

    if (!titre) { window.toast('Saisissez un titre', 'err'); return; }
    if (!f.comps.length) { window.toast('Sélectionnez au moins une compétence', 'err'); return; }

    // Phase dominante
    var nbC = 0, nbF = 0;
    f.eleves.forEach(function(code) {
      if ((f.phasesEleves[code] || 'formatif') === 'certificatif') nbC++; else nbF++;
    });

    if (!window.appCfg) window.appCfg = {};
    if (!Array.isArray(window.appCfg.activites)) window.appCfg.activites = [];

    var act = {
      id: _nextId(),
      titre: titre,
      date: date,
      epreuve: f.ep,
      competences: f.comps.slice(),
      evaluateur: (window.cfg && window.cfg.nomProf) || '',
      phase: nbC > nbF ? 'certificatif' : 'formatif',
      eleves: f.eleves.slice(),
      elevesDetail: f.eleves.map(function(code) {
        return { code: code, phase: f.phasesEleves[code] || 'formatif' };
      }),
      phasesEleves: JSON.parse(JSON.stringify(f.phasesEleves)),
      photos: [],
      obs: ''
    };

    window.appCfg.activites.push(act);
    if (typeof window.saveLocal === 'function') window.saveLocal();
    window.toast('TP « ' + act.titre + ' » créé (' + act.competences.length + ' comp., ' + act.eleves.length + ' élèves)', 'ok');
    window.closeModal();

    var el = document.getElementById('activitesList');
    if (el && window.activModule) window.activModule.renderList(el);
  }

  // ══════════════════════════════════════════════════════════════
  // EXPOSITION
  // ══════════════════════════════════════════════════════════════

  window.tpManager = {
    openCreate: openCreate,
    pickEp: pickEp,
    toggleComp: toggleComp,
    toggleAllComps: toggleAllComps,
    toggleEleve: toggleEleve,
    toggleAllEleves: toggleAllEleves,
    setElevePhase: setElevePhase,
    allPhase: allPhase,
    toggleSection: toggleSection,
    submit: submit
  };

})();
