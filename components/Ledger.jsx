
// ── helpers shared by both Live and Import views ─────────────────────────────

function buildRows(trades, startBalance) {
  let bal = startBalance;
  // Accumulate forward (oldest → newest), then display newest first
  const rows = trades.map(t => {
    bal += (t.pnl_net_usd || 0);
    return { ...t, balance_after: +bal.toFixed(2) };
  });
  return [...rows].reverse();
}

function calcStats(trades) {
  const closed = trades.filter(t => !t.open && t.pnl_net_usd != null);
  return {
    closed,
    totalGross: closed.reduce((s,t) => s + (t.pnl_usd   || 0), 0),
    totalFees:  closed.reduce((s,t) => s + (t.fees_usd   || 0), 0),
    totalNet:   closed.reduce((s,t) => s + (t.pnl_net_usd|| 0), 0),
    totalR:     closed.reduce((s,t) => s + (t.r_multiple || 0), 0),
    wins:       closed.filter(t => (t.r_multiple||0) > 0).length,
    losses:     closed.filter(t => (t.r_multiple||0) < 0).length,
  };
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const numFields = ['entry_price','sl_price','tp_price','position_size_btc','position_size_usd',
    'nano_qty','max_risk_usd','exit_price','bars_held','pnl_usd','pnl_pct','r_multiple',
    'fees_usd','pnl_net_usd','tier','sl_distance_pct','rr_target'];
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = line.split(',');
    const row = {};
    headers.forEach((h, i) => { row[h] = (vals[i] || '').trim(); });
    numFields.forEach(k => {
      if (row[k] && row[k] !== 'None' && row[k] !== '') row[k] = parseFloat(row[k]);
    });
    row.tier = parseInt(row.tier) || 1;
    row.open = !row.exit_price || row.exit_price === '';
    return row;
  });
}

// ── sub-components ────────────────────────────────────────────────────────────

function LedgerKPIs({ stats, startBalance, hasTrades }) {
  const { totalGross, totalFees, totalNet, totalR, closed } = stats;
  const returnPct = startBalance > 0 ? (totalNet / startBalance * 100) : 0;
  const winRate   = closed.length ? Math.round(stats.wins / closed.length * 100) : null;

  const kpis = [
    { label:'Gross PnL',   val: hasTrades ? `$${totalGross.toFixed(2)}`                       : '—', col: hasTrades ? (totalGross>=0?'#00d084':'#ff4d6d') : '#3e3e52' },
    { label:'Total Fees',  val: hasTrades ? `-$${totalFees.toFixed(2)}`                        : '—', col: hasTrades && totalFees>0 ? '#5a5a6e' : '#3e3e52' },
    { label:'Net PnL',     val: hasTrades ? `${totalNet>=0?'+':''}$${totalNet.toFixed(2)}`     : '—', col: hasTrades ? (totalNet>=0?'#00d084':'#ff4d6d') : '#3e3e52' },
    { label:'Total R',     val: hasTrades ? `${totalR>=0?'+':''}${totalR.toFixed(2)}R`         : '—', col: hasTrades ? (totalR>=0?'#00d084':'#ff4d6d') : '#3e3e52' },
    { label:'Win Rate',    val: hasTrades ? `${winRate}%`                                      : '—', col: hasTrades ? (winRate>=50?'#00d084':'#ff4d6d') : '#3e3e52',
      sub: hasTrades ? `${stats.wins}W · ${stats.losses}L` : null },
    { label:'Return',      val: hasTrades ? `${returnPct>=0?'+':''}${returnPct.toFixed(1)}%`   : '—', col: hasTrades ? (returnPct>=0?'#00d084':'#ff4d6d') : '#3e3e52' },
  ];

  return (
    <div style={lStyles.summRow}>
      {kpis.map(k => (
        <div key={k.label} style={lStyles.summCard}>
          <div style={lStyles.summLabel}>{k.label}</div>
          <div style={{...lStyles.summVal, color: k.col}}>{k.val}</div>
          {k.sub && <div style={{fontSize:10, color:'#3e3e52', marginTop:4, fontFamily:"'JetBrains Mono',monospace"}}>{k.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function LedgerChart({ trades, startBalance }) {
  const W = 600, H = 80;
  // Build equity points: start + each closed trade balance
  const closed = trades.filter(t => !t.open);
  const points = [startBalance];
  let bal = startBalance;
  closed.forEach(t => { bal += (t.pnl_net_usd||0); points.push(+bal.toFixed(2)); });

  const minV = Math.min(...points), maxV = Math.max(...points), range = maxV - minV || 1;
  const pts = points.map((v,i) =>
    `${(i/(points.length-1||1))*W},${H-((v-minV)/range)*(H-4)-2}`
  ).join(' ');

  return (
    <div style={lStyles.chartCard}>
      <div style={lStyles.chartHead}>
        <span style={lStyles.cardTitle}>Equity Curve</span>
        <span style={{fontSize:13, color:'#F7931A', fontFamily:"'JetBrains Mono',monospace", fontWeight:700}}>
          ${startBalance.toLocaleString('en-US')} → ${bal.toLocaleString('en-US')}
        </span>
      </div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{display:'block'}}>
        <defs>
          <linearGradient id="ledGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F7931A" stopOpacity="0.22"/>
            <stop offset="100%" stopColor="#F7931A" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <polygon points={`0,${H} ${pts} ${W},${H}`} fill="url(#ledGrad)" />
        <polyline points={pts} fill="none" stroke="#F7931A" strokeWidth="2" strokeLinejoin="round"/>
        {points.slice(1).map((v, i) => {
          const x = ((i+1)/(points.length-1))*W;
          const y = H-((v-minV)/range)*(H-4)-2;
          const isWin = closed[i] && (closed[i].r_multiple||0) > 0;
          return <circle key={i} cx={x} cy={y} r={3} fill={isWin?'#00d084':'#ff4d6d'} opacity={0.8}/>;
        })}
      </svg>
      <div style={lStyles.chartFooter}>
        <span style={lStyles.footLbl}>Start: ${startBalance.toLocaleString('en-US')}</span>
        <span style={lStyles.footLbl}>{closed.length} closed trade{closed.length!==1?'s':''}</span>
        <span style={lStyles.footLbl}>Current: ${bal.toLocaleString('en-US')}</span>
      </div>
    </div>
  );
}

function LedgerTable({ rows }) {
  const exitColor = r => ({ tp_hit:'#00d084', sl_hit:'#ff4d6d', trail_stop:'#F7931A', time_exit:'#a78bfa' }[r] || '#5a5a6e');
  const exitLabel = r => ({ tp_hit:'TP Hit', sl_hit:'SL Hit', trail_stop:'Trail', time_exit:'Time Exit', manual_close:'Manual', liquidation:'Liq' }[r] || (r||'—'));
  const fmt = n => typeof n === 'number' ? n.toLocaleString('en-US', {maximumFractionDigits:2}) : '—';

  return (
    <div style={lStyles.tableWrap}>
      <table style={lStyles.table}>
        <thead>
          <tr>
            {['#','Direction','Setup','Tier','Quality','Entry','Exit','How it closed','Bars held','Gross PnL','Fees','Net PnL','R Multiple','Balance after'].map(h => (
              <th key={h} style={lStyles.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={14} style={{...lStyles.td, textAlign:'center', padding:'40px', color:'#2a2a38'}}>
                <div style={{fontSize:22, opacity:0.15, marginBottom:8}}>◫</div>
                <div style={{fontSize:13, color:'#3e3e52'}}>No closed trades yet</div>
                <div style={{fontSize:11, color:'#2a2a38', marginTop:4}}>The table fills automatically as your bot completes trades</div>
              </td>
            </tr>
          ) : rows.map((t, idx) => (
            <tr key={t.trade_id || idx} style={{...lStyles.tr, background: idx%2===0?'transparent':'rgba(255,255,255,0.01)'}}>
              <td style={{...lStyles.monoTd, fontSize:10, color:'#3e3e52'}}>{t.trade_id || idx+1}</td>
              <td style={lStyles.td}>
                <span style={{fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4,
                  ...(t.direction==='long'
                    ? {background:'rgba(0,208,132,0.12)',color:'#00d084'}
                    : {background:'rgba(255,77,109,0.12)',color:'#ff4d6d'})}}>
                  {(t.direction||'').toUpperCase()}
                </span>
              </td>
              <td style={{...lStyles.td, color:'#F7931A', fontSize:11, maxWidth:140}}>{t.setup_type||'—'}</td>
              <td style={lStyles.td}><TierBadge tier={t.tier} /></td>
              <td style={lStyles.td}><GradeBadge grade={t.grade} /></td>
              <td style={lStyles.monoTd}>${fmt(t.entry_price)}</td>
              <td style={lStyles.monoTd}>{t.exit_price ? `$${fmt(t.exit_price)}` : '—'}</td>
              <td style={lStyles.td}>
                <span style={{fontSize:11, color:exitColor(t.exit_reason), fontFamily:"'JetBrains Mono',monospace"}}>
                  {exitLabel(t.exit_reason)}
                </span>
              </td>
              <td style={{...lStyles.monoTd, color:'#5a5a6e'}}>{t.bars_held ?? '—'}</td>
              <td style={{...lStyles.monoTd, color:(t.pnl_usd||0)>=0?'#00d084':'#ff4d6d'}}>
                {typeof t.pnl_usd==='number' ? `${t.pnl_usd>=0?'+':''}$${fmt(t.pnl_usd)}` : '—'}
              </td>
              <td style={{...lStyles.monoTd, color:'#5a5a6e'}}>
                {typeof t.fees_usd==='number' ? `-$${fmt(t.fees_usd)}` : '—'}
              </td>
              <td style={{...lStyles.monoTd, fontWeight:700, color:(t.pnl_net_usd||0)>=0?'#00d084':'#ff4d6d'}}>
                {typeof t.pnl_net_usd==='number' ? `${t.pnl_net_usd>=0?'+':''}$${fmt(t.pnl_net_usd)}` : '—'}
              </td>
              <td style={{...lStyles.monoTd, fontWeight:700, color:(t.r_multiple||0)>=0?'#00d084':'#ff4d6d'}}>
                {typeof t.r_multiple==='number' ? `${t.r_multiple>=0?'+':''}${t.r_multiple.toFixed(2)}R` : '—'}
              </td>
              <td style={{...lStyles.monoTd, color:'#F7931A'}}>${fmt(t.balance_after)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

function Ledger({ data }) {
  const [tab, setTab]               = React.useState('live');        // 'live' | 'import'
  const [csvText, setCsvText]       = React.useState('');
  const [importedTrades, setImported] = React.useState(null);        // null = not parsed yet
  const [parseError, setParseError] = React.useState('');
  const fileRef = React.useRef();

  // ── LIVE data ──
  const liveTrades    = data.trades.filter(t => !t.open && t.pnl_net_usd != null);
  const liveStats     = calcStats(liveTrades);
  const liveStartBal  = data.account.account_size;
  const liveRows      = buildRows(liveTrades, liveStartBal);

  // ── IMPORT data ──
  const handleParse = () => {
    setParseError('');
    try {
      const trades = parseCSV(csvText);
      if (!trades.length) { setParseError('No trades found. Make sure you paste the full CSV including the header row.'); return; }
      setImported(trades);
    } catch(e) {
      setParseError('Could not parse CSV. Check the format matches trades_ledger_v2.csv — ' + e.message);
    }
  };

  const handleFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => setCsvText(ev.target.result);
    reader.readAsText(f);
  };

  const importClosed  = importedTrades ? importedTrades.filter(t => !t.open && t.pnl_net_usd != null) : [];
  const importStats   = importedTrades ? calcStats(importedTrades) : null;
  const importStartBal = importedTrades ? (importClosed[0]?.balance_after - (importClosed[0]?.pnl_net_usd||0)) || 1000 : 1000;
  const importRows    = importedTrades ? buildRows(importClosed, data.account.account_size) : [];

  return (
    <div style={lStyles.wrap}>

      {/* Header + tab switcher */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:20}}>
        <div style={lStyles.pageTitle}>Ledger &amp; P&amp;L</div>
        <div style={lStyles.tabBar}>
          <button onClick={() => setTab('live')} style={{...lStyles.tab, ...(tab==='live' ? lStyles.tabActive : {})}}>
            <span style={{width:7, height:7, borderRadius:'50%', background:'#00d084', display:'inline-block', marginRight:6, boxShadow:'0 0 6px #00d084'}}></span>
            Live Bot
          </button>
          <button onClick={() => setTab('import')} style={{...lStyles.tab, ...(tab==='import' ? lStyles.tabImportActive : {})}}>
            ↑ Review CSV
          </button>
        </div>
      </div>

      {/* ── LIVE TAB ── */}
      {tab === 'live' && (
        <>
          <LedgerKPIs stats={liveStats} startBalance={liveStartBal} hasTrades={liveTrades.length > 0} />
          <LedgerChart trades={liveTrades} startBalance={liveStartBal} />
          <LedgerTable rows={liveRows} />
        </>
      )}

      {/* ── IMPORT TAB ── */}
      {tab === 'import' && (
        <>
          {/* Banner — always visible on import tab */}
          <div style={lStyles.importBanner}>
            <div style={{display:'flex', gap:10, alignItems:'center'}}>
              <span style={{fontSize:16}}>📂</span>
              <div>
                <div style={{fontSize:13, fontWeight:700, color:'#F7931A'}}>CSV Review Mode — Not Live Data</div>
                <div style={{fontSize:11, color:'#5a5a6e', marginTop:2}}>
                  Paste or upload any <code style={{color:'#F7931A'}}>trades_ledger_v2.csv</code> file to review it here.
                  Nothing you do in this tab affects your live bot or Oracle data.
                </div>
              </div>
            </div>
          </div>

          {/* Input area — shown until parsed */}
          {!importedTrades && (
            <div style={lStyles.importCard}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
                <div>
                  <div style={{fontSize:14, fontWeight:600, color:'#ece9e2', marginBottom:4}}>Load your CSV file</div>
                  <div style={{fontSize:12, color:'#3e3e52'}}>
                    Use this to review a backtest, a paper trading run, or a previous period's ledger.
                  </div>
                </div>
                <div style={{display:'flex', gap:8}}>
                  <button onClick={() => fileRef.current?.click()} style={lStyles.uploadBtn}>
                    ↑ Upload file
                  </button>
                  <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{display:'none'}} />
                </div>
              </div>

              <textarea
                value={csvText}
                onChange={e => { setCsvText(e.target.value); setParseError(''); }}
                placeholder={`Or paste your CSV content here...\n\nExpected first line:\ntrade_id,direction,setup_type,tier,grade,entry_price,sl_price,tp_price,...,pnl_net_usd,exit_reason,...`}
                style={lStyles.csvTextarea}
              />

              {parseError && (
                <div style={{marginTop:10, padding:'10px 14px', background:'rgba(255,77,109,0.08)', border:'1px solid rgba(255,77,109,0.2)', borderRadius:7, fontSize:12, color:'#ff4d6d'}}>
                  {parseError}
                </div>
              )}

              <div style={{display:'flex', justifyContent:'flex-end', marginTop:12}}>
                <button
                  onClick={handleParse}
                  disabled={!csvText.trim()}
                  style={{...lStyles.parseBtn, opacity: csvText.trim() ? 1 : 0.4, cursor: csvText.trim() ? 'pointer' : 'default'}}>
                  Parse &amp; Review →
                </button>
              </div>
            </div>
          )}

          {/* Results — shown once parsed */}
          {importedTrades && (
            <>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
                <div style={{fontSize:12, color:'#5a5a6e'}}>
                  Showing <strong style={{color:'#F7931A'}}>{importClosed.length}</strong> closed trades from imported file
                </div>
                <button
                  onClick={() => { setImported(null); setCsvText(''); setParseError(''); }}
                  style={{fontSize:11, color:'#5a5a6e', background:'transparent', border:'1px solid #2a2a38', borderRadius:5, padding:'5px 12px', cursor:'pointer', fontFamily:"'Space Grotesk',sans-serif"}}>
                  ✕ Clear &amp; load another
                </button>
              </div>
              <LedgerKPIs stats={importStats} startBalance={data.account.account_size} hasTrades={importClosed.length > 0} />
              <LedgerChart trades={importClosed} startBalance={data.account.account_size} />
              <LedgerTable rows={importRows} />
            </>
          )}
        </>
      )}
    </div>
  );
}

const lStyles = {
  wrap:        { padding:'28px 32px', height:'100%', overflowY:'auto', boxSizing:'border-box', fontFamily:"'Space Grotesk',sans-serif" },
  pageTitle:   { fontSize:22, fontWeight:700, color:'#ece9e2', letterSpacing:'-0.5px' },

  // Tabs
  tabBar:      { display:'flex', gap:4, background:'#0d0d11', borderRadius:8, padding:4, border:'1px solid #1f1f28' },
  tab:         { padding:'7px 16px', borderRadius:6, border:'none', background:'transparent', color:'#3e3e52', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'Space Grotesk',sans-serif", display:'flex', alignItems:'center', transition:'all 0.15s' },
  tabActive:   { background:'#111116', color:'#00d084', border:'1px solid #1f1f28' },
  tabImportActive: { background:'#111116', color:'#F7931A', border:'1px solid rgba(247,147,26,0.25)' },

  // KPIs
  summRow:     { display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10, marginBottom:14 },
  summCard:    { background:'#111116', border:'1px solid #1f1f28', borderRadius:10, padding:'14px 16px' },
  summLabel:   { fontSize:10, color:'#3e3e52', letterSpacing:'0.5px', marginBottom:6, textTransform:'uppercase' },
  summVal:     { fontSize:20, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:'#ece9e2' },

  // Chart
  chartCard:   { background:'#111116', border:'1px solid #1f1f28', borderRadius:10, padding:'18px 20px', marginBottom:14 },
  chartHead:   { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 },
  cardTitle:   { fontSize:13, fontWeight:600, color:'#ece9e2' },
  chartFooter: { display:'flex', justifyContent:'space-between', marginTop:8 },
  footLbl:     { fontSize:11, color:'#3e3e52', fontFamily:"'JetBrains Mono',monospace" },

  // Table
  tableWrap:   { background:'#111116', border:'1px solid #1f1f28', borderRadius:10, overflow:'hidden' },
  table:       { width:'100%', borderCollapse:'collapse' },
  th:          { textAlign:'left', fontSize:10, color:'#3e3e52', fontWeight:600, padding:'11px 10px', letterSpacing:'0.4px', background:'#0d0d11', borderBottom:'1px solid #1a1a22', whiteSpace:'nowrap' },
  tr:          { borderBottom:'1px solid #15151d' },
  td:          { padding:'10px 10px', fontSize:12, color:'#ece9e2', verticalAlign:'middle' },
  monoTd:      { padding:'10px 10px', fontSize:11, color:'#ece9e2', verticalAlign:'middle', fontFamily:"'JetBrains Mono',monospace", whiteSpace:'nowrap' },

  // Import
  importBanner: { background:'rgba(247,147,26,0.06)', border:'1px solid rgba(247,147,26,0.18)', borderRadius:10, padding:'14px 18px', marginBottom:14 },
  importCard:   { background:'#111116', border:'1px solid #1f1f28', borderRadius:10, padding:'20px 22px', marginBottom:14 },
  csvTextarea:  { width:'100%', height:160, background:'#0d0d11', border:'1px solid #1f1f28', borderRadius:7, padding:'12px 14px', color:'#5a5a6e', fontSize:11, fontFamily:"'JetBrains Mono',monospace", outline:'none', resize:'vertical', boxSizing:'border-box', lineHeight:1.6 },
  uploadBtn:    { padding:'8px 16px', borderRadius:6, border:'1px solid #2a2a38', background:'#0d0d11', color:'#5a5a6e', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'Space Grotesk',sans-serif" },
  parseBtn:     { padding:'10px 22px', borderRadius:7, border:'none', background:'rgba(247,147,26,0.15)', color:'#F7931A', fontSize:13, fontWeight:700, fontFamily:"'Space Grotesk',sans-serif", border:'1px solid rgba(247,147,26,0.3)' },
};

Object.assign(window, { Ledger });
