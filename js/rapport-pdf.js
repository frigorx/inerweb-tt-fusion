/**
 * rapport-pdf.js — Module de génération des rapports PDF pour inerWeb TT CCF
 *
 * Génère :
 *   - rapportModule.generate()           → rapport d'inspection synthétique (multi-pages)
 *   - rapportModule.generateStudentPDF(code) → fiche individuelle élève
 *
 * Globales attendues : students, validations, notes, appCfg,
 *   COMP_EP2, COMP_EP3, NV_PCT, COEF_OBL, calcNote
 * Optionnelles : window.juryModule, window.expoModule, window.imposModule
 * Dépendance : jsPDF (window.jspdf.jsPDF)
 */
window.rapportModule = (function () {
  'use strict';

  /* ── Constantes de mise en page ───────────────────────────── */
  var MG = 15;          // marge gauche
  var MD = 15;          // marge droite
  var MH = 15;          // marge haute
  var MB = 22;          // marge basse (réservée au footer)
  var LH = 6;           // hauteur de ligne standard
  var VERT  = [46, 125, 50];
  var ROUGE = [198, 40, 40];
  var GRIS  = [100, 100, 100];
  var NOIR  = [0, 0, 0];
  var BLEU  = [33, 80, 150];

  /* ── Utilitaires ──────────────────────────────────────────── */

  /** Date formatée JJ/MM/AAAA */
  function dateFR() {
    var d = new Date();
    return ('0' + d.getDate()).slice(-2) + '/' +
           ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
  }

  /** Largeur utile de la page */
  function pw(doc) { return doc.internal.pageSize.getWidth() - MG - MD; }

  /** Hauteur utile de la page */
  function ph(doc) { return doc.internal.pageSize.getHeight() - MB; }

  /** Ajoute le footer sur chaque page du document */
  function addFooters(doc) {
    var total = doc.internal.getNumberOfPages();
    for (var i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor.apply(doc, GRIS);
      var y = doc.internal.pageSize.getHeight() - 8;
      doc.text('inerWeb \u00c9du \u2014 Rapport Inspection CCF', MG, y);
      doc.text(dateFR(), doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
      doc.text('Page ' + i + '/' + total,
        doc.internal.pageSize.getWidth() - MD, y, { align: 'right' });
    }
  }

  /** Vérifie qu'il reste de la place, sinon crée une nouvelle page */
  function checkPage(doc, y, needed) {
    if (y + (needed || LH) > ph(doc)) {
      doc.addPage();
      return MH;
    }
    return y;
  }

  /** Tri alphabétique par nom puis prénom */
  function sortStudents(arr) {
    return arr.slice().sort(function (a, b) {
      var cmp = (a.nom || '').localeCompare(b.nom || '', 'fr');
      return cmp !== 0 ? cmp : (a.prenom || '').localeCompare(b.prenom || '', 'fr');
    });
  }

  /* ── Page 1 : Couverture ──────────────────────────────────── */

  function pageCouverture(doc) {
    var cfg = window.appCfg || {};
    var cx = doc.internal.pageSize.getWidth() / 2;
    var y = 60;

    doc.setFontSize(18);
    doc.setTextColor.apply(doc, BLEU);
    doc.text('RAPPORT D\u2019INSPECTION', cx, y, { align: 'center' });
    y += 9;
    doc.setFontSize(14);
    doc.text('Contr\u00f4le en Cours de Formation', cx, y, { align: 'center' });
    y += 16;

    doc.setFontSize(12);
    doc.setTextColor.apply(doc, NOIR);
    doc.text('CAP Installateur en Froid et Conditionnement d\u2019Air', cx, y, { align: 'center' });
    y += 20;

    doc.setFontSize(11);
    var infos = [
      ['\u00c9tablissement', cfg.etablissement || '\u2014'],
      ['Ville',           cfg.ville || '\u2014'],
      ['Acad\u00e9mie',   cfg.academie || '\u2014'],
      ['Session',         cfg.session || '\u2014'],
      ['Date de g\u00e9n\u00e9ration', dateFR()]
    ];
    for (var i = 0; i < infos.length; i++) {
      doc.setFont(undefined, 'bold');
      doc.text(infos[i][0] + ' :', cx - 30, y, { align: 'right' });
      doc.setFont(undefined, 'normal');
      doc.text(infos[i][1], cx - 25, y);
      y += 8;
    }
  }

  /* ── Pages 2+ : Tableau synthèse des élèves ──────────────── */

  function pageTableau(doc) {
    doc.addPage();
    var y = MH;
    doc.setFontSize(13);
    doc.setTextColor.apply(doc, BLEU);
    doc.text('Synth\u00e8se des r\u00e9sultats', MG, y);
    y += 10;

    // En-têtes du tableau
    var cols = ['N\u00b0', 'Nom', 'Pr\u00e9nom', 'Classe',
                'EP2/20', 'EP3/20', '\u00c9lig.EP2', '\u00c9lig.EP3', 'Expo %'];
    var cw = [10, 32, 28, 18, 18, 18, 18, 18, 18];

    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFillColor.apply(doc, BLEU);
    var x = MG;
    for (var c = 0; c < cols.length; c++) {
      doc.rect(x, y - 4, cw[c], LH, 'F');
      doc.text(cols[c], x + 1, y);
      x += cw[c];
    }
    y += LH;

    // Lignes
    var sorted = sortStudents(window.students || []);
    doc.setFont(undefined, 'normal');
    for (var i = 0; i < sorted.length; i++) {
      y = checkPage(doc, y, LH + 2);
      // Ré-afficher l'en-tête si nouvelle page
      if (y === MH) {
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 255, 255);
        doc.setFillColor.apply(doc, BLEU);
        x = MG;
        for (c = 0; c < cols.length; c++) {
          doc.rect(x, y - 4, cw[c], LH, 'F');
          doc.text(cols[c], x + 1, y);
          x += cw[c];
        }
        y += LH;
        doc.setFont(undefined, 'normal');
      }

      var s = sorted[i];
      var e2 = calcNote(s.code, 'EP2');
      var e3 = calcNote(s.code, 'EP3');
      var expo = window.expoModule ? window.expoModule.calc(s.code) : null;
      var expoPct = expo ? expo.pct + '' : '\u2014';

      // Alternance de fond
      if (i % 2 === 0) {
        doc.setFillColor(240, 240, 245);
        doc.rect(MG, y - 4, pw(doc), LH, 'F');
      }

      x = MG;
      var vals = [
        (i + 1) + '', s.nom || '', s.prenom || '', s.classe || '',
        e2.note.toFixed(1), e3.note.toFixed(1),
        e2.elig ? 'Oui' : 'Non', e3.elig ? 'Oui' : 'Non', expoPct
      ];
      for (c = 0; c < vals.length; c++) {
        // Couleurs pour les notes
        if (c === 4) doc.setTextColor.apply(doc, e2.note >= 10 ? VERT : ROUGE);
        else if (c === 5) doc.setTextColor.apply(doc, e3.note >= 10 ? VERT : ROUGE);
        else if (c === 6) doc.setTextColor.apply(doc, e2.elig ? VERT : ROUGE);
        else if (c === 7) doc.setTextColor.apply(doc, e3.elig ? VERT : ROUGE);
        else doc.setTextColor.apply(doc, NOIR);
        doc.text(vals[c], x + 1, y);
        x += cw[c];
      }
      y += LH;
    }
    doc.setTextColor.apply(doc, NOIR);
  }

  /* ── Page Statistiques ────────────────────────────────────── */

  function pageStatistiques(doc) {
    doc.addPage();
    var y = MH;
    var sts = window.students || [];
    var total = sts.length;

    doc.setFontSize(13);
    doc.setTextColor.apply(doc, BLEU);
    doc.text('Statistiques g\u00e9n\u00e9rales', MG, y);
    y += 12;

    // Calcul des agrégats
    var nbEligEP2 = 0, nbEligEP3 = 0, somEP2 = 0, somEP3 = 0;
    var distrib = { PM: 0, M: 0, EC: 0, NE: 0 };

    sts.forEach(function (s) {
      var e2 = calcNote(s.code, 'EP2');
      var e3 = calcNote(s.code, 'EP3');
      if (e2.elig) nbEligEP2++;
      if (e3.elig) nbEligEP3++;
      somEP2 += e2.note;
      somEP3 += e3.note;
      // Distribution des niveaux sur toutes les compétences
      e2.det.forEach(function (d) { if (distrib[d.lv] !== undefined) distrib[d.lv]++; });
      e3.det.forEach(function (d) { if (distrib[d.lv] !== undefined) distrib[d.lv]++; });
    });

    doc.setFontSize(10);
    doc.setTextColor.apply(doc, NOIR);
    var stats = [
      ['Effectif total', total + ' \u00e9l\u00e8ves'],
      ['\u00c9ligibles EP2', total ? Math.round(nbEligEP2 / total * 100) + ' %' : '\u2014'],
      ['\u00c9ligibles EP3', total ? Math.round(nbEligEP3 / total * 100) + ' %' : '\u2014'],
      ['Moyenne EP2',     total ? (somEP2 / total).toFixed(1) + ' / 20' : '\u2014'],
      ['Moyenne EP3',     total ? (somEP3 / total).toFixed(1) + ' / 20' : '\u2014']
    ];
    for (var i = 0; i < stats.length; i++) {
      doc.setFont(undefined, 'bold');
      doc.text(stats[i][0] + ' :', MG, y);
      doc.setFont(undefined, 'normal');
      doc.text(stats[i][1], MG + 50, y);
      y += 8;
    }

    // Distribution des niveaux
    y += 6;
    doc.setFontSize(11);
    doc.setTextColor.apply(doc, BLEU);
    doc.text('Distribution des niveaux (toutes comp\u00e9tences)', MG, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor.apply(doc, NOIR);
    var niveaux = ['PM', 'M', 'EC', 'NE'];
    var labels  = ['Pleinement Ma\u00eetris\u00e9 (PM)', 'Ma\u00eetris\u00e9 (M)',
                   'En Cours (EC)', 'Non \u00c9valu\u00e9 (NE)'];
    for (var n = 0; n < niveaux.length; n++) {
      doc.text(labels[n] + ' : ' + distrib[niveaux[n]], MG + 4, y);
      y += 7;
    }
  }

  /* ── Page NE Structurels ──────────────────────────────────── */

  function pageNEStructurels(doc) {
    if (!window.imposModule) return; // module non chargé → on saute
    doc.addPage();
    var y = MH;
    doc.setFontSize(13);
    doc.setTextColor.apply(doc, BLEU);
    doc.text('NE Structurels \u2014 Impossibilit\u00e9s PFMP', MG, y);
    y += 10;

    var found = false;
    var sorted = sortStudents(window.students || []);
    doc.setFontSize(9);

    sorted.forEach(function (s) {
      // Vérifier si l'élève a des NE structurels
      var comps = (window.COMP_EP2 || []).concat(window.COMP_EP3 || []);
      var neList = [];
      comps.forEach(function (c) {
        if (window.imposModule.isNEStructurel(s.code, c.code)) {
          neList.push(c.code + ' \u2014 ' + c.nom);
        }
      });
      if (neList.length === 0) return;

      found = true;
      y = checkPage(doc, y, 12 + neList.length * 5);
      doc.setTextColor.apply(doc, NOIR);
      doc.setFont(undefined, 'bold');
      doc.text(s.nom + ' ' + (s.prenom || '') + ' (' + (s.classe || '') + ')', MG, y);
      y += 6;
      doc.setFont(undefined, 'normal');
      doc.setTextColor.apply(doc, GRIS);
      for (var j = 0; j < neList.length; j++) {
        doc.text('\u2022 ' + neList[j], MG + 4, y);
        y += 5;
      }
      y += 3;
    });

    if (!found) {
      doc.setFontSize(10);
      doc.setTextColor.apply(doc, GRIS);
      doc.text('Aucun NE structurel recens\u00e9.', MG, y);
    }
  }

  /* ── generate() — Rapport d'inspection complet ────────────── */

  function generate() {
    var jsPDF = (window.jspdf || {}).jsPDF;
    if (!jsPDF) { alert('jsPDF non disponible'); return; }

    var doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    pageCouverture(doc);
    pageTableau(doc);
    pageStatistiques(doc);
    pageNEStructurels(doc);
    addFooters(doc);

    var session = (window.appCfg || {}).session || 'CCF';
    doc.save('Rapport_Inspection_CCF_' + session + '.pdf');
  }

  /* ── generateStudentPDF(code) — Fiche individuelle élève ──── */

  function generateStudentPDF(code) {
    var jsPDF = (window.jspdf || {}).jsPDF;
    if (!jsPDF) { alert('jsPDF non disponible'); return; }

    var s = (window.students || []).find(function (e) { return e.code === code; });
    if (!s) { alert('\u00c9l\u00e8ve introuvable'); return; }

    var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var cfg = window.appCfg || {};
    var y = MH;

    /* ── En-tête ──────────────────────────────────────────── */
    doc.setFontSize(10);
    doc.setTextColor.apply(doc, GRIS);
    doc.text('Acad\u00e9mie : ' + (cfg.academie || '\u2014'), MG, y);
    doc.text('Session : ' + (cfg.session || '\u2014'),
      doc.internal.pageSize.getWidth() - MD, y, { align: 'right' });
    y += 6;
    doc.text('\u00c9tablissement : ' + (cfg.etablissement || '\u2014'), MG, y);
    y += 10;

    doc.setFontSize(14);
    doc.setTextColor.apply(doc, BLEU);
    doc.text('Fiche CCF \u2014 ' + s.nom + ' ' + (s.prenom || ''), MG, y);
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor.apply(doc, NOIR);
    doc.text('Classe : ' + (s.classe || '\u2014'), MG, y);
    y += 10;

    /* ── Tableau d'une épreuve ─────────────────────────────── */
    function renderEpreuve(ep, label, comps) {
      y = checkPage(doc, y, 20);
      doc.setFontSize(12);
      doc.setTextColor.apply(doc, BLEU);
      doc.text(label, MG, y);
      y += 8;

      // En-têtes colonnes
      var hdr = ['Code', 'Comp\u00e9tence', 'Poids', 'Niv. propos\u00e9',
                 'Niv. valid\u00e9', 'Points'];
      var tw = [16, 52, 14, 22, 22, 18];
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.setFillColor.apply(doc, BLEU);
      var x = MG;
      for (var h = 0; h < hdr.length; h++) {
        doc.rect(x, y - 4, tw[h], LH, 'F');
        doc.text(hdr[h], x + 1, y);
        x += tw[h];
      }
      y += LH;

      // Calcul des notes
      var e = calcNote(code, ep);
      var nData = (window.notes[code] || {})[ep] || {};

      doc.setFont(undefined, 'normal');
      for (var i = 0; i < e.det.length; i++) {
        y = checkPage(doc, y, LH + 2);
        var d = e.det[i];
        var comp = comps.find(function (c) { return c.code === d.code; }) || {};

        // Fond alterné
        if (i % 2 === 0) {
          doc.setFillColor(245, 245, 250);
          doc.rect(MG, y - 4, pw(doc), LH, 'F');
        }

        doc.setTextColor.apply(doc, NOIR);
        x = MG;
        var row = [
          d.code,
          (d.nom || comp.nom || '').substring(0, 28),
          (comp.poids || '') + (comp.obl ? '*' : ''),
          d.lv || 'NE',
          d.lv || 'NE',   // niveau validé = même si pas de jury distinct
          d.pts + ' / ' + d.max
        ];
        for (var r = 0; r < row.length; r++) {
          // Couleur du niveau
          if (r === 3 || r === 4) {
            var niv = row[r];
            if (niv === 'PM' || niv === 'M') doc.setTextColor.apply(doc, VERT);
            else if (niv === 'NE') doc.setTextColor.apply(doc, ROUGE);
            else doc.setTextColor.apply(doc, NOIR);
          } else {
            doc.setTextColor.apply(doc, NOIR);
          }
          doc.text(String(row[r]), x + 1, y);
          x += tw[r];
        }
        y += LH;
      }

      // Total de l'épreuve
      y += 2;
      doc.setFont(undefined, 'bold');
      doc.setTextColor.apply(doc, NOIR);
      doc.text('Note propos\u00e9e : ' + e.note.toFixed(1) + ' / 20', MG, y);
      var nf = nData.note_finale;
      doc.text('Note valid\u00e9e : ' + (nf != null ? Number(nf).toFixed(1) : '\u2014') + ' / 20',
        MG + 70, y);
      y += 6;
      doc.setFont(undefined, 'normal');
      doc.setTextColor.apply(doc, e.elig ? VERT : ROUGE);
      doc.text(e.elig ? '\u00c9ligible' : 'Non \u00e9ligible', MG, y);
      doc.setTextColor.apply(doc, NOIR);
      y += 10;
    }

    renderEpreuve('EP2', 'EP2 \u2014 R\u00e9alisation (coeff. 6)', window.COMP_EP2 || []);
    renderEpreuve('EP3', 'EP3 \u2014 Mise en service (coeff. 4)', window.COMP_EP3 || []);

    /* ── Bloc jury (si disponible) ─────────────────────────── */
    if (window.juryModule) {
      y = checkPage(doc, y, 40);
      doc.setFontSize(11);
      doc.setTextColor.apply(doc, BLEU);
      doc.text('Jury', MG, y);
      y += 8;
      doc.setFontSize(9);
      doc.setTextColor.apply(doc, NOIR);

      var jurys = ['atelier', 'pfmp', 'retour'];
      for (var j = 0; j < jurys.length; j++) {
        var info = window.juryModule.getForPDF(jurys[j]);
        if (!info || !info.membres.length) continue;
        y = checkPage(doc, y, 10 + info.membres.length * 6);
        doc.setFont(undefined, 'bold');
        doc.text(info.type + ' \u2014 ' + info.date, MG, y);
        y += 6;
        doc.setFont(undefined, 'normal');
        for (var m = 0; m < info.membres.length; m++) {
          var mb = info.membres[m];
          doc.text(mb.nom + ' (' + mb.qualite + ', ' + mb.statut + ')', MG + 4, y);
          // Ligne de signature
          doc.line(MG + 100, y, MG + 160, y);
          y += 6;
        }
        y += 4;
      }
    }

    /* ── Observations ──────────────────────────────────────── */
    y = checkPage(doc, y, 20);
    doc.setFontSize(10);
    doc.setTextColor.apply(doc, BLEU);
    doc.text('Observations', MG, y);
    y += 8;
    doc.setDrawColor.apply(doc, GRIS);
    doc.rect(MG, y - 4, pw(doc), 30);
    doc.setFontSize(8);
    doc.setTextColor.apply(doc, GRIS);
    doc.text('(espace r\u00e9serv\u00e9 aux observations du jury)', MG + 2, y + 2);

    /* ── Footers et sauvegarde ─────────────────────────────── */
    addFooters(doc);
    doc.save('CCF_' + (s.nom || 'Eleve') + '_' + (s.prenom || '') + '.pdf');
  }

  /* ── API publique ─────────────────────────────────────────── */
  return {
    generate:           generate,
    generateStudentPDF: generateStudentPDF
  };

})();
