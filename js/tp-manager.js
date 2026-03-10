/**
 * tp-manager.js — Création et bibliothèque de TP
 * Interface identique à EP2/EP3 (compBlock, select élèves)
 * Expose : window.tpManager
 */
;(function () {
  'use strict';

  if (!window.appCfg) window.appCfg = {};
  if (!Array.isArray(window.appCfg.activites)) window.appCfg.activites = [];

  var COULEURS = {
    'EP2':   {bg:'#2d5a8c', light:'#e8f0f8', cls:'b-ep2'},
    'EP3-A': {bg:'#9b59b6', light:'#f3e5f5', cls:'b-ep3'},
    'EP3-B': {bg:'#3498db', light:'#d1ecf1', cls:'b-ep3'},
    'EP3-C': {bg:'#1abc9c', light:'#d4f4e2', cls:'b-ep3'}
  };

  var _sel = { ep: 'EP2', comps: [], eleves: [] };

  // ── Helpers ──

  function _comps(ep) {
    if (ep === 'EP2') return window.COMP_EP2 || [];
    var sit = ep.replace('EP3-', '');
    return (window.COMP_EP3 || []).filter(function(c) {
      return c.sits && c.sits.indexOf(sit) !== -1;
    });
  }

  function _studentName(code) {
    var s = (window.students || []).find(function(e){ return e.code === code; });
    if (!s) return code;
    return (s.nom || '') + ' ' + (s.prenom || '');
  }

  function _today() { return new Date().toISOString().split('T')[0]; }

  function _nextId() {
    var max = 0;
    (window.appCfg.activites || []).forEach(function(a) {
      var n = parseInt(a.id.replace('ACT-',''), 10);
      if (n > max) max = n;
    });
    return 'ACT-' + String(max + 1).padStart(3, '0');
  }

  function _dateFR(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  // ══════════════════════════════════════════════════════════════
  // VUE LISTE / CRÉATION
  // ══════════════════════════════════════════════════════════════

  function showCreate() {
    _sel = { ep: 'EP2', comps: [], eleves: [] };
    document.getElementById('tpListView').style.display = 'none';
    document.getElementById('tpCreateView').style.display = 'block';

    // Date par défaut
    var dateInput = document.getElementById('tpDate');
    if (dateInput) dateInput.value = _today();

    // Boutons épreuve
    _renderEprBtns();
    // Élèves
    _renderEleves();
    // Compétences
    _renderComps();
  }

  function backToList() {
    document.getElementById('tpCreateView').style.display = 'none';
    document.getElementById('tpListView').style.display = 'block';
    if (window.activModule) {
      activModule.renderList(document.getElementById('activitesList'));
    }
  }

  // ══════════════════════════════════════════════════════════════
  // BOUTONS ÉPREUVE
  // ══════════════════════════════════════════════════════════════

  function _renderEprBtns() {
    var zone = document.getElementById('tpEprBtns');
    if (!zone) return;
    zone.innerHTML = ['EP2','EP3-A','EP3-B','EP3-C'].map(function(ep) {
      var c = COULEURS[ep];
      var sel = (ep === _sel.ep);
      return '<button type="button" onclick="tpManager.pickEp(\'' + ep + '\')" '
        + 'class="btn ' + (sel ? 'btn-primary' : 'btn-ghost') + ' btn-sm" '
        + 'style="' + (sel ? 'background:' + c.bg + ';border-color:' + c.bg + ';color:#fff' : 'color:' + c.bg + ';border-color:' + c.bg) + '">'
        + ep + '</button>';
    }).join('');
  }

  function pickEp(ep) {
    _sel.ep = ep;
    _sel.comps = [];
    _renderEprBtns();
    _renderComps();
  }

  // ══════════════════════════════════════════════════════════════
  // ÉLÈVES — même style que le dashboard
  // ══════════════════════════════════════════════════════════════

  function _renderEleves() {
    var zone = document.getElementById('tpElevesGrid');
    if (!zone) return;
    var sts = window.students || [];

    if (!sts.length) {
      zone.innerHTML = '<div class="alert al-warn" style="width:100%">Aucun élève chargé. Synchronisez vos élèves dans l\'onglet Élèves, ou activez le mode démo.</div>';
      _updateElvCount();
      return;
    }

    zone.innerHTML = sts.map(function(s) {
      var sel = _sel.eleves.indexOf(s.code) !== -1;
      return '<button type="button" onclick="tpManager.toggleEleve(\'' + s.code + '\')" '
        + 'id="tpE_' + s.code.replace(/[^a-zA-Z0-9]/g,'_') + '" '
        + 'class="btn ' + (sel ? 'btn-primary' : 'btn-ghost') + ' btn-sm" '
        + 'style="font-size:.78rem;' + (sel ? '' : '') + '">'
        + (s.nom || '') + ' ' + (s.prenom ? s.prenom.charAt(0) + '.' : '')
        + '</button>';
    }).join('');
    _updateElvCount();
  }

  function toggleEleve(code) {
    var idx = _sel.eleves.indexOf(code);
    if (idx === -1) _sel.eleves.push(code);
    else _sel.eleves.splice(idx, 1);
    _renderEleves();
  }

  function toggleAllEleves() {
    var sts = window.students || [];
    if (_sel.eleves.length === sts.length) {
      _sel.eleves = [];
    } else {
      _sel.eleves = sts.map(function(s) { return s.code; });
    }
    _renderEleves();
  }

  function _updateElvCount() {
    var cnt = document.getElementById('tpElvCount');
    if (cnt) cnt.textContent = '(' + _sel.eleves.length + '/' + (window.students || []).length + ')';
  }

  // ══════════════════════════════════════════════════════════════
  // COMPÉTENCES — même style que compBlock de EP2/EP3
  // ══════════════════════════════════════════════════════════════

  function _renderComps() {
    var zone = document.getElementById('tpCompsGrid');
    if (!zone) return;
    var comps = _comps(_sel.ep);
    var c = COULEURS[_sel.ep];

    if (!comps.length) {
      zone.innerHTML = '<div class="alert al-info">Aucune compétence pour ' + _sel.ep + '</div>';
      _updateCompCount();
      return;
    }

    zone.innerHTML = comps.map(function(comp) {
      var sel = _sel.comps.indexOf(comp.code) !== -1;
      return '<div class="comp-block" data-comp="' + comp.code + '" '
        + 'style="border-left:4px solid ' + (sel ? c.bg : '#ddd') + ';'
        + (sel ? 'background:' + c.light : '') + '">'
        + '<div class="comp-hdr" onclick="tpManager.toggleComp(\'' + comp.code + '\')" style="cursor:pointer">'
        + '<input type="checkbox" ' + (sel ? 'checked' : '') + ' style="pointer-events:none;margin-right:.4rem" />'
        + '<span class="comp-code" style="' + (sel ? 'color:' + c.bg : '') + '">' + comp.code + '</span>'
        + '<span class="comp-nom">' + comp.nom + '</span>'
        + (comp.obl ? '<span class="comp-oblig">✱</span>' : '')
        + '</div>'
        + '<div style="padding:0 .7rem .3rem;font-size:.72rem;color:#666">' + comp.full + '</div>'
        + '</div>';
    }).join('');

    _updateCompCount();
  }

  function toggleComp(code) {
    var idx = _sel.comps.indexOf(code);
    if (idx === -1) _sel.comps.push(code);
    else _sel.comps.splice(idx, 1);
    _renderComps();
  }

  function toggleAllComps() {
    var comps = _comps(_sel.ep);
    if (_sel.comps.length === comps.length) {
      _sel.comps = [];
    } else {
      _sel.comps = comps.map(function(c) { return c.code; });
    }
    _renderComps();
  }

  function _updateCompCount() {
    var cnt = document.getElementById('tpCompCount');
    if (cnt) cnt.textContent = '(' + _sel.comps.length + '/' + _comps(_sel.ep).length + ')';
  }

  // ══════════════════════════════════════════════════════════════
  // SOUMISSION
  // ══════════════════════════════════════════════════════════════

  function submit() {
    var titre = (document.getElementById('tpTitre').value || '').trim();
    var date = document.getElementById('tpDate').value || _today();

    if (!titre) { window.toast('Saisissez un nom de TP', 'err'); return; }
    if (!_sel.comps.length) { window.toast('Cochez au moins une compétence', 'err'); return; }

    if (!window.appCfg) window.appCfg = {};
    if (!Array.isArray(window.appCfg.activites)) window.appCfg.activites = [];

    var act = {
      id: _nextId(),
      titre: titre,
      date: date,
      epreuve: _sel.ep,
      competences: _sel.comps.slice(),
      evaluateur: (window.cfg && window.cfg.nomProf) || '',
      phase: 'formatif',
      eleves: _sel.eleves.slice(),
      elevesDetail: _sel.eleves.map(function(code) {
        return { code: code, phase: 'formatif' };
      }),
      phasesEleves: {},
      photos: [],
      obs: ''
    };

    // Initialiser phasesEleves
    _sel.eleves.forEach(function(code) { act.phasesEleves[code] = 'formatif'; });

    window.appCfg.activites.push(act);
    if (typeof window.saveLocal === 'function') window.saveLocal();

    window.toast('TP « ' + titre + ' » créé — ' + _sel.comps.length + ' comp., ' + _sel.eleves.length + ' élèves', 'ok');

    // Retour à la liste
    backToList();
  }

  // ══════════════════════════════════════════════════════════════
  // EXPOSITION
  // ══════════════════════════════════════════════════════════════

  window.tpManager = {
    showCreate: showCreate,
    backToList: backToList,
    pickEp: pickEp,
    toggleComp: toggleComp,
    toggleAllComps: toggleAllComps,
    toggleEleve: toggleEleve,
    toggleAllEleves: toggleAllEleves,
    submit: submit
  };

})();
