/**
 * tp-manager.js — Module autonome de création et gestion de TP/activités
 *
 * Objectif : créer, indexer, stocker les TP d'évaluation.
 * Pensé pour évoluer vers une bibliothèque de TP réutilisables,
 * avec futur lien vers calendrier et cartes de progression.
 *
 * Expose : window.tpManager
 * Utilise : COMP_EP2, COMP_EP3, students, appCfg, saveLocal, toast, showModal, closeModal
 */
;(function () {
  'use strict';

  var COULEURS = {
    'EP2':   {bg:'#2d5a8c', light:'#e8f0f8'},
    'EP3-A': {bg:'#9b59b6', light:'#f3e5f5'},
    'EP3-B': {bg:'#3498db', light:'#d1ecf1'},
    'EP3-C': {bg:'#1abc9c', light:'#d4f4e2'}
  };

  var EP_LABELS = {
    'EP2':   'EP2 — Réalisation',
    'EP3-A': 'EP3-A — Mise en service',
    'EP3-B': 'EP3-B — Maintenance',
    'EP3-C': 'EP3-C — Documents'
  };

  // ── État du formulaire ──
  var _form = {
    ep: 'EP2',
    comps: [],
    eleves: [],
    phasesEleves: {}
  };

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

  function _dateFR(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
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
    _form = { ep: 'EP2', comps: [], eleves: [], phasesEleves: {} };
    var sts = window.students || [];

    var h = '<div id="tpCreateForm" style="font-size:.85rem">';

    // ── 1. Épreuve ──
    h += '<div style="font-weight:700;margin-bottom:.4rem">Épreuve</div>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.4rem;margin-bottom:.75rem">';
    ['EP2','EP3-A','EP3-B','EP3-C'].forEach(function(ep) {
      var c = COULEURS[ep];
      var sel = (ep === 'EP2');
      h += '<button type="button" class="tpEpBtn" data-ep="' + ep + '" '
        + 'style="padding:.6rem;border:2px solid ' + c.bg + ';background:' + (sel ? c.bg : c.light)
        + ';color:' + (sel ? '#fff' : c.bg) + ';border-radius:10px;font-weight:700;font-size:.82rem;cursor:pointer">'
        + ep + '</button>';
    });
    h += '</div>';

    // ── 2. Titre ──
    h += '<div style="margin-bottom:.75rem">';
    h += '<div style="font-weight:700;margin-bottom:.3rem">Titre du TP / Séance</div>';
    h += '<input id="tpTitre" type="text" placeholder="Ex : Brasage atelier S12" '
      + 'style="width:100%;padding:.5rem .75rem;border:2px solid var(--gris3);border-radius:10px;font-size:.85rem;box-sizing:border-box">';
    h += '</div>';

    // ── 3. Date ──
    h += '<div style="margin-bottom:.75rem">';
    h += '<div style="font-weight:700;margin-bottom:.3rem">Date</div>';
    h += '<input id="tpDate" type="date" value="' + _today() + '" '
      + 'style="padding:.5rem .75rem;border:2px solid var(--gris3);border-radius:10px;font-size:.85rem">';
    h += '</div>';

    // ── 4. Compétences (dépliable) ──
    h += '<div style="margin-bottom:.75rem">';
    h += '<div id="tpCompHeader" style="display:flex;justify-content:space-between;align-items:center;'
      + 'padding:.5rem .6rem;background:var(--gris3);border-radius:8px;cursor:pointer;margin-bottom:.3rem">'
      + '<span style="font-weight:700">🎯 Compétences <span id="tpCompCount" style="font-weight:400;color:var(--gris);font-size:.78rem">(0)</span></span>'
      + '<div style="display:flex;gap:.3rem;align-items:center">'
      + '<button type="button" id="tpToggleAllComps" style="background:none;border:1px solid #ccc;border-radius:6px;padding:.2rem .5rem;font-size:.7rem;cursor:pointer">Tout cocher</button>'
      + '<span id="tpArrowComp">▼</span></div></div>';
    h += '<div id="tpCompsZone" style="display:flex;flex-wrap:wrap;gap:.3rem"></div>';
    h += '</div>';

    // ── 5. Élèves (dépliable) ──
    h += '<div style="margin-bottom:.75rem">';
    h += '<div id="tpElvHeader" style="display:flex;justify-content:space-between;align-items:center;'
      + 'padding:.5rem .6rem;background:var(--gris3);border-radius:8px;cursor:pointer;margin-bottom:.3rem">'
      + '<span style="font-weight:700">👥 Élèves <span id="tpElvCount" style="font-weight:400;color:var(--gris);font-size:.78rem">(0/' + sts.length + ')</span></span>'
      + '<div style="display:flex;gap:.3rem;align-items:center">'
      + '<button type="button" id="tpToggleAllElv" style="background:none;border:1px solid #ccc;border-radius:6px;padding:.2rem .5rem;font-size:.7rem;cursor:pointer">Tout cocher</button>'
      + '<span id="tpArrowElv">▼</span></div></div>';
    h += '<div id="tpElevesZone" style="display:flex;flex-wrap:wrap;gap:.3rem">';
    if (sts.length) {
      sts.forEach(function (s) {
        h += '<button type="button" class="tpElvBtn" data-code="' + s.code + '" '
          + 'style="padding:.35rem .6rem;border:2px solid var(--gris3);background:#fff;border-radius:8px;'
          + 'font-size:.78rem;cursor:pointer;font-weight:600">'
          + (s.nom || '') + ' ' + (s.prenom ? s.prenom.charAt(0) + '.' : '') + '</button>';
      });
    } else {
      h += '<span style="color:var(--rouge);font-size:.78rem;font-weight:600">⚠️ Aucun élève chargé. Ajoutez des élèves ou utilisez le mode démo.</span>';
    }
    h += '</div></div>';

    // ── 6. Phase par élève (apparaît dynamiquement) ──
    h += '<div id="tpDispatchZone" style="margin-bottom:.75rem;display:none">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem;flex-wrap:wrap;gap:.3rem">'
      + '<span style="font-weight:700;font-size:.85rem">📋 Phase par élève</span>'
      + '<div style="display:flex;gap:.3rem">'
      + '<button type="button" id="tpAllFormatif" style="padding:.25rem .5rem;border:2px solid var(--bleu2);background:var(--bleu3);color:var(--bleu2);border-radius:6px;font-size:.68rem;font-weight:700;cursor:pointer">📘 Tous formatif</button>'
      + '<button type="button" id="tpAllCertif" style="padding:.25rem .5rem;border:2px solid var(--orange);background:var(--orange2);color:var(--orange);border-radius:6px;font-size:.68rem;font-weight:700;cursor:pointer">📙 Tous certif.</button>'
      + '</div></div>';
    h += '<div id="tpDispatchList"></div>';
    h += '</div>';

    h += '</div>';

    var actions = '<button type="button" id="tpSubmitBtn" '
      + 'style="width:100%;padding:.7rem;border:none;background:var(--bleu2);color:#fff;border-radius:10px;'
      + 'font-size:.9rem;font-weight:700;cursor:pointer">✅ Créer le TP</button>';

    window.showModal('📋 Nouveau TP / Activité', h, actions);

    // Rendre les compétences pour EP2 par défaut
    _renderComps();

    // Installer les événements
    _bindEvents();
  }

  // ══════════════════════════════════════════════════════════════
  // RENDU DES COMPÉTENCES (sans toucher aux sélections d'élèves)
  // ══════════════════════════════════════════════════════════════

  function _renderComps() {
    var zone = document.getElementById('tpCompsZone');
    if (!zone) return;
    var comps = _comps(_form.ep);
    var c = COULEURS[_form.ep];

    if (!comps.length) {
      zone.innerHTML = '<span style="color:var(--gris);font-size:.78rem;font-style:italic">Aucune compétence pour ' + _form.ep + '</span>';
      return;
    }

    zone.innerHTML = comps.map(function(comp) {
      var sel = _form.comps.indexOf(comp.code) !== -1;
      return '<button type="button" class="tpCompBtn" data-code="' + comp.code + '" '
        + 'style="padding:.35rem .6rem;border:2px solid ' + (sel ? c.bg : c.bg + '44') + ';'
        + 'background:' + (sel ? c.bg : '#fff') + ';color:' + (sel ? '#fff' : c.bg) + ';'
        + 'border-radius:8px;font-size:.78rem;cursor:pointer;font-weight:600">'
        + comp.code + ' ' + comp.nom + '</button>';
    }).join('');

    _updateCompCount();
  }

  function _updateCompCount() {
    var cnt = document.getElementById('tpCompCount');
    if (cnt) cnt.textContent = '(' + _form.comps.length + ')';
  }

  function _updateElvCount() {
    var cnt = document.getElementById('tpElvCount');
    if (cnt) cnt.textContent = '(' + _form.eleves.length + '/' + (window.students || []).length + ')';
  }

  // ══════════════════════════════════════════════════════════════
  // DISPATCH PHASES PAR ÉLÈVE
  // ══════════════════════════════════════════════════════════════

  function _renderDispatch() {
    var zone = document.getElementById('tpDispatchZone');
    var list = document.getElementById('tpDispatchList');
    if (!zone || !list) return;

    if (!_form.eleves.length) {
      zone.style.display = 'none';
      return;
    }
    zone.style.display = 'block';

    var html = '';
    _form.eleves.forEach(function(code) {
      var ph = _form.phasesEleves[code] || 'formatif';
      var isF = (ph === 'formatif');
      html += '<div style="display:flex;align-items:center;gap:.4rem;padding:.35rem .5rem;margin-bottom:.25rem;'
        + 'background:' + (isF ? '#e8f0f8' : '#fff3e0') + ';border-radius:8px;border:1px solid ' + (isF ? '#2196F388' : '#FF980088') + '">';
      html += '<span style="flex:1;font-size:.78rem;font-weight:600">' + _studentName(code) + '</span>';
      html += '<select data-phsel="' + code + '" style="padding:.25rem .4rem;border:2px solid ' + (isF ? 'var(--bleu2)' : 'var(--orange)')
        + ';border-radius:6px;font-size:.72rem;font-weight:700;cursor:pointer;background:#fff">'
        + '<option value="formatif"' + (isF ? ' selected' : '') + '>📘 Formatif</option>'
        + '<option value="certificatif"' + (!isF ? ' selected' : '') + '>📙 Certificatif</option></select>';
      html += '</div>';
    });
    list.innerHTML = html;

    // Écouter les changements
    list.querySelectorAll('select[data-phsel]').forEach(function(sel) {
      sel.addEventListener('change', function() {
        _form.phasesEleves[sel.dataset.phsel] = sel.value;
        _renderDispatch();
      });
    });
  }

  // ══════════════════════════════════════════════════════════════
  // ÉVÉNEMENTS (installés une seule fois après showModal)
  // ══════════════════════════════════════════════════════════════

  function _bindEvents() {
    var root = document.getElementById('tpCreateForm');
    if (!root) return;

    // Clic épreuve — change les compétences SANS écraser les élèves
    root.addEventListener('click', function(e) {
      var epBtn = e.target.closest('.tpEpBtn');
      if (epBtn) {
        _form.ep = epBtn.dataset.ep;
        _form.comps = []; // Normal : les compétences changent entre épreuves
        // Mise à jour visuelle des boutons épreuve
        root.querySelectorAll('.tpEpBtn').forEach(function(b) {
          var c = COULEURS[b.dataset.ep];
          var sel = (b.dataset.ep === _form.ep);
          b.style.background = sel ? c.bg : c.light;
          b.style.color = sel ? '#fff' : c.bg;
        });
        _renderComps();
        return;
      }

      // Clic compétence
      var compBtn = e.target.closest('.tpCompBtn');
      if (compBtn) {
        var code = compBtn.dataset.code;
        var c = COULEURS[_form.ep];
        var idx = _form.comps.indexOf(code);
        if (idx === -1) {
          _form.comps.push(code);
          compBtn.style.background = c.bg;
          compBtn.style.color = '#fff';
          compBtn.style.borderColor = c.bg;
        } else {
          _form.comps.splice(idx, 1);
          compBtn.style.background = '#fff';
          compBtn.style.color = c.bg;
          compBtn.style.borderColor = c.bg + '44';
        }
        _updateCompCount();
        return;
      }

      // Clic élève
      var elvBtn = e.target.closest('.tpElvBtn');
      if (elvBtn) {
        var eCode = elvBtn.dataset.code;
        var eIdx = _form.eleves.indexOf(eCode);
        if (eIdx === -1) {
          _form.eleves.push(eCode);
          _form.phasesEleves[eCode] = 'formatif';
          elvBtn.style.background = 'var(--bleu2)';
          elvBtn.style.color = '#fff';
          elvBtn.style.borderColor = 'var(--bleu2)';
        } else {
          _form.eleves.splice(eIdx, 1);
          delete _form.phasesEleves[eCode];
          elvBtn.style.background = '#fff';
          elvBtn.style.color = 'inherit';
          elvBtn.style.borderColor = 'var(--gris3)';
        }
        _updateElvCount();
        _renderDispatch();
        return;
      }
    });

    // Tout cocher compétences
    var tac = document.getElementById('tpToggleAllComps');
    if (tac) tac.addEventListener('click', function(e) {
      e.stopPropagation();
      var btns = root.querySelectorAll('.tpCompBtn');
      var c = COULEURS[_form.ep];
      var allSel = (_form.comps.length === btns.length && btns.length > 0);
      _form.comps = [];
      if (!allSel) {
        btns.forEach(function(b) {
          _form.comps.push(b.dataset.code);
          b.style.background = c.bg;
          b.style.color = '#fff';
          b.style.borderColor = c.bg;
        });
      } else {
        btns.forEach(function(b) {
          b.style.background = '#fff';
          b.style.color = c.bg;
          b.style.borderColor = c.bg + '44';
        });
      }
      _updateCompCount();
    });

    // Tout cocher élèves
    var tae = document.getElementById('tpToggleAllElv');
    if (tae) tae.addEventListener('click', function(e) {
      e.stopPropagation();
      var btns = root.querySelectorAll('.tpElvBtn');
      var allSel = (_form.eleves.length === btns.length && btns.length > 0);
      _form.eleves = [];
      _form.phasesEleves = {};
      if (!allSel) {
        btns.forEach(function(b) {
          _form.eleves.push(b.dataset.code);
          _form.phasesEleves[b.dataset.code] = 'formatif';
          b.style.background = 'var(--bleu2)';
          b.style.color = '#fff';
          b.style.borderColor = 'var(--bleu2)';
        });
      } else {
        btns.forEach(function(b) {
          b.style.background = '#fff';
          b.style.color = 'inherit';
          b.style.borderColor = 'var(--gris3)';
        });
      }
      _updateElvCount();
      _renderDispatch();
    });

    // Tous formatif / tous certif
    var af = document.getElementById('tpAllFormatif');
    var ac = document.getElementById('tpAllCertif');
    if (af) af.addEventListener('click', function() {
      _form.eleves.forEach(function(code) { _form.phasesEleves[code] = 'formatif'; });
      _renderDispatch();
    });
    if (ac) ac.addEventListener('click', function() {
      _form.eleves.forEach(function(code) { _form.phasesEleves[code] = 'certificatif'; });
      _renderDispatch();
    });

    // Sections dépliables
    var compH = document.getElementById('tpCompHeader');
    var elvH = document.getElementById('tpElvHeader');
    if (compH) compH.addEventListener('click', function(e) {
      if (e.target.closest('#tpToggleAllComps')) return;
      _toggleZone('tpCompsZone', 'tpArrowComp');
    });
    if (elvH) elvH.addEventListener('click', function(e) {
      if (e.target.closest('#tpToggleAllElv')) return;
      _toggleZone('tpElevesZone', 'tpArrowElv');
    });

    // Soumission
    var sub = document.getElementById('tpSubmitBtn');
    if (sub) sub.addEventListener('click', _submit);
  }

  function _toggleZone(zoneId, arrowId) {
    var zone = document.getElementById(zoneId);
    var arrow = document.getElementById(arrowId);
    if (!zone) return;
    var hidden = (zone.style.display === 'none');
    zone.style.display = hidden ? 'flex' : 'none';
    if (arrow) arrow.textContent = hidden ? '▲' : '▼';
  }

  // ══════════════════════════════════════════════════════════════
  // SOUMISSION
  // ══════════════════════════════════════════════════════════════

  function _submit() {
    var titre = (document.getElementById('tpTitre').value || '').trim();
    var date = document.getElementById('tpDate').value || _today();

    if (!titre) { window.toast('Saisissez un titre', 'err'); return; }
    if (!_form.comps.length) { window.toast('Sélectionnez au moins une compétence', 'err'); return; }

    // Déterminer la phase dominante
    var phases = {};
    _form.eleves.forEach(function(code) {
      var p = _form.phasesEleves[code] || 'formatif';
      phases[p] = (phases[p] || 0) + 1;
    });
    var mainPhase = (phases['certificatif'] || 0) > (phases['formatif'] || 0) ? 'certificatif' : 'formatif';

    if (!window.appCfg) window.appCfg = {};
    if (!Array.isArray(window.appCfg.activites)) window.appCfg.activites = [];

    var act = {
      id: _nextId(),
      titre: titre,
      date: date,
      epreuve: _form.ep,
      competences: _form.comps.slice(),
      evaluateur: (window.cfg && window.cfg.nomProf) || '',
      phase: mainPhase,
      eleves: _form.eleves.slice(),
      elevesDetail: _form.eleves.map(function(code) {
        return { code: code, phase: _form.phasesEleves[code] || 'formatif' };
      }),
      phasesEleves: JSON.parse(JSON.stringify(_form.phasesEleves)),
      photos: [],
      obs: ''
    };

    window.appCfg.activites.push(act);
    if (typeof window.saveLocal === 'function') window.saveLocal();
    window.toast('TP « ' + act.titre + ' » créé (' + act.competences.length + ' comp., ' + act.eleves.length + ' élèves)', 'ok');
    window.closeModal();

    // Rafraîchir la liste si visible
    var el = document.getElementById('activitesList');
    if (el && window.activModule) window.activModule.renderList(el);

    // Ouvrir l'évaluation si des élèves sont sélectionnés
    if (act.eleves.length && window.activModule) {
      setTimeout(function() {
        // Utilise l'éval inline existante d'activites.js
        var card = document.querySelector('[data-act="openCard"][data-id="' + act.id + '"]');
        if (card) card.click();
      }, 300);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // EXPOSITION
  // ══════════════════════════════════════════════════════════════

  window.tpManager = {
    openCreate: openCreate
  };

})();
