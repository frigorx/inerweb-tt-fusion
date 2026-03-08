/**
 * activites.js — Module de gestion des activités pédagogiques (séances d'évaluation)
 * IIFE exposant window.activModule
 *
 * Globales attendues : appCfg, students, COMP_EP2, COMP_EP3, SIT_INFO,
 *                      curPhase, cfg.nomProf, saveLocal(), toast(),
 *                      showModal(titre, body, actions), closeModal()
 */
;(function () {
  'use strict';

  // Couleurs par épreuve
  var COULEURS = {
    'EP2':   '#2d5a8c',
    'EP3-A': '#8e44ad',
    'EP3-B': '#8e44ad',
    'EP3-C': '#8e44ad'
  };

  // ── Helpers ──────────────────────────────────────────────

  /** Génère l'ID auto-incrémenté ACT-XXX */
  function _nextId() {
    var acts = window.appCfg.activites || [];
    if (acts.length === 0) return 'ACT-001';
    var max = 0;
    acts.forEach(function (a) {
      var n = parseInt(a.id.replace('ACT-', ''), 10);
      if (n > max) max = n;
    });
    var next = String(max + 1);
    while (next.length < 3) next = '0' + next;
    return 'ACT-' + next;
  }

  /** Formate une date ISO en JJ/MM/AAAA */
  function _dateFR(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  /** Date du jour au format AAAA-MM-JJ */
  function _today() {
    var d = new Date();
    var m = String(d.getMonth() + 1); if (m.length < 2) m = '0' + m;
    var j = String(d.getDate()); if (j.length < 2) j = '0' + j;
    return d.getFullYear() + '-' + m + '-' + j;
  }

  /** Retourne les compétences filtrées selon l'épreuve */
  function _compsForEpreuve(epr) {
    if (epr === 'EP2') return window.COMP_EP2 || [];
    // EP3 : filtrer par situation A, B ou C
    var sit = epr.replace('EP3-', '');
    return (window.COMP_EP3 || []).filter(function (c) {
      return c.sits && c.sits.indexOf(sit) !== -1;
    });
  }

  /** Retourne le nom d'un élève à partir de son code */
  function _nomEleve(code) {
    if (!window.students) return code;
    var s = window.students.find(function (e) { return e.code === code; });
    return s ? (s.nom || s.prenom ? (s.nom || '') + ' ' + (s.prenom || '') : code) : code;
  }

  // ── API publique ────────────────────────────────────────

  /** Initialise appCfg.activites si absent */
  function init() {
    if (!window.appCfg) window.appCfg = {};
    if (!Array.isArray(window.appCfg.activites)) {
      window.appCfg.activites = [];
    }
  }

  /**
   * Affiche la liste des activités triées par date décroissante
   * @param {HTMLElement|string} container — élément ou sélecteur CSS
   */
  function renderList(container) {
    var el = typeof container === 'string'
      ? document.querySelector(container)
      : container;
    if (!el) return;

    var acts = (window.appCfg.activites || []).slice();
    // Tri par date décroissante
    acts.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });

    if (acts.length === 0) {
      el.innerHTML = '<p style="text-align:center;color:#888;padding:24px 0;">'
        + 'Aucune activité enregistrée.</p>';
      return;
    }

    var html = '';
    acts.forEach(function (act) {
      var couleur = COULEURS[act.epreuve] || '#555';
      var phBg = act.phase === 'certificatif' ? '#FF9800' : '#2196F3';

      // Chips de compétences
      var chips = (act.competences || []).map(function (c) {
        return '<span style="display:inline-block;padding:1px 7px;margin:2px;'
          + 'border-radius:10px;font-size:11px;background:' + couleur + '22;'
          + 'color:' + couleur + ';border:1px solid ' + couleur + '55;">' + c + '</span>';
      }).join('');

      html += '<div style="border-left:4px solid ' + couleur + ';background:#fff;'
        + 'border-radius:8px;padding:12px 16px;margin-bottom:10px;'
        + 'box-shadow:0 1px 3px rgba(0,0,0,.1);">'
        // Ligne titre + bouton supprimer
        + '<div style="display:flex;justify-content:space-between;align-items:center;">'
        + '<strong style="font-size:15px;">' + (act.titre || 'Sans titre') + '</strong>'
        + '<button onclick="activModule.delete(\'' + act.id + '\')" '
        + 'style="background:none;border:none;cursor:pointer;font-size:18px;color:#c0392b;" '
        + 'title="Supprimer">&times;</button>'
        + '</div>'
        // Ligne date + badges
        + '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px;">'
        + '<span style="font-size:13px;color:#555;">' + _dateFR(act.date) + '</span>'
        + '<span style="display:inline-block;padding:1px 8px;border-radius:10px;'
        + 'font-size:12px;color:#fff;background:' + couleur + ';">' + act.epreuve + '</span>'
        + '<span style="display:inline-block;padding:1px 8px;border-radius:10px;'
        + 'font-size:12px;color:#fff;background:' + phBg + ';">' + act.phase + '</span>'
        + '<span style="font-size:12px;color:#777;">'
        + (act.eleves ? act.eleves.length : 0) + ' \u00e9l\u00e8ve(s)</span>'
        + '</div>'
        // Compétences
        + (chips ? '<div style="margin-top:6px;">' + chips + '</div>' : '')
        // Observations
        + (act.obs ? '<div style="margin-top:4px;font-size:12px;color:#666;font-style:italic;">'
          + act.obs + '</div>' : '')
        + '</div>';
    });

    el.innerHTML = html;
  }

  /** Affiche la modale de création d'activité */
  function showCreateModal() {
    var body = '';

    // Titre
    body += '<div style="margin-bottom:10px;">'
      + '<label style="font-weight:600;display:block;margin-bottom:3px;">Titre</label>'
      + '<input id="actTitre" type="text" placeholder="Ex : Brasage atelier S12" '
      + 'style="width:100%;padding:6px 8px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">'
      + '</div>';

    // Date
    body += '<div style="margin-bottom:10px;">'
      + '<label style="font-weight:600;display:block;margin-bottom:3px;">Date</label>'
      + '<input id="actDate" type="date" value="' + _today() + '" '
      + 'style="padding:6px 8px;border:1px solid #ccc;border-radius:6px;">'
      + '</div>';

    // Épreuve
    body += '<div style="margin-bottom:10px;">'
      + '<label style="font-weight:600;display:block;margin-bottom:3px;">\u00c9preuve</label>'
      + '<select id="actEpreuve" onchange="activModule._onEpreuveChange()" '
      + 'style="padding:6px 8px;border:1px solid #ccc;border-radius:6px;">'
      + '<option value="EP2">EP2</option>'
      + '<option value="EP3-A">EP3-A</option>'
      + '<option value="EP3-B">EP3-B</option>'
      + '<option value="EP3-C">EP3-C</option>'
      + '</select></div>';

    // Phase
    body += '<div style="margin-bottom:10px;">'
      + '<label style="font-weight:600;display:block;margin-bottom:3px;">Phase</label>'
      + '<select id="actPhase" style="padding:6px 8px;border:1px solid #ccc;border-radius:6px;">'
      + '<option value="formatif"' + (window.curPhase === 'formatif' ? ' selected' : '') + '>Formatif</option>'
      + '<option value="certificatif"' + (window.curPhase === 'certificatif' ? ' selected' : '') + '>Certificatif</option>'
      + '</select></div>';

    // Compétences (conteneur dynamique)
    body += '<div style="margin-bottom:10px;">'
      + '<label style="font-weight:600;display:block;margin-bottom:3px;">Comp\u00e9tences cibl\u00e9es</label>'
      + '<div id="actCompsZone" style="max-height:140px;overflow-y:auto;'
      + 'border:1px solid #eee;border-radius:6px;padding:6px;"></div></div>';

    // Élèves
    body += '<div style="margin-bottom:10px;">'
      + '<label style="font-weight:600;display:block;margin-bottom:3px;">\u00c9l\u00e8ves participants</label>'
      + '<div id="actElevesZone" style="max-height:160px;overflow-y:auto;'
      + 'border:1px solid #eee;border-radius:6px;padding:6px;">';
    if (window.students && window.students.length) {
      window.students.forEach(function (s) {
        var nom = (s.nom || '') + ' ' + (s.prenom || '') || s.code;
        body += '<label style="display:block;padding:2px 0;cursor:pointer;">'
          + '<input type="checkbox" class="actElvCb" value="' + s.code + '"> '
          + nom.trim() + '</label>';
      });
    } else {
      body += '<span style="color:#888;">Aucun \u00e9l\u00e8ve charg\u00e9</span>';
    }
    body += '</div></div>';

    // Bouton de validation dans la zone actions de la modale
    var actions = '<button onclick="activModule._submitCreate()" '
      + 'style="padding:8px 20px;background:#2d5a8c;color:#fff;border:none;'
      + 'border-radius:8px;cursor:pointer;font-size:14px;">Cr\u00e9er l\'activit\u00e9</button>';

    window.showModal('Nouvelle activit\u00e9', body, actions);

    // Remplir les compétences selon l'épreuve par défaut
    _refreshComps();
  }

  /** Met à jour les checkboxes de compétences selon l'épreuve sélectionnée */
  function _refreshComps() {
    var sel = document.getElementById('actEpreuve');
    var zone = document.getElementById('actCompsZone');
    if (!sel || !zone) return;

    var comps = _compsForEpreuve(sel.value);
    if (comps.length === 0) {
      zone.innerHTML = '<span style="color:#888;">Aucune comp\u00e9tence</span>';
      return;
    }
    zone.innerHTML = comps.map(function (c) {
      return '<label style="display:block;padding:2px 0;cursor:pointer;">'
        + '<input type="checkbox" class="actCompCb" value="' + c.code + '"> '
        + c.code + ' — ' + c.nom + '</label>';
    }).join('');
  }

  /** Callback changement d'épreuve dans la modale */
  function _onEpreuveChange() {
    _refreshComps();
  }

  /** Soumission du formulaire de création */
  function _submitCreate() {
    var titre = (document.getElementById('actTitre').value || '').trim();
    var date = document.getElementById('actDate').value || _today();
    var epreuve = document.getElementById('actEpreuve').value;
    var phase = document.getElementById('actPhase').value;

    // Compétences cochées
    var comps = [];
    document.querySelectorAll('.actCompCb:checked').forEach(function (cb) {
      comps.push(cb.value);
    });

    // Élèves cochés
    var eleves = [];
    document.querySelectorAll('.actElvCb:checked').forEach(function (cb) {
      eleves.push(cb.value);
    });

    if (!titre) {
      if (typeof window.toast === 'function') window.toast('Veuillez saisir un titre.', 'err');
      return;
    }
    if (comps.length === 0) {
      if (typeof window.toast === 'function') window.toast('S\u00e9lectionnez au moins une comp\u00e9tence.', 'err');
      return;
    }

    create({
      titre: titre,
      date: date,
      epreuve: epreuve,
      competences: comps,
      evaluateur: (window.cfg && window.cfg.nomProf) || '',
      phase: phase,
      eleves: eleves,
      obs: ''
    });

    window.closeModal();
  }

  /**
   * Crée une activité et la stocke
   * @param {Object} data — champs de l'activité (sans id)
   */
  function create(data) {
    init(); // s'assurer que le tableau existe
    var act = {
      id:           _nextId(),
      titre:        data.titre || '',
      date:         data.date || _today(),
      epreuve:      data.epreuve || 'EP2',
      contexte:     data.contexte || '',
      competences:  data.competences || [],
      evaluateur:   data.evaluateur || '',
      phase:        data.phase || 'formatif',
      eleves:       data.eleves || [],
      obs:          data.obs || ''
    };
    window.appCfg.activites.push(act);
    if (typeof window.saveLocal === 'function') window.saveLocal();
    if (typeof window.toast === 'function') {
      window.toast('Activit\u00e9 \u00ab ' + act.titre + ' \u00bb cr\u00e9\u00e9e.');
    }
    return act;
  }

  /**
   * Supprime une activité après confirmation
   * @param {string} id — identifiant ACT-XXX
   */
  function del(id) {
    if (!confirm('Supprimer cette activit\u00e9 ?')) return;
    var acts = window.appCfg.activites || [];
    window.appCfg.activites = acts.filter(function (a) { return a.id !== id; });
    if (typeof window.saveLocal === 'function') window.saveLocal();
    if (typeof window.toast === 'function') window.toast('Activit\u00e9 supprim\u00e9e.');
  }

  /**
   * Retourne les activités auxquelles un élève participe
   * @param {string} code — code élève (ELV-XXX)
   * @returns {Array}
   */
  function getForStudent(code) {
    return (window.appCfg.activites || []).filter(function (a) {
      return a.eleves && a.eleves.indexOf(code) !== -1;
    });
  }

  /**
   * Retourne des statistiques sur les activités
   * @returns {Object} {total, byEpreuve, byPhase}
   */
  function getStats() {
    var acts = window.appCfg.activites || [];
    var stats = {
      total: acts.length,
      byEpreuve: { 'EP2': 0, 'EP3-A': 0, 'EP3-B': 0, 'EP3-C': 0 },
      byPhase:   { formatif: 0, certificatif: 0 }
    };
    acts.forEach(function (a) {
      if (stats.byEpreuve.hasOwnProperty(a.epreuve)) stats.byEpreuve[a.epreuve]++;
      if (stats.byPhase.hasOwnProperty(a.phase))     stats.byPhase[a.phase]++;
    });
    return stats;
  }

  // ── Exposition globale ─────────────────────────────────

  window.activModule = {
    init:            init,
    renderList:      renderList,
    showCreateModal: showCreateModal,
    create:          create,
    'delete':        del,
    getForStudent:   getForStudent,
    getStats:        getStats,
    // Callbacks internes utilisés par le HTML de la modale
    _onEpreuveChange: _onEpreuveChange,
    _submitCreate:    _submitCreate
  };

})();
