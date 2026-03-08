/**
 * activites.js — Module activités pédagogiques (séances d'évaluation)
 * Version Fusion — UX optimisée mobile + PC
 *
 * Globales : appCfg, students, COMP_EP2, COMP_EP3, SIT_INFO,
 *            curPhase, cfg.nomProf, saveLocal(), toast(),
 *            showModal(), closeModal()
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

  // ── Helpers ──

  function _nextId() {
    var acts = window.appCfg.activites || [];
    var max = 0;
    acts.forEach(function (a) {
      var n = parseInt(a.id.replace('ACT-', ''), 10);
      if (n > max) max = n;
    });
    return 'ACT-' + String(max + 1).padStart(3, '0');
  }

  function _dateFR(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function _today() {
    return new Date().toISOString().split('T')[0];
  }

  function _compsForEpreuve(epr) {
    if (epr === 'EP2') return window.COMP_EP2 || [];
    var sit = epr.replace('EP3-', '');
    return (window.COMP_EP3 || []).filter(function (c) {
      return c.sits && c.sits.indexOf(sit) !== -1;
    });
  }

  // ── Rendu liste ──

  function renderList(container) {
    var el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    var acts = (window.appCfg.activites || []).slice();
    acts.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });

    if (acts.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--gris)">'
        + '<div style="font-size:2.5rem;margin-bottom:.5rem">📋</div>'
        + '<p style="font-weight:700;margin-bottom:.25rem">Aucune activité</p>'
        + '<p style="font-size:.78rem">Créez votre première séance d\'évaluation</p></div>';
      return;
    }

    el.innerHTML = acts.map(function (act) {
      var c = COULEURS[act.epreuve] || {bg:'#555',light:'#f5f5f5'};
      var nbEleves = (act.eleves || []).length;
      var nbComps = (act.competences || []).length;

      // Noms des élèves (max 3 affichés)
      var noms = (act.eleves || []).slice(0, 3).map(function(code) {
        var s = (window.students || []).find(function(e){return e.code===code;});
        return s ? s.nom : code;
      });
      var nomsStr = noms.join(', ') + (nbEleves > 3 ? ' +' + (nbEleves - 3) : '');

      return '<div style="background:' + c.light + ';border-left:4px solid ' + c.bg
        + ';border-radius:10px;padding:.75rem 1rem;margin-bottom:.5rem;'
        + 'box-shadow:0 1px 4px rgba(0,0,0,.06);" onclick="activModule._showDetail(\'' + act.id + '\')">'
        // Ligne 1 : titre + épreuve
        + '<div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem">'
        + '<strong style="font-size:.88rem;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'
        + (act.titre || 'Sans titre') + '</strong>'
        + '<span style="background:' + c.bg + ';color:#fff;padding:.15rem .5rem;border-radius:8px;'
        + 'font-size:.7rem;font-weight:700;white-space:nowrap">' + act.epreuve + '</span>'
        + '</div>'
        // Ligne 2 : date + phase + compteurs
        + '<div style="display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin-top:.4rem;font-size:.75rem;color:var(--gris)">'
        + '<span>📅 ' + _dateFR(act.date) + '</span>'
        + '<span style="background:' + (act.phase === 'certificatif' ? 'var(--orange)' : 'var(--bleu2)')
        + ';color:#fff;padding:.1rem .4rem;border-radius:6px;font-size:.65rem;font-weight:700">'
        + (act.phase === 'certificatif' ? '📙 Certif.' : '📘 Format.') + '</span>'
        + '<span>👥 ' + nbEleves + '</span>'
        + '<span>🎯 ' + nbComps + ' comp.</span>'
        + '</div>'
        // Ligne 3 : noms élèves
        + (nomsStr ? '<div style="margin-top:.3rem;font-size:.72rem;color:#666">' + nomsStr + '</div>' : '')
        + '</div>';
    }).join('');
  }

  // ── Détail d'une activité ──

  function _showDetail(id) {
    var act = (window.appCfg.activites || []).find(function(a){return a.id===id;});
    if (!act) return;
    var c = COULEURS[act.epreuve] || {bg:'#555',light:'#f5f5f5'};

    var body = '<div style="font-size:.85rem">';
    body += '<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.75rem">';
    body += '<span style="background:' + c.bg + ';color:#fff;padding:.2rem .6rem;border-radius:8px;font-weight:700;font-size:.78rem">'
      + (EP_LABELS[act.epreuve] || act.epreuve) + '</span>';
    body += '<span style="background:' + (act.phase === 'certificatif' ? 'var(--orange)' : 'var(--bleu2)')
      + ';color:#fff;padding:.2rem .6rem;border-radius:8px;font-weight:700;font-size:.78rem">'
      + (act.phase === 'certificatif' ? '📙 Certificatif' : '📘 Formatif') + '</span>';
    body += '<span style="background:var(--gris3);padding:.2rem .6rem;border-radius:8px;font-size:.78rem">📅 '
      + _dateFR(act.date) + '</span>';
    body += '</div>';

    // Compétences
    body += '<div style="font-weight:700;margin-bottom:.3rem">🎯 Compétences ciblées</div>';
    body += '<div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-bottom:.75rem">';
    (act.competences || []).forEach(function(code) {
      var comp = (window.COMP_EP2 || []).concat(window.COMP_EP3 || []).find(function(x){return x.code===code;});
      body += '<span style="background:' + c.light + ';border:1px solid ' + c.bg + '44;color:' + c.bg
        + ';padding:.2rem .5rem;border-radius:8px;font-size:.75rem;font-weight:600">'
        + code + (comp ? ' ' + comp.nom : '') + '</span>';
    });
    body += '</div>';

    // Élèves
    body += '<div style="font-weight:700;margin-bottom:.3rem">👥 Élèves (' + (act.eleves||[]).length + ')</div>';
    body += '<div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-bottom:.75rem">';
    (act.eleves || []).forEach(function(code) {
      var s = (window.students || []).find(function(e){return e.code===code;});
      body += '<span style="background:#f0f0f0;padding:.2rem .5rem;border-radius:8px;font-size:.75rem">'
        + (s ? s.nom + ' ' + (s.prenom || '') : code) + '</span>';
    });
    if (!(act.eleves||[]).length) body += '<span style="color:#888;font-size:.78rem">Aucun élève</span>';
    body += '</div>';

    // Évaluateur
    if (act.evaluateur) {
      body += '<div style="font-size:.78rem;color:var(--gris)">✏️ Évaluateur : ' + act.evaluateur + '</div>';
    }
    body += '</div>';

    var actions = '<button onclick="activModule.delete(\'' + act.id + '\');closeModal()" '
      + 'class="btn btn-rouge btn-sm">🗑️ Supprimer</button>';

    window.showModal('📋 ' + (act.titre || 'Activité'), body, actions);
  }

  // ── Création — Interface plein écran ergonomique ──

  function showCreateModal() {
    var sts = window.students || [];

    var body = '<div style="font-size:.85rem">';

    // ── Épreuve — gros boutons tactiles ──
    body += '<div style="font-weight:700;margin-bottom:.4rem">Épreuve</div>';
    body += '<div id="actEprBtns" style="display:grid;grid-template-columns:1fr 1fr;gap:.4rem;margin-bottom:.75rem">';
    ['EP2','EP3-A','EP3-B','EP3-C'].forEach(function(ep) {
      var c = COULEURS[ep];
      body += '<button type="button" class="actEprBtn" data-ep="' + ep + '" onclick="activModule._pickEp(\'' + ep + '\')" '
        + 'style="padding:.6rem;border:2px solid ' + c.bg + ';background:' + c.light + ';color:' + c.bg
        + ';border-radius:10px;font-weight:700;font-size:.82rem;cursor:pointer;transition:all .2s">'
        + ep + '</button>';
    });
    body += '</div>';

    // ── Phase — deux gros boutons ──
    body += '<div style="font-weight:700;margin-bottom:.4rem">Phase</div>';
    body += '<div id="actPhaseBtns" style="display:grid;grid-template-columns:1fr 1fr;gap:.4rem;margin-bottom:.75rem">';
    body += '<button type="button" class="actPhBtn" data-ph="formatif" onclick="activModule._pickPhase(\'formatif\')" '
      + 'style="padding:.5rem;border:2px solid var(--bleu2);background:var(--bleu3);color:var(--bleu2);border-radius:10px;font-weight:700;font-size:.82rem;cursor:pointer">'
      + '📘 Formatif</button>';
    body += '<button type="button" class="actPhBtn" data-ph="certificatif" onclick="activModule._pickPhase(\'certificatif\')" '
      + 'style="padding:.5rem;border:2px solid var(--orange);background:var(--orange2);color:var(--orange);border-radius:10px;font-weight:700;font-size:.82rem;cursor:pointer">'
      + '📙 Certificatif</button>';
    body += '</div>';

    // ── Titre ──
    body += '<div style="margin-bottom:.75rem">';
    body += '<div style="font-weight:700;margin-bottom:.3rem">Titre de la séance</div>';
    body += '<input id="actTitre" type="text" placeholder="Ex : Brasage atelier S12" '
      + 'style="width:100%;padding:.5rem .75rem;border:2px solid var(--gris3);border-radius:10px;font-size:.85rem;box-sizing:border-box">';
    body += '</div>';

    // ── Date ──
    body += '<div style="margin-bottom:.75rem">';
    body += '<div style="font-weight:700;margin-bottom:.3rem">Date</div>';
    body += '<input id="actDate" type="date" value="' + _today() + '" '
      + 'style="padding:.5rem .75rem;border:2px solid var(--gris3);border-radius:10px;font-size:.85rem">';
    body += '</div>';

    // ── Compétences — boutons toggle ──
    body += '<div style="margin-bottom:.75rem">';
    body += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.3rem">'
      + '<span style="font-weight:700">🎯 Compétences</span>'
      + '<button type="button" onclick="activModule._toggleAllComps()" '
      + 'style="background:none;border:1px solid var(--gris3);border-radius:6px;padding:.2rem .5rem;font-size:.7rem;cursor:pointer">Tout cocher</button>'
      + '</div>';
    body += '<div id="actCompsZone" style="display:flex;flex-wrap:wrap;gap:.3rem"></div>';
    body += '</div>';

    // ── Élèves — boutons toggle ──
    body += '<div style="margin-bottom:.5rem">';
    body += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.3rem">'
      + '<span style="font-weight:700">👥 Élèves <span id="actElvCount" style="font-weight:400;color:var(--gris);font-size:.78rem">(0/' + sts.length + ')</span></span>'
      + '<button type="button" onclick="activModule._toggleAllEleves()" '
      + 'style="background:none;border:1px solid var(--gris3);border-radius:6px;padding:.2rem .5rem;font-size:.7rem;cursor:pointer">Tout cocher</button>'
      + '</div>';
    body += '<div id="actElevesZone" style="display:flex;flex-wrap:wrap;gap:.3rem">';
    if (sts.length) {
      sts.forEach(function (s) {
        body += '<button type="button" class="actElvBtn" data-code="' + s.code + '" '
          + 'onclick="activModule._toggleEleve(this)" '
          + 'style="padding:.35rem .6rem;border:2px solid var(--gris3);background:#fff;border-radius:8px;'
          + 'font-size:.78rem;cursor:pointer;transition:all .15s;font-weight:600">'
          + (s.nom || '') + ' ' + (s.prenom ? s.prenom.charAt(0) + '.' : '') + '</button>';
      });
    } else {
      body += '<span style="color:var(--rouge);font-size:.78rem;font-weight:600">⚠️ Synchronisez d\'abord vos élèves (onglet Élèves)</span>';
    }
    body += '</div></div>';

    body += '</div>';

    var actions = '<button onclick="activModule._submitCreate()" '
      + 'class="btn btn-primary" style="width:100%;padding:.7rem;font-size:.9rem">✅ Créer l\'activité</button>';

    window.showModal('📋 Nouvelle activité', body, actions);

    // État interne
    window._actState = { ep: 'EP2', phase: window.curPhase || 'formatif', comps: [], eleves: [] };
    _pickEp('EP2');
    _pickPhase(window._actState.phase);
  }

  // ── Interactions modale ──

  function _pickEp(ep) {
    window._actState.ep = ep;
    window._actState.comps = [];
    // Highlight bouton
    document.querySelectorAll('.actEprBtn').forEach(function(btn) {
      var isActive = btn.dataset.ep === ep;
      var c = COULEURS[btn.dataset.ep];
      btn.style.background = isActive ? c.bg : c.light;
      btn.style.color = isActive ? '#fff' : c.bg;
    });
    // Rafraîchir compétences
    var zone = document.getElementById('actCompsZone');
    if (!zone) return;
    var comps = _compsForEpreuve(ep);
    var c = COULEURS[ep];
    zone.innerHTML = comps.map(function(comp) {
      return '<button type="button" class="actCompBtn" data-code="' + comp.code + '" '
        + 'onclick="activModule._toggleComp(this)" '
        + 'style="padding:.35rem .6rem;border:2px solid ' + c.bg + '44;background:#fff;border-radius:8px;'
        + 'font-size:.78rem;cursor:pointer;transition:all .15s;font-weight:600;color:' + c.bg + '">'
        + comp.code + ' ' + comp.nom + '</button>';
    }).join('');
  }

  function _pickPhase(ph) {
    window._actState.phase = ph;
    document.querySelectorAll('.actPhBtn').forEach(function(btn) {
      var isActive = btn.dataset.ph === ph;
      if (ph === 'formatif') {
        btn.style.background = isActive && btn.dataset.ph === 'formatif' ? 'var(--bleu2)' : (btn.dataset.ph === 'formatif' ? 'var(--bleu3)' : 'var(--orange2)');
        btn.style.color = isActive && btn.dataset.ph === 'formatif' ? '#fff' : (btn.dataset.ph === 'formatif' ? 'var(--bleu2)' : 'var(--orange)');
      } else {
        btn.style.background = isActive && btn.dataset.ph === 'certificatif' ? 'var(--orange)' : (btn.dataset.ph === 'certificatif' ? 'var(--orange2)' : 'var(--bleu3)');
        btn.style.color = isActive && btn.dataset.ph === 'certificatif' ? '#fff' : (btn.dataset.ph === 'certificatif' ? 'var(--orange)' : 'var(--bleu2)');
      }
    });
  }

  function _toggleComp(btn) {
    var code = btn.dataset.code;
    var c = COULEURS[window._actState.ep];
    var idx = window._actState.comps.indexOf(code);
    if (idx === -1) {
      window._actState.comps.push(code);
      btn.style.background = c.bg;
      btn.style.color = '#fff';
    } else {
      window._actState.comps.splice(idx, 1);
      btn.style.background = '#fff';
      btn.style.color = c.bg;
    }
  }

  function _toggleEleve(btn) {
    var code = btn.dataset.code;
    var idx = window._actState.eleves.indexOf(code);
    if (idx === -1) {
      window._actState.eleves.push(code);
      btn.style.background = 'var(--bleu2)';
      btn.style.color = '#fff';
      btn.style.borderColor = 'var(--bleu2)';
    } else {
      window._actState.eleves.splice(idx, 1);
      btn.style.background = '#fff';
      btn.style.color = 'inherit';
      btn.style.borderColor = 'var(--gris3)';
    }
    var cnt = document.getElementById('actElvCount');
    if (cnt) cnt.textContent = '(' + window._actState.eleves.length + '/' + (window.students||[]).length + ')';
  }

  function _toggleAllComps() {
    var btns = document.querySelectorAll('.actCompBtn');
    var allSelected = window._actState.comps.length === btns.length;
    if (allSelected) {
      window._actState.comps = [];
      btns.forEach(function(btn) {
        var c = COULEURS[window._actState.ep];
        btn.style.background = '#fff';
        btn.style.color = c.bg;
      });
    } else {
      window._actState.comps = [];
      btns.forEach(function(btn) {
        window._actState.comps.push(btn.dataset.code);
        var c = COULEURS[window._actState.ep];
        btn.style.background = c.bg;
        btn.style.color = '#fff';
      });
    }
  }

  function _toggleAllEleves() {
    var btns = document.querySelectorAll('.actElvBtn');
    var allSelected = window._actState.eleves.length === btns.length;
    if (allSelected) {
      window._actState.eleves = [];
      btns.forEach(function(btn) {
        btn.style.background = '#fff';
        btn.style.color = 'inherit';
        btn.style.borderColor = 'var(--gris3)';
      });
    } else {
      window._actState.eleves = [];
      btns.forEach(function(btn) {
        window._actState.eleves.push(btn.dataset.code);
        btn.style.background = 'var(--bleu2)';
        btn.style.color = '#fff';
        btn.style.borderColor = 'var(--bleu2)';
      });
    }
    var cnt = document.getElementById('actElvCount');
    if (cnt) cnt.textContent = '(' + window._actState.eleves.length + '/' + (window.students||[]).length + ')';
  }

  function _submitCreate() {
    var titre = (document.getElementById('actTitre').value || '').trim();
    var date = document.getElementById('actDate').value || _today();
    var st = window._actState;

    if (!titre) { window.toast('Saisissez un titre', 'err'); return; }
    if (!st.comps.length) { window.toast('Sélectionnez au moins une compétence', 'err'); return; }

    create({
      titre: titre,
      date: date,
      epreuve: st.ep,
      competences: st.comps,
      evaluateur: (window.cfg && window.cfg.nomProf) || '',
      phase: st.phase,
      eleves: st.eleves,
      obs: ''
    });

    window.closeModal();
    // Rafraîchir la liste
    var el = document.getElementById('activitesList');
    if (el) renderList(el);
  }

  // ── CRUD ──

  function init() {
    if (!window.appCfg) window.appCfg = {};
    if (!Array.isArray(window.appCfg.activites)) window.appCfg.activites = [];
  }

  function create(data) {
    init();
    var act = {
      id: _nextId(), titre: data.titre || '', date: data.date || _today(),
      epreuve: data.epreuve || 'EP2', contexte: data.contexte || '',
      competences: data.competences || [], evaluateur: data.evaluateur || '',
      phase: data.phase || 'formatif', eleves: data.eleves || [], obs: data.obs || ''
    };
    window.appCfg.activites.push(act);
    if (typeof window.saveLocal === 'function') window.saveLocal();
    window.toast('Activité « ' + act.titre + ' » créée', 'ok');
    return act;
  }

  function del(id) {
    if (!confirm('Supprimer cette activité ?')) return;
    window.appCfg.activites = (window.appCfg.activites || []).filter(function(a){return a.id !== id;});
    if (typeof window.saveLocal === 'function') window.saveLocal();
    window.toast('Activité supprimée', 'inf');
    var el = document.getElementById('activitesList');
    if (el) renderList(el);
  }

  function getForStudent(code) {
    return (window.appCfg.activites || []).filter(function(a){
      return a.eleves && a.eleves.indexOf(code) !== -1;
    });
  }

  function getStats() {
    var acts = window.appCfg.activites || [];
    var s = { total: acts.length, byEpreuve: {'EP2':0,'EP3-A':0,'EP3-B':0,'EP3-C':0}, byPhase: {formatif:0,certificatif:0} };
    acts.forEach(function(a) {
      if (s.byEpreuve.hasOwnProperty(a.epreuve)) s.byEpreuve[a.epreuve]++;
      if (s.byPhase.hasOwnProperty(a.phase)) s.byPhase[a.phase]++;
    });
    return s;
  }

  // ── Exposition globale ──

  window.activModule = {
    init: init, renderList: renderList, showCreateModal: showCreateModal,
    create: create, 'delete': del, getForStudent: getForStudent, getStats: getStats,
    _pickEp: _pickEp, _pickPhase: _pickPhase,
    _toggleComp: _toggleComp, _toggleEleve: _toggleEleve,
    _toggleAllComps: _toggleAllComps, _toggleAllEleves: _toggleAllEleves,
    _submitCreate: _submitCreate, _showDetail: _showDetail
  };

})();
