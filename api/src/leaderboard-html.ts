export const LEADERBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Rapid42 Benchmark — Leaderboard</title>
<style>
  :root {
    --bg-primary: #0a0a0f;
    --bg-secondary: #12121a;
    --bg-card: #16161f;
    --bg-hover: #1c1c28;
    --bg-expanded: #111118;
    --border: #2a2a3a;
    --border-subtle: #1e1e2e;
    --text-primary: #e8e8f0;
    --text-secondary: #8888a0;
    --text-muted: #55556a;
    --accent: #6366f1;
    --accent-dim: #4f46e5;
    --green: #22c55e;
    --green-dim: rgba(34,197,94,0.12);
    --yellow: #eab308;
    --yellow-dim: rgba(234,179,8,0.12);
    --red: #ef4444;
    --red-dim: rgba(239,68,68,0.12);
    --blue: #3b82f6;
    --blue-dim: rgba(59,130,246,0.12);
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif;
    background: var(--bg-primary);
    color: var(--text-primary);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  .container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 24px;
  }

  /* Header */
  header {
    padding: 48px 0 32px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .logo-mark {
    width: 32px;
    height: 32px;
    background: var(--accent);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
    color: white;
  }

  .logo-text {
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.02em;
  }

  .logo-text span { color: var(--text-muted); font-weight: 400; }

  .version-badge {
    font-size: 12px;
    padding: 4px 10px;
    border: 1px solid var(--border);
    border-radius: 20px;
    color: var(--text-secondary);
  }

  header p {
    color: var(--text-secondary);
    font-size: 15px;
    max-width: 600px;
  }

  /* Tabs */
  .tabs {
    display: flex;
    gap: 8px;
    padding: 24px 0 0;
  }

  .tab-btn {
    font-size: 15px;
    padding: 10px 24px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
    font-weight: 500;
    letter-spacing: -0.01em;
  }

  .tab-btn:hover { border-color: var(--text-muted); color: var(--text-primary); }
  .tab-btn.active {
    background: var(--accent-dim);
    border-color: var(--accent);
    color: white;
  }

  /* Filters */
  .filters {
    display: flex;
    gap: 12px;
    padding: 20px 0;
    flex-wrap: wrap;
    align-items: center;
  }

  .filter-label {
    font-size: 13px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-right: 4px;
  }

  .filter-group {
    display: flex;
    gap: 4px;
  }

  .filter-btn {
    font-size: 13px;
    padding: 6px 14px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
  }

  .filter-btn:hover { border-color: var(--text-muted); color: var(--text-primary); }
  .filter-btn.active {
    background: var(--accent-dim);
    border-color: var(--accent);
    color: white;
  }

  /* Table */
  .table-wrapper {
    overflow-x: auto;
    border: 1px solid var(--border-subtle);
    border-radius: 12px;
    background: var(--bg-secondary);
    margin-bottom: 48px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }

  thead {
    position: sticky;
    top: 0;
    z-index: 10;
  }

  thead th {
    padding: 14px 16px;
    text-align: left;
    font-weight: 500;
    font-size: 12px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
    transition: color 0.15s;
  }

  thead th:hover { color: var(--text-secondary); }
  thead th.sorted { color: var(--accent); }
  thead th .sort-arrow { margin-left: 4px; font-size: 10px; }

  tbody tr {
    cursor: pointer;
    transition: background 0.1s;
  }

  tbody tr:hover { background: var(--bg-hover); }
  tbody tr.expanded { background: var(--bg-card); }
  tbody tr:not(:last-child) td { border-bottom: 1px solid var(--border-subtle); }

  td {
    padding: 14px 16px;
    white-space: nowrap;
  }

  td.model-cell {
    font-weight: 500;
    min-width: 160px;
  }

  .model-provider {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 500;
    margin-left: 8px;
  }

  .provider-local {
    background: var(--green-dim);
    color: var(--green);
  }

  .provider-api {
    background: var(--blue-dim);
    color: var(--blue);
  }

  .score {
    font-variant-numeric: tabular-nums;
    font-weight: 500;
  }

  .score-high { color: var(--green); }
  .score-mid { color: var(--yellow); }
  .score-low { color: var(--red); }

  .uplift {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .uplift-high { background: var(--green-dim); color: var(--green); }
  .uplift-mid { background: var(--yellow-dim); color: var(--yellow); }
  .uplift-low { background: var(--blue-dim); color: var(--blue); }

  .quant-badge {
    font-size: 11px;
    color: var(--text-muted);
    font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  }

  .framework-badge {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 500;
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text-secondary);
  }

  .framework-lm-studio { background: var(--green-dim); color: var(--green); border-color: transparent; }
  .framework-ollama { background: var(--blue-dim); color: var(--blue); border-color: transparent; }
  .framework-openclaw { background: rgba(99,102,241,0.12); color: var(--accent); border-color: transparent; }
  .framework-api { background: var(--yellow-dim); color: var(--yellow); border-color: transparent; }

  /* Expanded Row */
  .detail-row td {
    padding: 0;
    border-bottom: 1px solid var(--border) !important;
  }

  .detail-content {
    padding: 20px 24px;
    background: var(--bg-expanded);
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }

  .detail-card {
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    padding: 16px;
  }

  .detail-card h4 {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    margin-bottom: 12px;
  }

  .detail-row-item {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 13px;
  }

  .detail-row-item .label { color: var(--text-secondary); }
  .detail-row-item .value { font-weight: 500; font-variant-numeric: tabular-nums; }

  .bar-container {
    height: 6px;
    background: var(--bg-primary);
    border-radius: 3px;
    margin-top: 6px;
    overflow: hidden;
  }

  .bar {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .bar-green { background: var(--green); }
  .bar-yellow { background: var(--yellow); }
  .bar-red { background: var(--red); }

  /* Empty & Loading States */
  .state-msg {
    text-align: center;
    padding: 48px 24px;
    color: var(--text-muted);
    font-size: 15px;
  }

  .state-msg .icon {
    font-size: 32px;
    margin-bottom: 12px;
  }

  .state-msg .title {
    font-size: 18px;
    color: var(--text-secondary);
    margin-bottom: 4px;
    font-weight: 500;
  }

  .spinner {
    display: inline-block;
    width: 24px;
    height: 24px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 12px;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* Footer */
  footer {
    padding: 32px 0;
    border-top: 1px solid var(--border-subtle);
    text-align: center;
    color: var(--text-muted);
    font-size: 13px;
  }

  footer a { color: var(--accent); text-decoration: none; }
  footer a:hover { text-decoration: underline; }

  /* Responsive */
  @media (max-width: 768px) {
    header { padding: 24px 0 16px; }
    .header-top { flex-direction: column; align-items: flex-start; gap: 8px; }
    .tabs { gap: 6px; }
    .tab-btn { padding: 8px 16px; font-size: 14px; }
    .filters { gap: 8px; }
    .container { padding: 0 16px; }
    td, thead th { padding: 10px 12px; font-size: 13px; }
    .detail-grid { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>

<div class="container">
  <header>
    <div class="header-top">
      <div class="logo">
        <div class="logo-mark">R</div>
        <div class="logo-text">Rapid42 <span>Benchmark</span></div>
      </div>
      <div class="version-badge">v2.0</div>
    </div>
    <p>Benchmark any AI model or agent setup. Server-judged. Anti-cheat.</p>
  </header>

  <div class="tabs">
    <button class="tab-btn active" data-tab="model">Model Bench</button>
    <button class="tab-btn" data-tab="agent">Agent Bench</button>
  </div>

  <div class="filters">
    <span class="filter-label">Framework</span>
    <div class="filter-group" id="framework-filters">
      <button class="filter-btn active" data-filter="all">All</button>
      <button class="filter-btn" data-filter="lm-studio">LM Studio</button>
      <button class="filter-btn" data-filter="ollama">Ollama</button>
      <button class="filter-btn" data-filter="openclaw">OpenClaw</button>
      <button class="filter-btn" data-filter="api">API</button>
    </div>
  </div>

  <div class="table-wrapper">
    <table id="leaderboard">
      <thead>
        <tr>
          <th data-sort="rank">#</th>
          <th data-sort="model">Model</th>
          <th data-sort="framework">Framework</th>
          <th data-sort="score" class="sorted">Score ↓</th>
          <th data-sort="vanilla">Vanilla</th>
          <th data-sort="specialist">Specialist</th>
          <th data-sort="uplift">Uplift</th>
          <th data-sort="time">Time</th>
          <th data-sort="tokens">Tokens</th>
        </tr>
      </thead>
      <tbody id="table-body">
        <tr><td colspan="9">
          <div class="state-msg">
            <div class="spinner"></div>
            <div class="title">Loading leaderboard...</div>
          </div>
        </td></tr>
      </tbody>
    </table>
  </div>

  <footer>
    <p>Built by <a href="https://rapid42.com">Rapid42</a> · Server-judged scoring with anti-cheat · <a href="https://github.com/NSlothuus/agent-bench">Source</a></p>
  </footer>
</div>

<script>
(function() {
  let data = [];
  let sortKey = 'score';
  let sortAsc = false;
  let frameworkFilter = 'all';
  let activeTab = 'model';
  let expandedRow = null;

  function scoreClass(v) {
    if (v >= 7.5) return 'score-high';
    if (v >= 5.5) return 'score-mid';
    return 'score-low';
  }

  function barClass(v) {
    if (v >= 7.5) return 'bar-green';
    if (v >= 5.5) return 'bar-yellow';
    return 'bar-red';
  }

  function frameworkClass(fw) {
    if (!fw) return '';
    const f = fw.toLowerCase().replace(/[^a-z]/g, '-');
    if (f.includes('lm-studio') || f.includes('lmstudio')) return 'framework-lm-studio';
    if (f.includes('ollama')) return 'framework-ollama';
    if (f.includes('openclaw')) return 'framework-openclaw';
    return 'framework-api';
  }

  function frameworkMatch(fw, filter) {
    if (filter === 'all') return true;
    if (!fw) return filter === 'api';
    const f = fw.toLowerCase();
    if (filter === 'lm-studio') return f.includes('lm-studio') || f.includes('lmstudio');
    if (filter === 'ollama') return f.includes('ollama');
    if (filter === 'openclaw') return f.includes('openclaw');
    if (filter === 'api') return !f.includes('lm-studio') && !f.includes('lmstudio') && !f.includes('ollama') && !f.includes('openclaw');
    return true;
  }

  function formatTime(ms) {
    if (!ms) return '—';
    if (ms < 1000) return ms + 'ms';
    return (ms / 1000).toFixed(1) + 's';
  }

  function formatTokens(t) {
    if (!t) return '—';
    if (t >= 1000) return (t / 1000).toFixed(1) + 'K';
    return t.toString();
  }

  function getSortValue(entry, key) {
    switch (key) {
      case 'rank': return entry._rank || 0;
      case 'model': return (entry.model_name || entry.model || '').toLowerCase();
      case 'framework': return (entry.framework || '').toLowerCase();
      case 'score': return entry.score || 0;
      case 'vanilla': return entry.score || 0;
      case 'specialist': return entry.score || 0;
      case 'uplift': return 0;
      case 'time': return entry.time_ms || 0;
      case 'tokens': return entry.tokens || 0;
      default: return 0;
    }
  }

  function render() {
    let filtered = data.filter(function(e) {
      if (!frameworkMatch(e.framework, frameworkFilter)) return false;
      return true;
    });

    filtered.sort(function(a, b) {
      var av = getSortValue(a, sortKey), bv = getSortValue(b, sortKey);
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });

    var tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9"><div class="state-msg"><div class="icon">\\u{1F3AF}</div><div class="title">No results yet</div><p>Be the first to benchmark a model! Run the CLI or connect via MCP.</p></div></td></tr>';
      return;
    }

    filtered.forEach(function(entry, idx) {
      var s = entry.score != null ? entry.score : 0;
      var modelName = entry.model_name || entry.model || 'unknown';
      var fw = entry.framework || '—';
      var costStr = entry.cost_usd != null ? '\\$' + entry.cost_usd.toFixed(4) : '—';
      var effStr = entry.efficiency_score != null ? entry.efficiency_score.toFixed(1) : '—';

      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td style="color:var(--text-muted)">' + (idx + 1) + '</td>' +
        '<td class="model-cell">' + modelName + '</td>' +
        '<td><span class="framework-badge ' + frameworkClass(fw) + '">' + fw + '</span></td>' +
        '<td class="score ' + scoreClass(s) + '">' + s.toFixed(1) + '</td>' +
        '<td class="score ' + scoreClass(s) + '">' + s.toFixed(1) + '</td>' +
        '<td class="score" style="color:var(--text-muted)">—</td>' +
        '<td><span class="uplift" style="color:var(--text-muted)">—</span></td>' +
        '<td style="color:var(--text-secondary)">' + formatTime(entry.time_ms) + '</td>' +
        '<td style="color:var(--text-secondary)">' + formatTokens(entry.tokens) + '</td>';

      tr.addEventListener('click', function() { toggleExpand(entry, tr, idx); });
      tbody.appendChild(tr);
    });
  }

  function toggleExpand(entry, tr, idx) {
    var existing = document.querySelector('.detail-row');
    if (existing) existing.remove();
    document.querySelectorAll('tr.expanded').forEach(function(r) { r.classList.remove('expanded'); });

    var id = (entry.model_name || entry.model || '') + '-' + idx;
    if (expandedRow === id) { expandedRow = null; return; }
    expandedRow = id;
    tr.classList.add('expanded');

    var s = entry.score != null ? entry.score : 0;
    var costStr = entry.cost_usd != null ? '\\$' + entry.cost_usd.toFixed(4) : '—';
    var effStr = entry.efficiency_score != null ? entry.efficiency_score.toFixed(1) : '—';
    var tokPerSec = (entry.tokens && entry.time_ms) ? (entry.tokens / (entry.time_ms / 1000)).toFixed(0) : '—';

    var detailTr = document.createElement('tr');
    detailTr.className = 'detail-row';
    detailTr.innerHTML = '<td colspan="9">' +
      '<div class="detail-content">' +
        '<div class="detail-grid">' +
          '<div class="detail-card">' +
            '<h4>Run Info</h4>' +
            '<div class="detail-row-item"><span class="label">Model</span><span class="value">' + (entry.model_name || entry.model || '—') + '</span></div>' +
            '<div class="detail-row-item"><span class="label">Framework</span><span class="value">' + (entry.framework || '—') + '</span></div>' +
            '<div class="detail-row-item"><span class="label">Cost</span><span class="value">' + costStr + '</span></div>' +
            '<div class="detail-row-item"><span class="label">Efficiency</span><span class="value">' + effStr + '</span></div>' +
            '<div class="detail-row-item"><span class="label">Tok/s</span><span class="value">' + tokPerSec + '</span></div>' +
          '</div>' +
          '<div class="detail-card">' +
            '<h4>Overall Score</h4>' +
            '<div class="detail-row-item"><span class="label">Score</span><span class="value score ' + scoreClass(s) + '">' + s.toFixed(1) + ' / 10</span></div>' +
            '<div class="bar-container"><div class="bar ' + barClass(s) + '" style="width:' + (s * 10) + '%"></div></div>' +
          '</div>' +
          '<div class="detail-card">' +
            '<h4>Performance</h4>' +
            '<div class="detail-row-item"><span class="label">Total Time</span><span class="value">' + formatTime(entry.time_ms) + '</span></div>' +
            '<div class="detail-row-item"><span class="label">Tokens Used</span><span class="value">' + formatTokens(entry.tokens) + '</span></div>' +
            '<div class="detail-row-item"><span class="label">Tokens/sec</span><span class="value">' + tokPerSec + '</span></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</td>';

    tr.after(detailTr);
  }

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      expandedRow = null;
      render();
    });
  });

  // Sort
  document.querySelectorAll('thead th[data-sort]').forEach(function(th) {
    th.addEventListener('click', function() {
      var key = th.dataset.sort;
      if (sortKey === key) { sortAsc = !sortAsc; }
      else { sortKey = key; sortAsc = false; }
      document.querySelectorAll('thead th').forEach(function(h) {
        h.classList.remove('sorted');
        var arrow = h.querySelector('.sort-arrow');
        if (arrow) arrow.remove();
      });
      th.classList.add('sorted');
      var arrow = document.createElement('span');
      arrow.className = 'sort-arrow';
      arrow.textContent = sortAsc ? ' \\u2191' : ' \\u2193';
      th.appendChild(arrow);
      expandedRow = null;
      render();
    });
  });

  // Framework filters
  document.getElementById('framework-filters').addEventListener('click', function(e) {
    if (!e.target.classList.contains('filter-btn')) return;
    document.querySelectorAll('#framework-filters .filter-btn').forEach(function(b) { b.classList.remove('active'); });
    e.target.classList.add('active');
    frameworkFilter = e.target.dataset.filter;
    expandedRow = null;
    render();
  });

  // Load data
  fetch('/api/bench/leaderboard')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      var entries = (d.data && d.data.entries) || [];
      data = entries.map(function(e, i) {
        e._rank = e.rank || (i + 1);
        return e;
      });
      render();
    })
    .catch(function() {
      document.getElementById('table-body').innerHTML =
        '<tr><td colspan="9"><div class="state-msg"><div class="icon">\\u26A0\\uFE0F</div><div class="title">Failed to load</div><p>Could not reach the leaderboard API. Try refreshing.</p></div></td></tr>';
    });
})();
</script>

</body>
</html>`;
