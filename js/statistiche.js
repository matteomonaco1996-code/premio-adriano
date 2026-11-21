(function () {
  'use strict';

  var INDIRIZZO = 'https://nurjufjhzkobqgreckkg.supabase.co/rest/v1/rpc/premio_statistiche';
  var CHIAVE_API = 'sb_publishable_mcFrlzUCWhMcFdBeqcdPgA_yWJwKpMy';
  var SITO = 'https://premioadriano.it/';
  var SVG = 'http://www.w3.org/2000/svg';
  var MEMORIA = 'premio-chiave';
  var ESCLUDI = 'premio-escludi';

  var FONTI = [
    ['da_diretto', 'Diretto o non rilevabile'],
    ['da_google', 'Google'],
    ['da_ricerca', 'Altri motori di ricerca'],
    ['da_whatsapp', 'WhatsApp'],
    ['da_email', 'Email'],
    ['da_facebook', 'Facebook'],
    ['da_instagram', 'Instagram'],
    ['da_linkedin', 'LinkedIn'],
    ['da_qr', 'Codice QR'],
    ['da_sito', 'Altri siti e app'],
    ['da_altro', 'Altri link con etichetta']
  ];
  var DISPOSITIVI = [['telefono', 'Telefono'], ['tablet', 'Tablet'], ['computer', 'Computer']];
  var LINGUE = [['lingua_it', 'Italiano'], ['lingua_altra', 'Altre lingue']];
  var PAGINE = [
    ['pagina_home', 'Pagina principale'],
    ['pagina_privacy', 'Privacy e cookie'],
    ['pagina_note', 'Note legali'],
    ['pagina_404', 'Pagina non trovata']
  ];
  var AZIONI = [
    ['clic_calendario', 'Aggiungi al calendario'],
    ['clic_mappa', 'Come arrivare'],
    ['clic_dossier', 'Richiedi il dossier'],
    ['clic_email', 'Email: clic o copia dell’indirizzo']
  ];
  var LINK = [
    ['WhatsApp', 'whatsapp'],
    ['Email', 'email'],
    ['Facebook', 'facebook'],
    ['Instagram', 'instagram'],
    ['LinkedIn', 'linkedin'],
    ['Codice QR', 'qr']
  ];

  var el = function (id) { return document.getElementById(id); };
  var numero = new Intl.NumberFormat('it-IT');
  var giornoLungo = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  var giornoMedio = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' });
  var giornoCompleto = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  var giornoCorto = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' });
  var giornoTabella = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  var stato = { chiave: '', giorni: 30, dati: null, attivo: -1, geometria: null };

  var ingresso = el('ingresso');
  var cruscotto = el('cruscotto');
  var grafico = el('grafico');
  var fumetto = el('fumetto');

  function data(testo) {
    var p = String(testo).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  function leggi(deposito, nome) {
    try { return window[deposito].getItem(nome); } catch (e) { return null; }
  }
  function scrivi(deposito, nome, valore) {
    try {
      if (valore === null) window[deposito].removeItem(nome);
      else window[deposito].setItem(nome, valore);
      return true;
    } catch (e) { return false; }
  }

  function crea(nome, classe, testo) {
    var n = document.createElement(nome);
    if (classe) n.className = classe;
    if (testo !== undefined) n.textContent = testo;
    return n;
  }
  function creaSvg(nome, attributi) {
    var n = document.createElementNS(SVG, nome);
    Object.keys(attributi || {}).forEach(function (k) { n.setAttribute(k, attributi[k]); });
    return n;
  }
  function svuota(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function chiedi(chiave, giorni) {
    return window.fetch(INDIRIZZO, {
      method: 'POST',
      headers: { 'apikey': CHIAVE_API, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_chiave: chiave, p_giorni: giorni }),
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer'
    }).then(function (r) {
      if (!r.ok) throw new Error('risposta ' + r.status);
      return r.json();
    });
  }

  function mostraIngresso(messaggio) {
    stato.chiave = '';
    stato.dati = null;
    scrivi('sessionStorage', MEMORIA, null);
    cruscotto.hidden = true;
    el('esci').hidden = true;
    ingresso.hidden = false;
    nascondiFumetto();
    var avviso = el('avviso-ingresso');
    avviso.hidden = !messaggio;
    avviso.textContent = messaggio || '';
    el('chiave').value = '';
  }

  function mostraCruscotto() {
    ingresso.hidden = true;
    cruscotto.hidden = false;
    el('esci').hidden = false;
  }

  function carica() {
    var dati = el('dati');
    var avviso = el('avviso-dati');
    dati.classList.add('in-attesa');
    avviso.hidden = true;
    return chiedi(stato.chiave, stato.giorni).then(function (risposta) {
      dati.classList.remove('in-attesa');
      if (!risposta || risposta.ok !== true) {
        mostraIngresso('La password non è più valida. Inseriscila di nuovo.');
        return;
      }
      stato.dati = risposta;
      mostraCruscotto();
      disegna();
    }, function () {
      dati.classList.remove('in-attesa');
      avviso.textContent = 'Non riesco a leggere le statistiche. Controlla la connessione e premi «Aggiorna».';
      avviso.hidden = false;
    });
  }

  function somma(oggetto, voci) {
    return voci.reduce(function (t, v) { return t + (Number(oggetto[v[0]]) || 0); }, 0);
  }

  function disegna() {
    var d = stato.dati;
    var totali = d.totali || {};
    var precedenti = d.precedenti || {};
    var sempre = d.sempre || {};
    var serie = d.serie || [];
    var visite = Number(totali.visita) || 0;
    var pagine = somma(totali, PAGINE);
    var dal = data(d.dal);
    var oggi = data(d.oggi);
    var primo = d.primo_giorno ? data(d.primo_giorno) : null;

    var ora = String(d.aggiornato || '').split('T')[1] || '';
    el('aggiornato').textContent = 'Aggiornato alle ' + ora + ' di ' + giornoLungo.format(oggi);

    el('nome-visite').textContent = 'Visite negli ultimi ' + d.giorni + ' giorni';
    el('v-visite').textContent = numero.format(visite);
    var inizioPrecedente = new Date(dal.getFullYear(), dal.getMonth(), dal.getDate() - d.giorni);
    var confrontabile = primo && inizioPrecedente >= primo;
    var prima = Number(precedenti.visita) || 0;
    var notaVisite;
    if (!confrontabile) {
      notaVisite = 'Primo periodo misurato: manca il confronto con il precedente';
    } else if (prima === 0) {
      notaVisite = 'Nei ' + d.giorni + ' giorni precedenti: nessuna visita';
    } else {
      var scarto = Math.round((visite - prima) / prima * 100);
      notaVisite = (scarto > 0 ? '▲ ' : scarto < 0 ? '▼ ' : '') + Math.abs(scarto) + '% rispetto ai ' +
        d.giorni + ' giorni precedenti (' + numero.format(prima) + ')';
      if (scarto === 0) notaVisite = 'Come nei ' + d.giorni + ' giorni precedenti (' + numero.format(prima) + ')';
    }
    el('n-visite').textContent = notaVisite;

    el('v-pagine').textContent = numero.format(pagine);
    el('n-pagine').textContent = visite > 0
      ? (pagine / visite).toFixed(1).replace('.', ',') + ' pagine per visita'
      : 'negli ultimi ' + d.giorni + ' giorni';

    var ultimo = serie.length ? serie[serie.length - 1] : { visite: 0 };
    el('v-oggi').textContent = numero.format(ultimo.visite);
    el('n-oggi').textContent = serie.length > 1
      ? 'Ieri: ' + numero.format(serie[serie.length - 2].visite)
      : '';

    el('v-sempre').textContent = numero.format(Number(sempre.visita) || 0);
    el('n-sempre').textContent = primo ? 'dal ' + giornoCompleto.format(primo) : 'Ancora nessuna visita registrata';

    el('sotto-giorni').textContent = 'Ultimi ' + d.giorni + ' giorni, dal ' + giornoMedio.format(dal) +
      ' al ' + giornoMedio.format(oggi) +
      (primo && primo > dal ? '. I conteggi partono dal ' + giornoMedio.format(primo) + ': prima non ci sono dati.' : '');

    disegnaGrafico();
    disegnaTabella(serie, primo);
    disegnaBarre(el('barre-fonti'), FONTI, totali, { quota: true, nascondiZeri: true });
    disegnaBarre(el('barre-dispositivi'), DISPOSITIVI, totali, { quota: true });
    disegnaBarre(el('barre-lingue'), LINGUE, totali, { quota: true });
    disegnaBarre(el('barre-pagine'), PAGINE, totali, {});
    disegnaBarre(el('barre-azioni'), AZIONI, totali, {});

    el('nota-inizio').textContent = primo
      ? 'I conteggi partono dal ' + giornoCompleto.format(primo) + '. Prima di quella data non esistono dati.'
      : 'I conteggi partono dalla prima visita registrata.';
    var negati = Number(totali.accesso_negato) || 0;
    var notaNegati = el('nota-negati');
    notaNegati.hidden = negati === 0;
    notaNegati.textContent = 'Tentativi di entrare in questa pagina con una password sbagliata, nel periodo: ' +
      numero.format(negati) + '. Contano anche gli errori di battitura di chi ha la password.';
  }

  function disegnaBarre(contenitore, voci, totali, opzioni) {
    svuota(contenitore);
    var righe = voci.map(function (v, i) {
      return { nome: v[1], n: Number(totali[v[0]]) || 0, ordine: i };
    });
    var totale = righe.reduce(function (t, r) { return t + r.n; }, 0);
    if (opzioni.nascondiZeri) righe = righe.filter(function (r) { return r.n > 0; });
    righe.sort(function (a, b) { return b.n - a.n || a.ordine - b.ordine; });
    if (!righe.length || totale === 0) {
      contenitore.removeAttribute('role');
      contenitore.appendChild(crea('p', 'barre__vuoto', 'Ancora nessun dato in questo periodo.'));
      return;
    }
    contenitore.setAttribute('role', 'list');
    var massimo = righe[0].n;
    righe.forEach(function (r) {
      var riga = crea('div', 'barra');
      riga.setAttribute('role', 'listitem');
      riga.appendChild(crea('span', 'barra__nome', r.nome));
      var traccia = crea('span', 'barra__traccia');
      var segno = crea('span', 'barra__segno' + (r.n === 0 ? ' barra__segno--zero' : ''));
      segno.style.width = r.n === 0 ? '0' : Math.max(r.n / massimo * 100, 0.5) + '%';
      traccia.appendChild(segno);
      riga.appendChild(traccia);
      var numeri = crea('span', 'barra__numeri');
      numeri.appendChild(crea('strong', '', numero.format(r.n)));
      if (opzioni.quota) numeri.appendChild(crea('span', '', Math.round(r.n / totale * 100) + '%'));
      riga.appendChild(numeri);
      contenitore.appendChild(riga);
    });
  }

  function disegnaTabella(serie, primo) {
    var corpo = el('righe-giorni');
    svuota(corpo);
    serie.slice().reverse().forEach(function (g) {
      var giorno = data(g.giorno);
      var senzaDati = !primo || giorno < primo;
      var riga = document.createElement('tr');
      var testa = crea('th', '', giornoTabella.format(giorno));
      testa.setAttribute('scope', 'row');
      riga.appendChild(testa);
      riga.appendChild(crea('td', '', senzaDati ? 'nessun dato' : numero.format(g.visite)));
      riga.appendChild(crea('td', '', senzaDati ? 'nessun dato' : numero.format(g.pagine)));
      corpo.appendChild(riga);
    });
  }

  function passo(massimo) {
    var passi = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 50000, 100000];
    for (var i = 0; i < passi.length; i += 1) {
      if (massimo / passi[i] <= 4) return passi[i];
    }
    return passi[passi.length - 1];
  }

  function disegnaGrafico() {
    var serie = (stato.dati && stato.dati.serie) || [];
    nascondiFumetto();
    svuota(grafico);
    stato.geometria = null;
    stato.attivo = -1;

    var massimo = serie.reduce(function (m, g) { return Math.max(m, g.visite); }, 0);
    if (!serie.length || massimo === 0) {
      grafico.appendChild(crea('p', 'grafico__vuoto', 'Ancora nessuna visita in questo periodo.'));
      return;
    }

    var larghezza = Math.max(grafico.clientWidth, 260);
    var altezza = larghezza < 520 ? 230 : 280;
    var m = { alto: 24, destra: 6, basso: 30, sinistra: 40 };
    var areaL = larghezza - m.sinistra - m.destra;
    var areaA = altezza - m.alto - m.basso;
    var p = passo(massimo);
    var cima = Math.ceil(massimo / p) * p;
    var n = serie.length;
    var casella = areaL / n;
    var vuoto = casella >= 6 ? 2 : 1;
    var spessore = Math.min(24, Math.max(1, casella - vuoto));
    var base = m.alto + areaA;
    var y = function (v) { return m.alto + areaA - (v / cima) * areaA; };
    var centro = function (i) { return m.sinistra + casella * i + casella / 2; };

    var svg = creaSvg('svg', {
      viewBox: '0 0 ' + larghezza + ' ' + altezza,
      width: larghezza, height: altezza, 'aria-hidden': 'true', focusable: 'false'
    });

    for (var t = p; t <= cima; t += p) {
      svg.appendChild(creaSvg('line', { 'class': 'g-griglia', x1: m.sinistra, x2: larghezza - m.destra, y1: y(t), y2: y(t) }));
    }
    for (var s = 0; s <= cima; s += p) {
      var tacca = creaSvg('text', { 'class': 'g-asse', x: m.sinistra - 8, y: y(s), dy: '.32em', 'text-anchor': 'end' });
      tacca.textContent = numero.format(s);
      svg.appendChild(tacca);
    }

    var fasce = [];
    var colonne = [];
    serie.forEach(function (g, i) {
      var fascia = creaSvg('rect', { 'class': 'g-fascia', x: m.sinistra + casella * i, y: m.alto - 14, width: casella, height: areaA + 14 });
      svg.appendChild(fascia);
      fasce.push(fascia);
    });
    serie.forEach(function (g, i) {
      if (g.visite <= 0) { colonne.push(null); return; }
      var x = centro(i) - spessore / 2;
      var alto = y(g.visite);
      var r = Math.min(4, spessore / 2, base - alto);
      var colonna = creaSvg('path', {
        'class': 'g-colonna',
        d: 'M' + x + ',' + base + 'V' + (alto + r) + 'Q' + x + ',' + alto + ' ' + (x + r) + ',' + alto +
          'H' + (x + spessore - r) + 'Q' + (x + spessore) + ',' + alto + ' ' + (x + spessore) + ',' + (alto + r) +
          'V' + base + 'Z'
      });
      svg.appendChild(colonna);
      colonne.push(colonna);
    });

    svg.appendChild(creaSvg('line', { 'class': 'g-base', x1: m.sinistra, x2: larghezza - m.destra, y1: base, y2: base }));

    var perEtichetta = 58;
    var ogni = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(areaL / perEtichetta))));
    serie.forEach(function (g, i) {
      if ((n - 1 - i) % ogni !== 0) return;
      var cx = centro(i);
      var ancora = 'middle';
      if (cx > larghezza - m.destra - 22) { ancora = 'end'; cx = larghezza - m.destra; }
      else if (cx < m.sinistra + 22) { ancora = 'start'; cx = m.sinistra; }
      var etichetta = creaSvg('text', { 'class': 'g-asse', x: cx, y: base + 20, 'text-anchor': ancora });
      etichetta.textContent = giornoCorto.format(data(g.giorno));
      svg.appendChild(etichetta);
    });

    var iMax = 0;
    serie.forEach(function (g, i) { if (g.visite > serie[iMax].visite) iMax = i; });
    var daEtichettare = [iMax];
    if (n - 1 !== iMax && serie[n - 1].visite > 0 && Math.abs(centro(n - 1) - centro(iMax)) > 34) daEtichettare.push(n - 1);
    daEtichettare.forEach(function (i) {
      var cx = Math.min(Math.max(centro(i), m.sinistra + 12), larghezza - m.destra - 12);
      var valore = creaSvg('text', { 'class': 'g-valore', x: cx, y: y(serie[i].visite) - 7, 'text-anchor': 'middle' });
      valore.textContent = numero.format(serie[i].visite);
      svg.appendChild(valore);
    });

    grafico.appendChild(svg);
    stato.geometria = { svg: svg, fasce: fasce, colonne: colonne, sinistra: m.sinistra, casella: casella, n: n, larghezza: larghezza, cima: m.alto - 14 };
  }

  function nascondiFumetto() {
    fumetto.hidden = true;
    var g = stato.geometria;
    if (g && stato.attivo >= 0) {
      g.fasce[stato.attivo].classList.remove('attiva');
      if (g.colonne[stato.attivo]) g.colonne[stato.attivo].classList.remove('attiva');
    }
    stato.attivo = -1;
  }

  function attiva(i) {
    var g = stato.geometria;
    if (!g) return;
    i = Math.min(Math.max(i, 0), g.n - 1);
    if (i === stato.attivo && !fumetto.hidden) return;
    nascondiFumetto();
    stato.attivo = i;
    g.fasce[i].classList.add('attiva');
    if (g.colonne[i]) g.colonne[i].classList.add('attiva');

    var giorno = stato.dati.serie[i];
    var primo = stato.dati.primo_giorno ? data(stato.dati.primo_giorno) : null;
    svuota(fumetto);
    if (!primo || data(giorno.giorno) < primo) {
      fumetto.appendChild(crea('strong', '', 'Nessun dato'));
      fumetto.appendChild(crea('span', '', 'I conteggi non erano ancora attivi'));
    } else {
      fumetto.appendChild(crea('strong', '', numero.format(giorno.visite) + (giorno.visite === 1 ? ' visita' : ' visite')));
      fumetto.appendChild(crea('span', '', numero.format(giorno.pagine) + (giorno.pagine === 1 ? ' pagina vista' : ' pagine viste')));
    }
    fumetto.appendChild(crea('span', '', giornoLungo.format(data(giorno.giorno))));
    fumetto.hidden = false;

    var quadro = g.svg.getBoundingClientRect();
    var scala = quadro.width / g.larghezza;
    var fascia = g.fasce[i].getBoundingClientRect();
    var cima = quadro.top + g.cima * scala;
    var sinistra = fascia.left + fascia.width / 2 - fumetto.offsetWidth / 2 + window.pageXOffset;
    var limite = document.documentElement.clientWidth - fumetto.offsetWidth - 8 + window.pageXOffset;
    sinistra = Math.max(8 + window.pageXOffset, Math.min(sinistra, limite));
    var alto = cima - fumetto.offsetHeight - 6 + window.pageYOffset;
    fumetto.style.left = Math.round(sinistra) + 'px';
    fumetto.style.top = Math.round(alto) + 'px';
  }

  function indiceDa(evento) {
    var g = stato.geometria;
    if (!g) return -1;
    var quadro = g.svg.getBoundingClientRect();
    var x = (evento.clientX - quadro.left) / (quadro.width / g.larghezza);
    return Math.floor((x - g.sinistra) / g.casella);
  }

  grafico.addEventListener('pointermove', function (e) {
    var i = indiceDa(e);
    if (i < 0 || !stato.geometria || i >= stato.geometria.n) { nascondiFumetto(); return; }
    attiva(i);
  });
  grafico.addEventListener('pointerdown', function (e) {
    var i = indiceDa(e);
    if (stato.geometria && i >= 0 && i < stato.geometria.n) attiva(i);
  });
  grafico.addEventListener('pointerleave', function (e) {
    if (e.pointerType === 'mouse') nascondiFumetto();
  });
  grafico.addEventListener('focus', function () {
    if (stato.geometria && stato.attivo < 0 && grafico.matches(':focus-visible')) attiva(stato.geometria.n - 1);
  });
  grafico.addEventListener('blur', nascondiFumetto);
  grafico.addEventListener('keydown', function (e) {
    var g = stato.geometria;
    if (!g) return;
    var i = stato.attivo < 0 ? g.n - 1 : stato.attivo;
    if (e.key === 'ArrowLeft') i -= 1;
    else if (e.key === 'ArrowRight') i += 1;
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = g.n - 1;
    else if (e.key === 'Escape') { nascondiFumetto(); return; }
    else return;
    e.preventDefault();
    attiva(i);
  });
  document.addEventListener('pointerdown', function (e) {
    if (!grafico.contains(e.target)) nascondiFumetto();
  });
  window.addEventListener('scroll', function () {
    if (stato.attivo >= 0 && document.activeElement !== grafico) nascondiFumetto();
  }, { passive: true });

  var attesa = 0;
  var ultimaLarghezza = 0;
  function ridisegna() {
    if (!stato.dati || cruscotto.hidden) return;
    var l = grafico.clientWidth;
    if (l === ultimaLarghezza) return;
    ultimaLarghezza = l;
    disegnaGrafico();
  }
  if (window.ResizeObserver) {
    new window.ResizeObserver(function () {
      window.cancelAnimationFrame(attesa);
      attesa = window.requestAnimationFrame(ridisegna);
    }).observe(grafico);
  } else {
    window.addEventListener('resize', ridisegna);
  }

  function scaricaCsv() {
    var d = stato.dati;
    if (!d) return;
    var gruppi = [
      ['Provenienza', FONTI], ['Dispositivo', DISPOSITIVI], ['Lingua', LINGUE], ['Pagina', PAGINE], ['Azione', AZIONI]
    ];
    var colonne = [];
    gruppi.forEach(function (g) {
      g[1].forEach(function (v) { colonne.push([v[0], g[0] + ': ' + v[1]]); });
    });
    var perGiorno = {};
    (d.dettaglio || []).forEach(function (r) {
      if (!perGiorno[r[0]]) perGiorno[r[0]] = {};
      perGiorno[r[0]][r[1]] = r[2];
    });
    var cella = function (v) {
      var t = String(v);
      return /[";\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    };
    var righe = [['Giorno', 'Visite', 'Pagine viste'].concat(colonne.map(function (c) { return c[1]; }))];
    (d.serie || []).forEach(function (g) {
      var valori = perGiorno[g.giorno] || {};
      if (!d.primo_giorno || g.giorno < d.primo_giorno) {
        righe.push([g.giorno, '', ''].concat(colonne.map(function () { return ''; })));
        return;
      }
      righe.push([g.giorno, g.visite, g.pagine].concat(colonne.map(function (c) { return valori[c[0]] || 0; })));
    });
    var testo = '﻿' + righe.map(function (r) { return r.map(cella).join(';'); }).join('\r\n') + '\r\n';
    var indirizzo = URL.createObjectURL(new Blob([testo], { type: 'text/csv;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = indirizzo;
    a.download = 'premio-adriano-statistiche-' + d.oggi + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(indirizzo); }, 2000);
  }

  function preparaLink() {
    var elenco = el('link');
    LINK.forEach(function (v) {
      var indirizzo = SITO + '?da=' + v[1];
      var riga = document.createElement('li');
      riga.appendChild(crea('span', 'link__nome', v[0]));
      riga.appendChild(crea('span', 'link__indirizzo', indirizzo));
      var b = crea('button', 'copia', 'Copia');
      b.type = 'button';
      b.setAttribute('aria-label', 'Copia il link per ' + v[0]);
      b.addEventListener('click', function () {
        if (!navigator.clipboard || !navigator.clipboard.writeText) return;
        navigator.clipboard.writeText(indirizzo).then(function () {
          b.textContent = 'Copiato';
          setTimeout(function () { b.textContent = 'Copia'; }, 1800);
        }, function () {});
      });
      riga.appendChild(b);
      elenco.appendChild(riga);
    });
  }

  function preparaEscludi() {
    var casella = el('escludi');
    casella.checked = leggi('localStorage', ESCLUDI) === '1';
    casella.addEventListener('change', function () {
      if (!scrivi('localStorage', ESCLUDI, casella.checked ? '1' : null)) {
        casella.checked = false;
        casella.disabled = true;
        el('nota-escludi').textContent = 'Questo browser non permette di salvare la scelta.';
      }
    });
  }

  el('modulo-ingresso').addEventListener('submit', function (e) {
    e.preventDefault();
    var campo = el('chiave');
    var avviso = el('avviso-ingresso');
    var bottone = el('entra');
    var chiave = campo.value.trim();
    avviso.hidden = true;
    if (!chiave) {
      avviso.textContent = 'Scrivi la password.';
      avviso.hidden = false;
      campo.focus();
      return;
    }
    bottone.disabled = true;
    bottone.textContent = 'Un momento…';
    chiedi(chiave, stato.giorni).then(function (risposta) {
      bottone.disabled = false;
      bottone.textContent = 'Entra';
      if (!risposta || risposta.ok !== true) {
        avviso.textContent = 'Password non corretta.';
        avviso.hidden = false;
        campo.select();
        return;
      }
      stato.chiave = chiave;
      stato.dati = risposta;
      scrivi('sessionStorage', MEMORIA, chiave);
      campo.value = '';
      mostraCruscotto();
      ultimaLarghezza = grafico.clientWidth;
      disegna();
      el('titolo-cruscotto').setAttribute('tabindex', '-1');
      el('titolo-cruscotto').focus();
    }, function () {
      bottone.disabled = false;
      bottone.textContent = 'Entra';
      avviso.textContent = 'Non riesco a raggiungere il servizio delle statistiche. Controlla la connessione e riprova.';
      avviso.hidden = false;
    });
  });

  el('esci').addEventListener('click', function () {
    mostraIngresso('');
    el('chiave').focus();
  });

  el('aggiorna').addEventListener('click', carica);
  el('scarica').addEventListener('click', scaricaCsv);

  Array.prototype.forEach.call(document.querySelectorAll('[data-giorni]'), function (b) {
    b.addEventListener('click', function () {
      stato.giorni = Number(b.getAttribute('data-giorni'));
      Array.prototype.forEach.call(document.querySelectorAll('[data-giorni]'), function (altro) {
        altro.setAttribute('aria-pressed', String(altro === b));
      });
      carica();
    });
  });

  preparaLink();
  preparaEscludi();

  var salvata = leggi('sessionStorage', MEMORIA);
  if (salvata) {
    stato.chiave = salvata;
    chiedi(salvata, stato.giorni).then(function (risposta) {
      if (!risposta || risposta.ok !== true) { mostraIngresso(''); return; }
      stato.dati = risposta;
      mostraCruscotto();
      ultimaLarghezza = grafico.clientWidth;
      disegna();
    }, function () {
      mostraIngresso('Non riesco a raggiungere il servizio delle statistiche. Riprova tra poco.');
    });
  } else {
    ingresso.hidden = false;
  }
})();
