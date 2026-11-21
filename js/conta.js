(function () {
  'use strict';

  var INDIRIZZO = 'https://nurjufjhzkobqgreckkg.supabase.co/rest/v1/rpc/premio_conta';
  var CHIAVE = 'sb_publishable_mcFrlzUCWhMcFdBeqcdPgA_yWJwKpMy';

  var nav = window.navigator || {};
  var etichetta = '';
  var pagina = '';

  try {
    pagina = (document.currentScript && document.currentScript.getAttribute('data-pagina')) || '';
  } catch (e) {}

  try {
    var parametri = new URLSearchParams(window.location.search);
    etichetta = (parametri.get('da') || parametri.get('utm_source') || '').toLowerCase();
    if (parametri.has('da') && window.history && window.history.replaceState) {
      parametri.delete('da');
      var resto = parametri.toString();
      window.history.replaceState(null, '', window.location.pathname + (resto ? '?' + resto : '') + window.location.hash);
    }
  } catch (e) {}

  if (nav.webdriver) return;
  if (nav.doNotTrack === '1' || window.doNotTrack === '1' || nav.globalPrivacyControl === true) return;
  if (/bot\b|bot\/|crawler|spider|slurp|headless|lighthouse|pagespeed/i.test(nav.userAgent || '')) return;
  try {
    if (window.localStorage.getItem('premio-escludi') === '1') return;
  } catch (e) {}
  if (!window.fetch) return;

  function invia(eventi) {
    try {
      window.fetch(INDIRIZZO, {
        method: 'POST',
        headers: { 'apikey': CHIAVE, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_eventi: eventi }),
        keepalive: true,
        credentials: 'omit',
        cache: 'no-store',
        referrerPolicy: 'no-referrer'
      }).catch(function () {});
    } catch (e) {}
  }

  function senzaWww(nome) {
    return String(nome || '').replace(/^www\./, '');
  }

  function provenienza(rif) {
    if (etichetta) {
      if (/whatsapp|^wa$/.test(etichetta)) return 'da_whatsapp';
      if (/facebook|^fb$/.test(etichetta)) return 'da_facebook';
      if (/instagram|^ig$/.test(etichetta)) return 'da_instagram';
      if (/linkedin/.test(etichetta)) return 'da_linkedin';
      if (/mail|newsletter/.test(etichetta)) return 'da_email';
      if (/^qr/.test(etichetta)) return 'da_qr';
      if (/google/.test(etichetta)) return 'da_google';
      return 'da_altro';
    }
    if (!rif) return 'da_diretto';
    var parti = /^([a-z-]+):\/\/([^\/?#]+)/i.exec(rif);
    var schema = parti ? parti[1].toLowerCase() : '';
    var h = parti ? parti[2].toLowerCase() : '';
    var finisce = function (nomi) {
      return nomi.some(function (n) { return h === n || h.slice(-(n.length + 1)) === '.' + n; });
    };
    if (schema === 'android-app') {
      if (h.indexOf('whatsapp') >= 0) return 'da_whatsapp';
      if (h === 'com.google.android.gm') return 'da_email';
      if (h.indexOf('com.facebook') === 0) return 'da_facebook';
      if (h.indexOf('com.instagram') === 0) return 'da_instagram';
      if (h.indexOf('com.linkedin') === 0) return 'da_linkedin';
      if (h.indexOf('com.google.') === 0) return 'da_google';
      return 'da_sito';
    }
    if (finisce(['whatsapp.com'])) return 'da_whatsapp';
    if (finisce(['mail.google.com', 'outlook.live.com', 'outlook.office.com', 'outlook.office365.com',
      'mail.yahoo.com', 'mail.libero.it', 'mail.virgilio.it', 'webmail.aruba.it', 'mail.proton.me'])) return 'da_email';
    if (finisce(['facebook.com', 'fb.com', 'fb.me', 'messenger.com'])) return 'da_facebook';
    if (finisce(['instagram.com'])) return 'da_instagram';
    if (finisce(['linkedin.com', 'lnkd.in'])) return 'da_linkedin';
    if (/(^|\.)google\.[a-z.]{2,6}$/.test(h)) return 'da_google';
    if (finisce(['bing.com', 'duckduckgo.com', 'yahoo.com', 'ecosia.org', 'qwant.com', 'startpage.com', 'search.brave.com']) ||
      /(^|\.)yandex\.[a-z]{2,3}$/.test(h)) return 'da_ricerca';
    return 'da_sito';
  }

  function dispositivo() {
    var s = window.screen || {};
    var corto = Math.min(s.width || 0, s.height || 0) || window.innerWidth || 0;
    var tocco = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    if (corto && corto < 600) return 'telefono';
    if (tocco && corto < 1100) return 'tablet';
    return 'computer';
  }

  function contaPagina() {
    var tipo = 'navigate';
    try {
      var voce = window.performance.getEntriesByType('navigation')[0];
      if (voce && voce.type) tipo = voce.type;
    } catch (e) {}
    if (tipo !== 'navigate') return;

    var eventi = [];
    if (pagina) eventi.push('pagina_' + pagina);

    var rif = document.referrer || '';
    var interno = false;
    try {
      interno = !!rif && senzaWww(new URL(rif).hostname) === senzaWww(window.location.hostname);
    } catch (e) {}

    if (!interno || etichetta) {
      eventi.push('visita', provenienza(rif), dispositivo());
      eventi.push(/^it\b/i.test(nav.language || '') ? 'lingua_it' : 'lingua_altra');
    }
    if (eventi.length) invia(eventi);
  }

  if (document.visibilityState === 'hidden') {
    var attesa = function () {
      if (document.visibilityState !== 'visible') return;
      document.removeEventListener('visibilitychange', attesa);
      contaPagina();
    };
    document.addEventListener('visibilitychange', attesa);
  } else {
    contaPagina();
  }

  var contati = {};
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-conta]') : null;
    if (!el) return;
    var nome = el.getAttribute('data-conta');
    if (!nome || contati[nome]) return;
    contati[nome] = true;
    invia([nome]);
  });
})();
