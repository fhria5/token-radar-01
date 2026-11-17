/* Token Launch Radar — static dashboard. Reads window.RADAR from data.js. No network. */
(function () {
  'use strict';
  var R = (typeof window !== 'undefined' && window.RADAR) || null;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var clamp = function (x, lo, hi) { return Math.min(hi, Math.max(lo, x)); };
  var money = function (n) {
    if (n == null || !isFinite(n)) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  };
  var moneyFull = function (n) {
    if (n == null || !isFinite(n)) return '—';
    return '$' + Math.round(n).toLocaleString('en-US');
  };
  var chgHtml = function (v) {
    if (v == null || !isFinite(v)) return '<span>—</span>';
    var cls = v > 0 ? 'up' : v < 0 ? 'down' : '';
    return '<span class="' + cls + '">' + (v > 0 ? '+' : '') + v.toFixed(1) + '%</span>';
  };
  var ageText = function (d) {
    if (d == null) return 'unknown';
    if (d < 30) return d + 'd';
    if (d < 365) return Math.round(d / 30) + 'mo';
    return (d / 365).toFixed(1) + 'y';
  };
  var chainsText = function (cs) {
    if (!cs || !cs.length) return '—';
    return cs.length > 2 ? cs.slice(0, 2).join(', ') + ' +' + (cs.length - 2) : cs.join(', ');
  };

  /* ---------- state ---------- */
  var state = { q: '', cat: '', wl: false, sort: 'implied', dir: -1 };
  var SORTS = {
    rank: function (a, b) { return a.rank - b.rank; },
    name: function (a, b) { return a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug); },
    category: function (a, b) { return (a.category || '').localeCompare(b.category || ''); },
    chains: function (a, b) { return (a.chains || []).length - (b.chains || []).length || chainsText(a.chains).localeCompare(chainsText(b.chains)); },
    tvl: function (a, b) { return a.tvl_usd - b.tvl_usd; },
    chg: function (a, b) { return (a.change_7d == null ? -Infinity : a.change_7d) - (b.change_7d == null ? -Infinity : b.change_7d); },
    age: function (a, b) { return (a.age_days == null ? -1 : a.age_days) - (b.age_days == null ? -1 : b.age_days); },
    implied: function (a, b) { return a.implied_value_usd - b.implied_value_usd; }
  };

  /* ---------- header / footer ---------- */
  function stat(v, label) { return '<div class="stat"><b>' + esc(v) + '</b><span>' + esc(label) + '</span></div>'; }
  function renderMeta() {
    if (!R) { $('stats').innerHTML = stat('—', 'data not loaded'); return; }
    $('stats').innerHTML =
      stat(R.board_size, 'protocols on board') +
      stat(R.watchlist_size, 'on watchlist') +
      stat(R.early_size, 'early finds') +
      stat(R.live_size, 'live token') +
      stat(R.as_of, 'snapshot date') +
      stat(R.model_version, 'model version');
    $('footModel').textContent = R.model_version;
    $('footDate').textContent = R.as_of;
    $('footSource').textContent = R.source;
    $('asof').textContent = R.as_of;
  }

  /* ---------- board ---------- */
  function filteredRows() {
    var q = state.q.trim().toLowerCase();
    var rows = R.rows.filter(function (r) {
      if (state.wl && !r.on_watchlist) return false;
      if (state.cat && (r.category || 'Uncategorized') !== state.cat) return false;
      if (q && r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var fn = SORTS[state.sort] || SORTS.implied;
    rows.sort(function (a, b) { return fn(a, b) * state.dir; });
    return rows;
  }
  function renderBoard() {
    var body = $('boardBody');
    if (!R) { body.innerHTML = ''; $('count').textContent = ''; return; }
    var rows = filteredRows();
    var wlCount = R.rows.filter(function (r) { return r.on_watchlist; }).length;
    $('count').textContent = 'Showing ' + rows.length + ' of ' + R.rows.length + ' protocols · ' +
      wlCount + ' on watchlist · sorted by ' + state.sort + (state.dir < 0 ? ' ↓' : ' ↑');
    body.innerHTML = rows.map(function (r) {
      return '<tr data-slug="' + esc(r.slug) + '">' +
        '<td>' + r.rank + '</td>' +
        '<td><span class="name">' + esc(r.name) + '</span>' +
        (r.on_watchlist ? '<span class="badge">WATCHLIST</span>' : '') +
        '<br><span class="slug">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.category || 'Uncategorized') + '</td>' +
        '<td class="chains" title="' + esc((r.chains || []).join(', ')) + '">' + esc(chainsText(r.chains)) + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + chgHtml(r.change_7d) + '</td>' +
        '<td class="num">' + ageText(r.age_days) + '</td>' +
        '<td class="num"><strong>' + money(r.implied_value_usd) + '</strong></td></tr>';
    }).join('');
    document.querySelectorAll('#board th[data-sort]').forEach(function (th) {
      th.classList.toggle('sorted', th.getAttribute('data-sort') === state.sort);
      var arrow = th.getAttribute('data-sort') === state.sort ? (state.dir < 0 ? ' ↓' : ' ↑') : '';
      th.textContent = th.textContent.replace(/ [↓↑]$/, '') + arrow;
    });
  }
  function renderCats() {
    if (!R) return;
    var counts = {};
    R.rows.forEach(function (r) { var c = r.category || 'Uncategorized'; counts[c] = (counts[c] || 0) + 1; });
    var sel = $('cat');
    Object.keys(counts).sort().forEach(function (c) {
      var o = document.createElement('option');
      o.value = c; o.textContent = c + ' (' + counts[c] + ')';
      sel.appendChild(o);
    });
  }

  /* ---------- live tab ---------- */
  function renderLive() {
    var body = $('liveBody');
    if (!R) { body.innerHTML = ''; return; }
    var rows = R.live.slice().sort(function (a, b) { return (b.mcap_usd || 0) - (a.mcap_usd || 0); });
    body.innerHTML = rows.map(function (r, i) {
      return '<tr><td>' + (i + 1) + '</td>' +
        '<td><span class="name">' + esc(r.name) + '</span><br><span class="slug">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.category || 'Uncategorized') + '</td>' +
        '<td class="chains" title="' + esc((r.chains || []).join(', ')) + '">' + esc(chainsText(r.chains)) + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num"><strong>' + money(r.mcap_usd) + '</strong></td>' +
        '<td class="num">' + chgHtml(r.change_7d) + '</td>' +
        '<td class="num">' + (r.fdv_tvl == null ? '—' : r.fdv_tvl.toFixed(4)) + '</td></tr>';
    }).join('');
  }

  /* ---------- methodology ---------- */
  function renderCalib() {
    if (!R) return;
    var c = R.calibration;
    $('calibBody').innerHTML = c.by_category.map(function (row) {
      return '<tr><td>' + esc(row.category) + '</td>' +
        '<td class="num">' + row.n + '</td>' +
        '<td class="num">' + row.median_fdv_tvl.toFixed(4) + '</td>' +
        '<td class="num">' + row.multiple.toFixed(4) + '</td></tr>';
    }).join('');
    $('globalCalib').textContent = 'Global median FDV/TVL across live-token protocols: ' +
      c.global_median.toFixed(4) + ' → global multiple ' + c.global_multiple.toFixed(4) +
      '. Used for any category with fewer than ' + R.model.multiple_min_n +
      ' live protocols, and for protocols with no category.';
  }

  /* ---------- detail ---------- */
  function parseStep(s) {
    var ci = s.indexOf(' Cost: '), ti = s.indexOf(' Time: ');
    if (ci < 0 || ti < 0 || ti < ci) return { action: s, cost: '', time: '' };
    return {
      action: s.slice(0, ci),
      cost: s.slice(ci + 7, ti).replace(/\.$/, ''),
      time: s.slice(ti + 7).replace(/\.$/, '')
    };
  }
  function openDetail(slug) {
    if (!R) return;
    var r = null;
    R.rows.forEach(function (row) { if (row.slug === slug) r = row; });
    if (!r) return;
    var m = R.model;
    var growthPct = clamp(r.change_7d == null ? 0 : r.change_7d, m.growth_floor, m.growth_cap);
    var base = r.tvl_usd * r.category_multiple;
    var nChains = (r.chains || []).length;
    var ageNote = r.age_days == null ? 'unknown — model uses ' + m.unknown_age_days + ' days' : r.age_days + ' days';
    var steps = (r.farm_steps || []).map(function (s) {
      var p = parseStep(s);
      return '<li><div><div>' + esc(p.action) + '</div>' +
        (p.cost ? '<div class="cost"><b>Cost:</b> ' + esc(p.cost) + '</div>' : '') +
        (p.time ? '<div class="time"><b>Time:</b> ' + esc(p.time) + '</div>' : '') + '</div></li>';
    }).join('');
    $('detail').innerHTML =
      '<h2 id="dTitle">#' + r.rank + ' ' + esc(r.name) + '</h2>' +
      '<p class="meta">' + esc(r.slug) + ' · ' + esc(r.category || 'Uncategorized') + ' · ' +
      esc((r.chains || []).join(', ') || 'no chain listed') +
      (r.on_watchlist ? ' · <span class="badge">WATCHLIST</span>' : '') + '</p>' +
      '<div class="kv">' +
      '<div><b>' + moneyFull(r.tvl_usd) + '</b><span>Total value locked</span></div>' +
      '<div><b>' + (r.change_7d == null ? '—' : (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(1) + '%') + '</b><span>TVL change, 7 days</span></div>' +
      '<div><b>' + esc(ageNote) + '</b><span>Age since listing' + (r.listed_at ? ' (' + esc(r.listed_at) + ')' : '') + '</span></div>' +
      '<div><b>' + moneyFull(r.implied_value_usd) + '</b><span>Implied value (model)</span></div>' +
      '<div><b>' + r.category_multiple.toFixed(4) + '</b><span>Category multiple</span></div>' +
      '<div><b>records no token</b><span>Token status in the snapshot</span></div>' +
      '</div>' +
      '<h3>Model breakdown — model ' + esc(R.model_version) + '</h3>' +
      '<table class="breakdown"><tbody>' +
      '<tr><td>Base: TVL ' + moneyFull(r.tvl_usd) + ' × category multiple ' + r.category_multiple.toFixed(4) + '</td><td>' + moneyFull(base) + '</td></tr>' +
      '<tr><td>× growth ' + r.growth_multiplier.toFixed(4) + ' (7d ' + (r.change_7d == null ? 'no data, treated as 0%' : growthPct.toFixed(1) + '% after clamping to ' + m.growth_floor + '…+' + m.growth_cap + '%') + ', weight ' + m.growth_weight + ')</td><td>× ' + r.growth_multiplier.toFixed(4) + '</td></tr>' +
      '<tr><td>× maturity ' + r.maturity_multiplier.toFixed(4) + ' (age ' + esc(ageNote) + ', floor ' + m.maturity_floor + ', cap at ' + m.maturity_days + ' days)</td><td>× ' + r.maturity_multiplier.toFixed(4) + '</td></tr>' +
      '<tr><td>× chains ' + r.chain_multiplier.toFixed(4) + ' (' + nChains + ' chain' + (nChains === 1 ? '' : 's') + ', +' + (m.chain_step * 100).toFixed(0) + '% each up to ' + m.chain_max + ')</td><td>× ' + r.chain_multiplier.toFixed(4) + '</td></tr>' +
      '<tr class="total"><td>= Implied value</td><td>' + moneyFull(r.implied_value_usd) + '</td></tr>' +
      '</tbody></table>' +
      '<p class="note">Implied value is a model claim from this snapshot, not a market price and not a prediction of a token launch.</p>' +
      '<h3>Farm plan — 7 steps</h3><ol class="farm">' + steps + '</ol>';
    $('modal').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeDetail() {
    $('modal').hidden = true;
    document.body.style.overflow = '';
  }

  /* ---------- tabs ---------- */
  function showTab(name) {
    ['board', 'live', 'method'].forEach(function (t) {
      $('tab-' + t).hidden = t !== name;
    });
    document.querySelectorAll('.tab').forEach(function (b) {
      var on = b.getAttribute('data-tab') === name;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  /* ---------- hash ---------- */
  var currentDetail = null;
  function readHash() {
    var p = new URLSearchParams(location.hash.slice(1));
    var f = p.get('filter');
    if (f === 'watchlist') { state.wl = true; $('wl').checked = true; }
    var d = p.get('detail');
    if (d) { currentDetail = d; openDetail(d); }
    else if (currentDetail) { currentDetail = null; closeDetail(); }
    renderBoard();
  }

  /* ---------- wire up ---------- */
  function init() {
    renderMeta(); renderCats(); renderBoard(); renderLive(); renderCalib();
    if (!R) $('nodata').hidden = false;
    $('q').addEventListener('input', function (e) { state.q = e.target.value; renderBoard(); });
    $('cat').addEventListener('change', function (e) { state.cat = e.target.value; renderBoard(); });
    $('wl').addEventListener('change', function (e) { state.wl = e.target.checked; renderBoard(); });
    $('reset').addEventListener('click', function () {
      state.q = ''; state.cat = ''; state.wl = false; state.sort = 'implied'; state.dir = -1;
      $('q').value = ''; $('cat').value = ''; $('wl').checked = false;
      renderBoard();
    });
    document.querySelectorAll('#board th[data-sort]').forEach(function (th) {
      th.addEventListener('click', function () {
        var k = th.getAttribute('data-sort');
        if (state.sort === k) state.dir = -state.dir;
        else { state.sort = k; state.dir = k === 'rank' || k === 'name' || k === 'category' ? 1 : -1; }
        renderBoard();
      });
    });
    $('boardBody').addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-slug]');
      if (!tr) return;
      var slug = tr.getAttribute('data-slug');
      currentDetail = slug;
      try { history.pushState(null, '', '#detail=' + encodeURIComponent(slug)); } catch (err) { location.hash = 'detail=' + encodeURIComponent(slug); }
      openDetail(slug);
    });
    $('closeBtn').addEventListener('click', function () {
      currentDetail = null; closeDetail();
      try { history.pushState(null, '', location.pathname + location.search); } catch (err) { location.hash = ''; }
    });
    $('backdrop').addEventListener('click', function () { $('closeBtn').click(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('modal').hidden) $('closeBtn').click(); });
    document.querySelectorAll('.tab').forEach(function (b) {
      b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); });
    });
    window.addEventListener('hashchange', readHash);
    readHash();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
