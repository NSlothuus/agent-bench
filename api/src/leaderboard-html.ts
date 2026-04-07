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

  .score {
    font-variant-numeric: tabular-nums;
    font-weight: 500;
  }

  .score-high { color: var(--green); }
  .score-mid { color: var(--yellow); }
  .score-low { color: var(--red); }

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
  .judge-panel-card { grid-column: span 2; }
  .judge-grid { display: flex; flex-direction: column; gap: 8px; }
  .judge-card {
    background: var(--bg-primary);
    border: 1px solid var(--border-subtle);
    border-radius: 6px;
    padding: 10px 12px;
  }
  .judge-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  .judge-name { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
  .judge-score { font-size: 14px; font-weight: 700; }
  .judge-dims { display: flex; gap: 12px; }
  .judge-dims span { display: flex; align-items: center; gap: 3px; }
  .dim-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; }
  .dim-val { font-size: 12px; font-weight: 600; color: var(--text-secondary); }

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

  .hidden { display: none; }

  footer {
    padding: 32px 0;
    border-top: 1px solid var(--border-subtle);
    text-align: center;
    color: var(--text-muted);
    font-size: 13px;
  }

  footer a { color: var(--accent); text-decoration: none; }
  footer a:hover { text-decoration: underline; }

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

  /* ── Aggregated detail panel ─────────────────────────── */
  .detail-agg { padding: 20px 24px; }
  .agg-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .agg-title {}
  .agg-model {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
  }
  .agg-stats {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
  }
  .as-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .as-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
  .as-val { font-size: 18px; font-weight: 700; color: var(--text-primary); }
  .as-val.score { color: inherit; }

  /* Score bars overview */
  .agg-score-bars { margin-bottom: 20px; }
  .score-bars { display: flex; flex-direction: column; gap: 6px; }
  .sb-item { display: flex; align-items: center; gap: 10px; }
  .sb-label { font-size: 11px; color: var(--text-secondary); text-transform: capitalize; min-width: 70px; }
  .sb-bar-wrap { flex: 1; height: 8px; background: var(--bg-primary); border-radius: 4px; overflow: hidden; }
  .sb-bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s ease; }
  .sb-val { font-size: 12px; font-weight: 600; min-width: 32px; text-align: right; }
  .sb-val.score { color: inherit; }

  /* Task table */
  .agg-table-wrap { overflow-x: auto; }
  .agg-table-header, .task-row {
    display: grid;
    grid-template-columns: 90px 60px 1fr 70px 70px 70px 1fr;
    align-items: center;
    gap: 0;
  }
  .agg-table-header {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    padding: 0 8px 6px;
    border-bottom: 1px solid var(--border-subtle);
    margin-bottom: 4px;
  }
  .task-row {
    padding: 8px 8px;
    border-radius: 6px;
    transition: background 0.15s;
    border-bottom: 1px solid var(--border-subtle);
  }
  .task-row:hover { background: var(--bg-hover); }
  .task-name { font-size: 13px; font-weight: 600; color: var(--text-secondary); text-transform: capitalize; display: flex; flex-direction: column; gap: 1px; }
  .task-id-hint { font-size: 10px; font-weight: 400; color: var(--text-muted); text-transform: none; letter-spacing: 0.01em; }
  .task-score-col {}
  .task-score { font-size: 15px; font-weight: 700; }
  .task-score.score { color: inherit; }
  .task-bar-col {}
  .task-bar { height: 6px; background: var(--bg-primary); border-radius: 3px; overflow: hidden; }
  .task-bar-fill { height: 100%; border-radius: 3px; }
  .task-meta-col { text-align: center; }
  .tm { font-size: 11px; color: var(--text-muted); }
  .task-judge-col { display: flex; gap: 6px; flex-wrap: wrap; }
  .jb {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: 4px;
    padding: 3px 6px;
    font-size: 10px;
  }
  .jb-name { color: var(--text-muted); }
  .jb-score { font-weight: 700; font-size: 11px; }
  .jb-score.score { color: inherit; }
  .jb-dims { color: var(--text-muted); font-family: monospace; font-size: 9px; }
  .jb-pending { color: var(--text-muted); font-style: italic; }

  .agg-legend {
    margin-top: 12px;
    font-size: 10px;
    color: var(--text-muted);
    text-align: center;
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
      <div class="version-badge">v3.0</div>
    </div>
    <p>Benchmark any AI model or agent setup. Server-judged. Anti-cheat.</p>
  </header>

  <div class="tabs">
    <button class="tab-btn active" data-tab="model">Models</button>
    <button class="tab-btn" data-tab="agent">Agent Setups</button>
  </div>

  <!-- Model filters -->
  <div class="filters" id="model-filters">
    <span class="filter-label">Framework</span>
    <div class="filter-group" id="framework-filters">
      <button class="filter-btn active" data-filter="all">All</button>
      <button class="filter-btn" data-filter="lm-studio">LM Studio</button>
      <button class="filter-btn" data-filter="ollama">Ollama</button>
      <button class="filter-btn" data-filter="openclaw">OpenClaw</button>
      <button class="filter-btn" data-filter="api">API</button>
    </div>
  </div>

  <!-- Agent filters -->
  <div class="filters hidden" id="agent-filters">
    <span class="filter-label">Framework</span>
    <div class="filter-group" id="agent-framework-filters">
      <button class="filter-btn active" data-filter="all">All</button>
      <button class="filter-btn" data-filter="claude-code">Claude Code</button>
      <button class="filter-btn" data-filter="openclaw">OpenClaw</button>
      <button class="filter-btn" data-filter="codex">Codex</button>
    </div>
  </div>

  <!-- Model leaderboard table -->
  <div class="table-wrapper" id="model-table-wrapper">
    <table id="model-leaderboard">
      <thead>
        <tr>
          <th data-sort="rank">#</th>
          <th data-sort="model">Model</th>
          <th data-sort="score" class="sorted">Score</th>
          <th data-sort="time">Time</th>
          <th data-sort="tokens">Tokens</th>
          <th data-sort="cost">Cost</th>
          <th>Finished</th>
        </tr>
      </thead>
      <tbody id="model-table-body">
        <tr><td colspan="7">
          <div class="state-msg">
            <div class="spinner"></div>
            <div class="title">Loading leaderboard...</div>
          </div>
        </td></tr>
      </tbody>
    </table>
  </div>

  <!-- Agent setups leaderboard table -->
  <div class="table-wrapper hidden" id="agent-table-wrapper">
    <table id="agent-leaderboard">
      <thead>
        <tr>
          <th>#</th>
          <th>Setup</th>
          <th>Framework</th>
          <th>Model</th>
          <th>Avg Score</th>
          <th>Runs</th>
        </tr>
      </thead>
      <tbody id="agent-table-body">
        <tr><td colspan="6">
          <div class="state-msg">
            <div class="spinner"></div>
            <div class="title">Loading agent setups...</div>
          </div>
        </td></tr>
      </tbody>
    </table>
  </div>

  <footer>
    <p>Built by <a href="https://rapid42.com">Rapid42</a> \\u00B7 Server-judged scoring with anti-cheat \\u00B7 <a href="https://github.com/NSlothuus/agent-bench">Source</a></p>
  </footer>
</div>

<script>
(function() {
  var modelData = [];
  var agentData = [];
  var activeTab = 'model';
  var modelSortKey = 'score';
  var modelSortAsc = false;
  var frameworkFilter = 'all';
  var agentFrameworkFilter = 'all';

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
    var f = fw.toLowerCase().replace(/[^a-z]/g, '-');
    if (f.includes('lm-studio') || f.includes('lmstudio')) return 'framework-lm-studio';
    if (f.includes('ollama')) return 'framework-ollama';
    if (f.includes('openclaw')) return 'framework-openclaw';
    return 'framework-api';
  }

  function frameworkMatch(fw, filter) {
    if (filter === 'all') return true;
    if (!fw) return filter === 'api';
    var f = fw.toLowerCase();
    if (filter === 'lm-studio') return f.includes('lm-studio') || f.includes('lmstudio');
    if (filter === 'ollama') return f.includes('ollama');
    if (filter === 'openclaw') return f.includes('openclaw');
    if (filter === 'claude-code') return f.includes('claude-code') || f.includes('claude_code');
    if (filter === 'codex') return f.includes('codex');
    if (filter === 'api') return !f.includes('lm-studio') && !f.includes('lmstudio') && !f.includes('ollama') && !f.includes('openclaw');
    return true;
  }

  function formatTime(ms) {
    if (!ms) return '\\u2014';
    if (ms < 1000) return ms + 'ms';
    return (ms / 1000).toFixed(1) + 's';
  }

  function formatTokens(t) {
    if (!t) return '\\u2014';
    if (t >= 1000) return (t / 1000).toFixed(1) + 'K';
    return t.toString();
  }

  function getSortValue(entry, key) {
    switch (key) {
      case 'rank': return entry._rank || 0;
      case 'model': return (entry.model || '').toLowerCase();
      case 'framework': return (entry.framework || '').toLowerCase();
      case 'score': return (entry.best_score || entry.score) || 0;
      case 'time': return (entry.total_time_ms || entry.time_ms) || 0;
      case 'tokens': return (entry.total_tokens || entry.tokens) || 0;
      case 'cost': return (entry.total_cost_usd || entry.cost_usd) || 999999;
      default: return 0;
    }
  }

  function renderModelTable() {
    var filtered = modelData.filter(function(e) {
      return frameworkMatch(e.framework, frameworkFilter);
    });

    filtered.sort(function(a, b) {
      var av = getSortValue(a, modelSortKey);
      var bv = getSortValue(b, modelSortKey);
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      if (av < bv) return modelSortAsc ? -1 : 1;
      if (av > bv) return modelSortAsc ? 1 : -1;
      return 0;
    });

    var tbody = document.getElementById('model-table-body');
    tbody.innerHTML = '';

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="state-msg"><div class="icon">\u{1F3AF}</div><div class="title">No complete runs yet</div><p>Waiting for runs with all 5 tasks + all 3 judges.</p></div></td></tr>';
      return;
    }

    // Group by model to detect raw+specialist pairs
    var byModel = {};
    for (var fi = 0; fi < filtered.length; fi++) {
      var e = filtered[fi];
      var key = (e.model || 'unknown') + '::' + (e.framework || '');
      if (!byModel[key]) byModel[key] = [];
      byModel[key].push(e);
    }

    var flatRows = [];
    for (var mkey in byModel) {
      var group = byModel[mkey];
      var hasRaw = false, hasSpec = false;
      for (var gi = 0; gi < group.length; gi++) {
        if (group[gi].specialist_mode === 'raw') hasRaw = true;
        if (group[gi].specialist_mode === 'specialist') hasSpec = true;
      }
      if (hasRaw && hasSpec) {
        var specEntry = null, rawEntry = null;
        for (var gi2 = 0; gi2 < group.length; gi2++) {
          if (group[gi2].specialist_mode === 'specialist') specEntry = group[gi2];
          if (group[gi2].specialist_mode === 'raw') rawEntry = group[gi2];
        }
        flatRows.push({ _split: true, spec: specEntry, raw: rawEntry, _model: (specEntry && specEntry.model) || (rawEntry && rawEntry.model) });
      } else {
        flatRows.push({ _split: false, entry: group[0] });
      }
    }

    flatRows.sort(function(a, b) {
      var av, bv;
      if (a._split) av = getSortValue(a.spec, modelSortKey);
      else av = getSortValue(a.entry, modelSortKey);
      if (b._split) bv = getSortValue(b.spec, modelSortKey);
      else bv = getSortValue(b.entry, modelSortKey);
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      if (av < bv) return modelSortAsc ? -1 : 1;
      if (av > bv) return modelSortAsc ? 1 : -1;
      return 0;
    });

    flatRows.forEach(function(row, idx) {
      if (row._split) {
        var specS = row.spec && row.spec.score != null ? row.spec.score : 0;
        var rawS = row.raw && row.raw.score != null ? row.raw.score : 0;
        var modelName = row._model || 'unknown';
        var specFinished = row.spec && row.spec.finished_at ? new Date(row.spec.finished_at).toLocaleString() : '\u2014';
        var specCost = row.spec && row.spec.cost_usd != null ? '\$' + row.spec.cost_usd.toFixed(4) : '\u2014';

        // Main row: show specialist as primary
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td style="color:var(--text-muted)">' + (idx + 1) + '</td>' +
          '<td class="model-cell">' + modelName + '</td>' +
          '<td class="score score-high">' + specS.toFixed(1) + ' <span style="font-size:10px;color:var(--accent);font-weight:600">SPEC</span></td>' +
          '<td style="color:var(--text-secondary)">' + formatTime(row.spec && row.spec.time_ms) + '</td>' +
          '<td style="color:var(--text-secondary)">' + formatTokens(row.spec && row.spec.tokens) + '</td>' +
          '<td style="color:var(--text-secondary)">' + specCost + '</td>' +
          '<td style="color:var(--text-muted);font-size:11px">' + specFinished + '</td>';
        var self = row;
        tr.addEventListener('click', function() { toggleModelExpand(self.spec, tr, 'spec-' + idx); });
        tbody.appendChild(tr);

        // Specialist sub-row
        var trSpec = document.createElement('tr');
        trSpec.className = 'sub-row specialist-sub';
        trSpec.style.cssText = 'background:var(--bg-secondary);cursor:pointer';
        trSpec.innerHTML =
          '<td></td>' +
          '<td style="padding-left:24px;color:var(--accent);font-size:13px;font-weight:500">\u251C\u2500\u2500 Specialist</td>' +
          '<td class="score score-high">' + specS.toFixed(1) + ' <span style="font-size:10px;color:var(--accent)">avg</span></td>' +
          '<td style="color:var(--text-secondary)">' + formatTime(row.spec && row.spec.time_ms) + '</td>' +
          '<td style="color:var(--text-secondary)">' + formatTokens(row.spec && row.spec.tokens) + '</td>' +
          '<td style="color:var(--text-secondary)">' + specCost + '</td>' +
          '<td></td>';
        trSpec.addEventListener('click', function(e) { e.stopPropagation(); toggleModelExpand(self.spec, trSpec, 'spec-detail-' + idx); });
        tbody.appendChild(trSpec);

        // Raw sub-row
        var rawFinished = row.raw && row.raw.finished_at ? new Date(row.raw.finished_at).toLocaleString() : '\u2014';
        var rawCost = row.raw && row.raw.cost_usd != null ? '\$' + row.raw.cost_usd.toFixed(4) : '\u2014';
        var trRaw = document.createElement('tr');
        trRaw.className = 'sub-row raw-sub';
        trRaw.style.cssText = 'background:var(--bg-secondary);cursor:pointer';
        trRaw.innerHTML =
          '<td></td>' +
          '<td style="padding-left:24px;color:var(--text-muted);font-size:13px;font-weight:500">\u2514\u2500\u2500 Raw</td>' +
          '<td class="score ' + scoreClass(rawS) + '">' + rawS.toFixed(1) + ' <span style="font-size:10px;color:var(--text-muted)">avg</span></td>' +
          '<td style="color:var(--text-secondary)">' + formatTime(row.raw && row.raw.time_ms) + '</td>' +
          '<td style="color:var(--text-secondary)">' + formatTokens(row.raw && row.raw.tokens) + '</td>' +
          '<td style="color:var(--text-secondary)">' + rawCost + '</td>' +
          '<td></td>';
        trRaw.addEventListener('click', function(e) { e.stopPropagation(); toggleModelExpand(self.raw, trRaw, 'raw-detail-' + idx); });
        tbody.appendChild(trRaw);

      } else {
        var entry = row.entry;
        var tr = document.createElement('tr');
        var s = entry.score != null ? entry.score : 0;
        var modelName = entry.model || 'unknown';
        var costStr = entry.cost_usd != null ? '\$' + entry.cost_usd.toFixed(4) : '\u2014';
        var finishedStr = entry.finished_at ? new Date(entry.finished_at).toLocaleString() : '\u2014';
        tr.innerHTML =
          '<td style="color:var(--text-muted)">' + (idx + 1) + '</td>' +
          '<td class="model-cell">' + modelName + '</td>' +
          '<td class="score ' + scoreClass(s) + '">' + s.toFixed(1) + '</td>' +
          '<td style="color:var(--text-secondary)">' + formatTime(entry.time_ms) + '</td>' +
          '<td style="color:var(--text-secondary)">' + formatTokens(entry.tokens) + '</td>' +
          '<td style="color:var(--text-secondary)">' + costStr + '</td>' +
          '<td style="color:var(--text-muted);font-size:11px">' + finishedStr + '</td>';

        tr.addEventListener('click', function() { toggleModelExpand(entry, tr, idx); });
        tbody.appendChild(tr);
      }
    });
  }


  var expandedModelRow = null;

  function toggleModelExpand(entry, tr, idx) {
    var existing = document.querySelector('#model-table-wrapper .detail-row');
    if (existing) existing.remove();
    document.querySelectorAll('#model-table-wrapper tr.expanded').forEach(function(r) { r.classList.remove('expanded'); });

    var id = (entry.model || '') + '-' + idx;
    if (expandedModelRow === id) { expandedModelRow = null; return; }
    expandedModelRow = id;
    tr.classList.add('expanded');

    var detailTr = document.createElement('tr');
    detailTr.className = 'detail-row';

    // Aggregated mode: show per-task breakdown with visual score bars
    if (entry.tasks !== undefined) {
      var judgeNames = {'judge1': 'Claude Opus', 'judge2': 'GPT-5.4', 'judge3': 'Gemini 3.1'};

      // Build task rows HTML
      var taskRowsHtml = '';
      var taskBarMax = 0;
      var catCount = {};
      for (var ti = 0; ti < entry.tasks.length; ti++) {
        var _tc = entry.tasks[ti].category || 'unknown';
        catCount[_tc] = (catCount[_tc] || 0) + 1;
        taskBarMax = Math.max(taskBarMax, entry.tasks[ti].score || 0);
      }

      for (var ti = 0; ti < entry.tasks.length; ti++) {
        var task = entry.tasks[ti];
        var isDupCat = catCount[task.category || 'unknown'] > 1;
        var ts = task.score != null ? task.score : 0;
        var tTime = formatTime(task.time_ms);
        var tTok = formatTokens(task.tokens);
        var tCost = task.cost_usd != null ? '\$' + task.cost_usd.toFixed(2) : '\u2014';
        var barPct = taskBarMax > 0 ? (ts / taskBarMax * 100).toFixed(1) : 0;
        var hasJudges = task.judge_breakdown && Object.keys(task.judge_breakdown).length > 0;

        // Build judge badges
        var judgeBadges = '';
        if (hasJudges) {
          var tj = task.judge_breakdown;
          for (var jid in tj) {
            var j = tj[jid];
            var jName = judgeNames[jid] || j.name || jid;
            var jComp = j.composite != null ? j.composite.toFixed(1) : '\u2014';
            var jC = j.scores ? (j.scores.correctness != null ? j.scores.correctness : '\u2014') : '\u2014';
            var jJ = j.scores ? (j.scores.judgment != null ? j.scores.judgment : '\u2014') : '\u2014';
            var jQ = j.scores ? (j.scores.quality != null ? j.scores.quality : '\u2014') : '\u2014';
            var jP = j.scores ? (j.scores.completeness != null ? j.scores.completeness : '\u2014') : '\u2014';
            var shortName = jName === 'Claude Opus' ? 'Opus' : (jName === 'GPT-5.4' ? 'GPT-5.4' : (jName === 'Gemini 3.1' ? 'Gemini' : jName));
            judgeBadges += '<div class="jb"><div class="jb-name">' + shortName + '</div>' +
              '<div class="jb-score score ' + scoreClass(j.composite) + '">' + jComp + '</div>' +
              '<div class="jb-dims">C:' + jC + ' J:' + jJ + ' Q:' + jQ + ' P:' + jP + '</div></div>';
          }
        } else {
          judgeBadges = '<div class="jb jb-pending">Judge pending</div>';
        }

        taskRowsHtml += '<div class="task-row">' +
          '<div class="task-name">' + (task.category || 'unknown') + (isDupCat && task.task_id ? ' <span class="task-id-hint">' + task.task_id.replace(/_/g,' ') + '</span>' : '') + '</div>' +
          '<div class="task-score-col">' +
            '<span class="task-score score ' + scoreClass(ts) + '">' + ts.toFixed(1) + '</span>' +
          '</div>' +
          '<div class="task-bar-col">' +
            '<div class="task-bar"><div class="task-bar-fill ' + barClass(ts) + '" style="width:' + barPct + '%"></div></div>' +
          '</div>' +
          '<div class="task-meta-col">' +
            '<span class="tm">' + tTime + '</span>' +
          '</div>' +
          '<div class="task-meta-col">' +
            '<span class="tm">' + tTok + '</span>' +
          '</div>' +
          '<div class="task-meta-col">' +
            '<span class="tm">' + tCost + '</span>' +
          '</div>' +
          '<div class="task-judge-col">' + judgeBadges + '</div>' +
        '</div>';
      }

      // Score summary bar across all tasks
      var scoreBarHtml = '<div class="score-bars">';
      for (var si = 0; si < entry.tasks.length; si++) {
        var st = entry.tasks[si];
        var ss = st.score || 0;
        scoreBarHtml += '<div class="sb-item">' +
          '<div class="sb-label">' + (st.category || '?') + '</div>' +
          '<div class="sb-bar-wrap"><div class="sb-bar-fill ' + barClass(ss) + '" style="width:' + (ss * 10).toFixed(1) + '%"></div></div>' +
          '<div class="sb-val score ' + scoreClass(ss) + '">' + ss.toFixed(1) + '</div>' +
        '</div>';
      }
      scoreBarHtml += '</div>';

      var totalCost = entry.total_cost_usd != null ? '\$' + entry.total_cost_usd.toFixed(4) : '\u2014';
      var totalTime = formatTime(entry.total_time_ms);
      var totalTok = formatTokens(entry.total_tokens);
      var avgScore = entry.avg_score != null ? entry.avg_score.toFixed(1) : '\u2014';

      detailTr.innerHTML = '<td colspan="7"><div class="detail-content detail-agg">' +
        '<div class="agg-header">' +
          '<div class="agg-title"><span class="agg-model">' + (entry.model || '\u2014') + '</span></div>' +
          '<div class="agg-stats">' +
            '<div class="as-item"><span class="as-label">Best</span><span class="as-val score ' + scoreClass(entry.best_score || 0) + '">' + (entry.best_score || 0).toFixed(1) + '</span></div>' +
            '<div class="as-item"><span class="as-label">Avg</span><span class="as-val">' + avgScore + '</span></div>' +
            '<div class="as-item"><span class="as-label">Runs</span><span class="as-val">' + entry.run_count + '</span></div>' +
            '<div class="as-item"><span class="as-label">Total</span><span class="as-val">' + totalTime + '</span></div>' +
            '<div class="as-item"><span class="as-label">Tokens</span><span class="as-val">' + totalTok + '</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="agg-score-bars">' + scoreBarHtml + '</div>' +
        '<div class="agg-table-wrap">' +
          '<div class="agg-table-header">' +
            '<span class="ath-name">Task</span>' +
            '<span class="ath-score">Score</span>' +
            '<span class="ath-bar">Performance</span>' +
            '<span class="ath-meta">Time</span>' +
            '<span class="ath-meta">Tokens</span>' +
            '<span class="ath-meta">Cost</span>' +
            '<span class="ath-judge">Judges</span>' +
          '</div>' +
          taskRowsHtml +
        '</div>' +
        '<div class="agg-legend">C = Correctness &nbsp;·&nbsp; J = Judgment &nbsp;·&nbsp; Q = Quality &nbsp;·&nbsp; P = Completeness &nbsp;·&nbsp; Judges: Opus = Claude Opus, GPT-5.4 = GPT-5.4</div>' +
      '</div></td>';

    } else {detailTr.innerHTML = '<td colspan="7"><div class="detail-content"><div class="detail-grid">' +
        '<div class="detail-card"><h4>Run Info</h4>' +
          '<div class="detail-row-item"><span class="label">Model</span><span class="value">' + (entry.model || '\u2014') + '</span></div>' +
          '<div class="detail-row-item"><span class="label">Framework</span><span class="value">' + (entry.framework || '\u2014') + '</span></div>' +
          '<div class="detail-row-item"><span class="label">Cost</span><span class="value">' + costStr + '</span></div>' +
          '<div class="detail-row-item"><span class="label">Efficiency</span><span class="value">' + effStr + '</span></div>' +
        '</div>' +
        '<div class="detail-card"><h4>Score</h4>' +
          '<div class="detail-row-item"><span class="label">Composite</span><span class="value score ' + scoreClass(s) + '">' + s.toFixed(1) + ' / 10</span></div>' +
          '<div class="bar-container"><div class="bar ' + barClass(s) + '" style="width:' + (s * 10) + '%"></div></div>' +
        '</div>' +
        '<div class="detail-card judge-panel-card"><h4>Judge Panel</h4><div class="judge-grid">' + judgeHtml + '</div></div>' +
        '<div class="detail-card"><h4>Performance</h4>' +
          '<div class="detail-row-item"><span class="label">Total Time</span><span class="value">' + formatTime(entry.time_ms) + '</span></div>' +
          '<div class="detail-row-item"><span class="label">Tokens Used</span><span class="value">' + formatTokens(entry.tokens) + '</span></div>' +
          '<div class="detail-row-item"><span class="label">Tokens/sec</span><span class="value">' + tokPerSec + '</span></div>' +
        '</div>' +
      '</div></div></td>';
    }

    tr.after(detailTr);
  }

  function renderAgentTable() {
    var filtered = agentData.filter(function(e) {
      return frameworkMatch(e.framework, agentFrameworkFilter);
    });

    var tbody = document.getElementById('agent-table-body');
    tbody.innerHTML = '';

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="state-msg"><div class="icon">\\u{1F916}</div><div class="title">No agent setups yet</div><p>Be the first to benchmark an agent setup!</p></div></td></tr>';
      return;
    }

    filtered.forEach(function(entry, idx) {
      var s = entry.avg_score != null ? entry.avg_score : 0;
      var desc = entry.description || entry.config_hash.substring(0, 12) + '...';
      var fw = entry.framework || '\\u2014';
      var model = entry.model_name || '\\u2014';

      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td style="color:var(--text-muted)">' + (idx + 1) + '</td>' +
        '<td class="model-cell">' + desc + '</td>' +
        '<td><span class="framework-badge ' + frameworkClass(fw) + '">' + fw + '</span></td>' +
        '<td style="color:var(--text-secondary)">' + model + '</td>' +
        '<td class="score ' + scoreClass(s) + '">' + s.toFixed(1) + '</td>' +
        '<td style="color:var(--text-secondary)">' + entry.run_count + '</td>';
      tbody.appendChild(tr);
    });
  }

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeTab = btn.dataset.tab;

      var modelTableWrapper = document.getElementById('model-table-wrapper');
      var agentTableWrapper = document.getElementById('agent-table-wrapper');
      var modelFilters = document.getElementById('model-filters');
      var agentFiltersEl = document.getElementById('agent-filters');

      if (activeTab === 'model') {
        modelTableWrapper.classList.remove('hidden');
        agentTableWrapper.classList.add('hidden');
        modelFilters.classList.remove('hidden');
        agentFiltersEl.classList.add('hidden');
        renderModelTable();
      } else {
        modelTableWrapper.classList.add('hidden');
        agentTableWrapper.classList.remove('hidden');
        modelFilters.classList.add('hidden');
        agentFiltersEl.classList.remove('hidden');
        loadAgentData();
      }
    });
  });

  // Model sort
  document.querySelectorAll('#model-leaderboard thead th[data-sort]').forEach(function(th) {
    th.addEventListener('click', function() {
      var key = th.dataset.sort;
      if (modelSortKey === key) { modelSortAsc = !modelSortAsc; }
      else { modelSortKey = key; modelSortAsc = false; }
      document.querySelectorAll('#model-leaderboard thead th').forEach(function(h) { h.classList.remove('sorted'); });
      th.classList.add('sorted');
      expandedModelRow = null;
      renderModelTable();
    });
  });

  // Model framework filters
  document.getElementById('framework-filters').addEventListener('click', function(e) {
    if (!e.target.classList.contains('filter-btn')) return;
    document.querySelectorAll('#framework-filters .filter-btn').forEach(function(b) { b.classList.remove('active'); });
    e.target.classList.add('active');
    frameworkFilter = e.target.dataset.filter;
    expandedModelRow = null;
    renderModelTable();
  });

  // Agent framework filters
  document.getElementById('agent-framework-filters').addEventListener('click', function(e) {
    if (!e.target.classList.contains('filter-btn')) return;
    document.querySelectorAll('#agent-framework-filters .filter-btn').forEach(function(b) { b.classList.remove('active'); });
    e.target.classList.add('active');
    agentFrameworkFilter = e.target.dataset.filter;
    renderAgentTable();
  });

  // Load model data
  fetch('/api/bench/leaderboard?bench_type=model&limit=50')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      var entries = (d.data && d.data.entries) || [];
      modelData = entries.map(function(e, i) {
        e._rank = e.rank || (i + 1);
        return e;
      });
      renderModelTable();
    })
    .catch(function() {
      document.getElementById('model-table-body').innerHTML =
        '<tr><td colspan="7"><div class="state-msg"><div class="icon">\\u26A0\\uFE0F</div><div class="title">Failed to load</div><p>Could not reach the leaderboard API.</p></div></td></tr>';
    });

  var agentLoaded = false;

  function loadAgentData() {
    if (agentLoaded) {
      renderAgentTable();
      return;
    }
    fetch('/api/bench/setups?limit=50')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        agentData = (d.data && d.data.entries) || [];
        agentLoaded = true;
        renderAgentTable();
      })
      .catch(function() {
        document.getElementById('agent-table-body').innerHTML =
          '<tr><td colspan="6"><div class="state-msg"><div class="icon">\\u26A0\\uFE0F</div><div class="title">Failed to load</div><p>Could not reach the setups API.</p></div></td></tr>';
      });
  }
})();
</script>

</body>
</html>`;