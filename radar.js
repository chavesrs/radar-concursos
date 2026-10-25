/* Radar de Concursos — Contas Públicas
 * Widget para contas.cnt.br/concursos. Monta a lista a partir de concursos.json.
 * Uso no WordPress (bloco HTML personalizado):
 *   <div id="radar-concursos"></div>
 *   <script src="https://cdn.jsdelivr.net/gh/chavesrs/radar-concursos@main/radar.js"></script>
 */
(function () {
  'use strict';
  var FONTES = [
    'https://raw.githubusercontent.com/chavesrs/radar-concursos/main/concursos.json',
    'https://cdn.jsdelivr.net/gh/chavesrs/radar-concursos@main/concursos.json'
  ];
  var ORDEM = { 'Inscrições abertas': 0, 'Inscrições em breve': 1, 'Previsto': 2, 'Inscrições encerradas': 3 };
  var ESFERAS = [['Federal', 'Federal / Nacional'], ['Estadual', 'Estadual'], ['Municipal', 'Municipal']];

  var CSS = [
    '#radar-concursos{font-size:15px;line-height:1.45}',
    '#radar-concursos .rcw-resumo{padding:12px 14px;border-radius:8px;background:#f3f6fa;margin-bottom:12px}',
    '#radar-concursos .rcw-filtros{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}',
    '#radar-concursos .rcw-filtros input,#radar-concursos .rcw-filtros select{padding:8px 10px;border:1px solid #ccd3dc;border-radius:6px;font:inherit;background:#fff;margin:0}',
    '#radar-concursos .rcw-q{flex:1 1 220px;min-width:0}',
    '#radar-concursos .rcw-filtros select{flex:1 1 150px;min-width:0}',
    '#radar-concursos .rcw-card{border:1px solid #e1e6ec;border-radius:8px;padding:12px 14px;margin-bottom:10px;background:#fff}',
    '#radar-concursos .rcw-card.urgente{border-left:4px solid #d9822b}',
    '#radar-concursos .rcw-topo{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline}',
    '#radar-concursos .rcw-org{font-weight:600}',
    '#radar-concursos .rcw-org a{text-decoration:none}',
    '#radar-concursos .rcw-cargo{color:#444;margin:2px 0 6px}',
    '#radar-concursos .rcw-tags{display:flex;flex-wrap:wrap;gap:6px;font-size:13px}',
    '#radar-concursos .rcw-tag{padding:1px 8px;border-radius:999px;background:#eef1f5;color:#333;white-space:nowrap}',
    '#radar-concursos .rcw-tag.aberto{background:#e3f4e8;color:#1f6b35}',
    '#radar-concursos .rcw-tag.breve{background:#fdf0e1;color:#8a4b0f}',
    '#radar-concursos .rcw-tag.conf{background:#e6eefb;color:#1d4f9a;white-space:normal}',
    '#radar-concursos .rcw-obs{font-size:13px;color:#666;margin-top:6px}',
    '#radar-concursos .rcw-rodape{font-size:12px;color:#777;margin-top:8px}'
  ].join('\n');

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null) e.textContent = txt;
    return e;
  }
  function opcao(valor, texto) {
    var o = el('option', null, texto);
    o.value = valor;
    return o;
  }
  function fdata(d) { return d ? d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) : '—'; }
  function brl(v) {
    if (v === null || v === undefined) return null;
    return 'até ' + Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  }

  function iniciar(raiz) {
    if (!document.getElementById('rcw-estilo')) {
      var st = el('style');
      st.id = 'rcw-estilo';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    raiz.innerHTML = '';
    var resumo = el('div', 'rcw-resumo', 'Carregando concursos…');
    var filtros = el('div', 'rcw-filtros');
    var q = el('input', 'rcw-q');
    q.type = 'search';
    q.placeholder = 'Buscar órgão, cargo ou UF…';
    q.setAttribute('aria-label', 'Buscar');
    var sit = el('select', 'rcw-sit');
    sit.setAttribute('aria-label', 'Situação');
    sit.appendChild(opcao('', 'Todas as situações'));
    Object.keys(ORDEM).forEach(function (s) { sit.appendChild(opcao(s, s)); });
    var esf = el('select', 'rcw-esf');
    esf.setAttribute('aria-label', 'Esfera');
    esf.appendChild(opcao('', 'Todas as esferas'));
    ESFERAS.forEach(function (e) { esf.appendChild(opcao(e[0], e[1])); });
    var uf = el('select', 'rcw-uf');
    uf.setAttribute('aria-label', 'UF');
    uf.appendChild(opcao('', 'Todas as UFs'));
    filtros.appendChild(q);
    filtros.appendChild(sit);
    filtros.appendChild(esf);
    filtros.appendChild(uf);
    var lista = el('div', 'rcw-lista');
    var rodape = el('p', 'rcw-rodape');
    raiz.appendChild(resumo);
    raiz.appendChild(filtros);
    raiz.appendChild(lista);
    raiz.appendChild(rodape);

    var dados = [];
    var hoje = '';
    function dias(d) { return Math.round((Date.parse(d + 'T00:00:00Z') - Date.parse(hoje + 'T00:00:00Z')) / 864e5); }

    function desenhar() {
      var termo = q.value.trim().toLowerCase();
      var s = sit.value;
      var u = uf.value;
      var e = esf.value;
      lista.innerHTML = '';
      var rows = dados.filter(function (r) {
        if (s && r.situacao !== s) return false;
        if (e && r.esfera !== e) return false;
        if (u && r.uf !== u) return false;
        if (termo) {
          var texto = [r.orgao, r.cargo, r.uf, r.banca, r.disciplinas].join(' ').toLowerCase();
          if (texto.indexOf(termo) < 0) return false;
        }
        return true;
      }).sort(function (a, b) {
        var oa = ORDEM[a.situacao] === undefined ? 9 : ORDEM[a.situacao];
        var ob = ORDEM[b.situacao] === undefined ? 9 : ORDEM[b.situacao];
        if (oa !== ob) return oa - ob;
        return String(a.inscricoes_fim || '9').localeCompare(String(b.inscricoes_fim || '9'));
      });
      rows.forEach(function (r) {
        var aberto = r.situacao === 'Inscrições abertas';
        var urgente = aberto && r.inscricoes_fim && dias(r.inscricoes_fim) <= 7;
        var card = el('div', 'rcw-card' + (urgente ? ' urgente' : ''));
        var topo = el('div', 'rcw-topo');
        var org = el('div', 'rcw-org');
        var a = el('a', null, r.orgao);
        if (r.fonte) { a.href = r.fonte; a.target = '_blank'; a.rel = 'noopener'; }
        org.appendChild(a);
        topo.appendChild(org);
        var cls = aberto ? 'aberto' : (r.situacao === 'Inscrições em breve' ? 'breve' : '');
        topo.appendChild(el('span', 'rcw-tag ' + cls, r.situacao));
        card.appendChild(topo);
        card.appendChild(el('div', 'rcw-cargo', r.cargo));
        var tags = el('div', 'rcw-tags');
        if (r.inscricoes_fim) {
          var t = 'Inscrições até ' + fdata(r.inscricoes_fim);
          if (urgente) {
            var n = dias(r.inscricoes_fim);
            t += n === 0 ? ' (hoje)' : ' (' + n + (n === 1 ? ' dia)' : ' dias)');
          }
          tags.appendChild(el('span', 'rcw-tag', t));
        }
        if (r.prova) tags.appendChild(el('span', 'rcw-tag', 'Prova ' + fdata(r.prova)));
        if (brl(r.salario)) tags.appendChild(el('span', 'rcw-tag', brl(r.salario)));
        if (r.uf) tags.appendChild(el('span', 'rcw-tag', r.uf));
        if (r.banca) tags.appendChild(el('span', 'rcw-tag', r.banca));
        if (r.conteudo === 'Confirmado') tags.appendChild(el('span', 'rcw-tag conf', 'Cobra: ' + r.disciplinas));
        card.appendChild(tags);
        if (r.observacao) card.appendChild(el('div', 'rcw-obs', r.observacao));
        lista.appendChild(card);
      });
      if (!rows.length) lista.appendChild(el('p', null, 'Nenhum concurso com esses filtros.'));
    }

    function carregar(i) {
      if (i >= FONTES.length) {
        resumo.textContent = 'Não foi possível carregar a lista agora. Tente novamente em instantes.';
        return;
      }
      var url = FONTES[i] + (i === 0 ? '?t=' + Date.now() : '');
      fetch(url, { cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (j) {
        dados = Array.isArray(j) ? j : [];
        hoje = dados.reduce(function (m, r) { return r.atualizado_em && r.atualizado_em > m ? r.atualizado_em : m; }, '');
        var abertos = dados.filter(function (r) { return r.situacao === 'Inscrições abertas'; });
        var urg = abertos.filter(function (r) { return r.inscricoes_fim && dias(r.inscricoes_fim) <= 7; }).length;
        var breve = dados.filter(function (r) { return r.situacao === 'Inscrições em breve'; }).length;
        resumo.textContent = abertos.length + ' concursos com inscrições abertas' +
          (urg ? ' (' + urg + ' encerram em até 7 dias)' : '') +
          ' · ' + breve + ' abrem em breve · atualizado em ' + fdata(hoje) + '.';
        var ufs = [];
        dados.forEach(function (r) { if (r.uf && ufs.indexOf(r.uf) < 0) ufs.push(r.uf); });
        ufs.sort().forEach(function (x) { uf.appendChild(opcao(x, x)); });
        rodape.textContent = 'Levantamento automático a partir de editais e portais de concursos. Confira sempre o edital oficial antes de se inscrever.';
        desenhar();
      }).catch(function () { carregar(i + 1); });
    }

    q.addEventListener('input', desenhar);
    sit.addEventListener('change', desenhar);
    esf.addEventListener('change', desenhar);
    uf.addEventListener('change', desenhar);
    carregar(0);
  }

  function pronto() {
    var raiz = document.getElementById('radar-concursos');
    if (raiz) iniciar(raiz);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pronto);
  else pronto();
})();
