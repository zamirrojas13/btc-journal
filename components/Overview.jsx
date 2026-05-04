
function KpiCard({ label, value, sub, subColor, accent, mono }) {
  return (
    <div style={ovStyles.kpiCard}>
      <div style={ovStyles.kpiLabel}>{label}</div>
      <div style={{...ovStyles.kpiValue, color: accent || '#ece9e2', fontFamily: mono !== false ? "'JetBrains Mono',monospace" : "'Space Grotesk',sans-serif"}}>{value}</div>
      {sub && <div style={{...ovStyles.kpiSub, color: subColor || '#5a5a6e'}}>{sub}</div>}
    </div>
  );
}

function GradeBadge({ grade }) {
  const map = { 'A+': { bg:'rgba(247,147,26,0.15)', c:'#F7931A' }, 'Solid': { bg:'rgba(0,208,132,0.12)', c:'#00d084' }, 'B': { bg:'rgba(167,139,250,0.12)', c:'#a78bfa' }, 'C': { bg:'rgba(90,90,110,0.12)', c:'#5a5a6e' } };
  const s = map[grade] || map['C'];
  return <span style={{fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4, background:s.bg, color:s.c, letterSpacing:'0.5px'}}>{grade}</span>;
}

function TierBadge({ tier }) {
  const map = { 1:{bg:'rgba(90,90,110,0.12)',c:'#5a5a6e'}, 2:{bg:'rgba(167,139,250,0.12)',c:'#a78bfa'}, 3:{bg:'rgba(247,147,26,0.15)',c:'#F7931A'} };
  const s = map[tier] || map[1];
  return <span style={{fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4, background:s.bg, color:s.c, letterSpacing:'0.5px'}}>T{tier}</span>;
}

function SparkLine({ data, color, height = 56 }) {
  const w = 200, h = height;
  const vals = data.map(d => d.v);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} style={{ display:'block' }}>
      <defs>
        <linearGradient id="spkGrad2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#spkGrad2)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// ── market session helper ────────────────────────────────────────────────────
function getMarketSessions() {
  const now = new Date();
  const h = now.getUTCHours() + now.getUTCMinutes() / 60;
  const sessions = [];
  if (h >= 0  && h < 8)    sessions.push({ name:'Asia',     color:'#a78bfa' });
  if (h >= 8  && h < 16.5) sessions.push({ name:'London',   color:'#38bdf8' });
  if (h >= 13.5 && h < 21) sessions.push({ name:'New York', color:'#00d084' });
  return sessions.length ? sessions : [{ name:'Off-hours', color:'#3e3e52' }];
}

// ── simple log-prefix strip for TG preview ──────────────────────────────────
function stripTgPreview(raw) {
  return raw
    .replace(/^\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}(:\d{2})?(\s*UTC)?/,'')
    .replace(/^[\s\-|]*INFO[\s\-|]*/i,'')
    .replace(/^[\s\-|]*Telegram[\s\-:]+/i,'')
    .replace(/^[\s\-|]*Sent[\s\-:]+/i,'')
    .trim();
}

function Overview({ data }) {
  const { account, position, bot_state, stats, equity, trades, last_signal } = data;
  const closed = trades.filter(t => !t.open);
  const returnColor = stats.return_pct >= 0 ? '#00d084' : '#ff4d6d';

  // ── inject pulse keyframes once ────────────────────────────────────────────
  React.useEffect(() => {
    if (document.getElementById('ov-kf')) return;
    const s = document.createElement('style');
    s.id = 'ov-kf';
    s.textContent = '@keyframes ovPulse{0%,100%{opacity:.2;transform:scale(1)}50%{opacity:.9;transform:scale(1.6)}} @keyframes ovRing{0%,100%{opacity:.15;transform:scale(1)}50%{opacity:.4;transform:scale(2.2)}}';
    document.head.appendChild(s);
  }, []);

  // ── BTC live price + 24h change ───────────────────────────────────────────
  const [btcPrice, setBtcPrice] = React.useState(0);
  const [btc24h,   setBtc24h]   = React.useState(null);
  React.useEffect(() => {
    const load = () => fetch('/api/ticker').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.price) setBtcPrice(parseFloat(d.price));
      if (d?.open && d?.price) {
        const o = parseFloat(d.open), c = parseFloat(d.price);
        setBtc24h(o > 0 ? (c - o) / o * 100 : null);
      }
    }).catch(() => {});
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  // ── next scan countdown ────────────────────────────────────────────────────
  const [scanIn, setScanIn] = React.useState('—');
  React.useEffect(() => {
    const calc = () => {
      const intervalMs = (data.config.RUN_INTERVAL_MINUTES || 15) * 60000;
      const last = bot_state.last_daily_scan_day;
      if (!last) { setScanIn('—'); return; }
      try {
        const raw = last.includes('T') ? last : last.replace(' ', 'T') + ':00Z';
        const diff = new Date(raw).getTime() + intervalMs - Date.now();
        if (diff <= 0) { setScanIn('any moment'); return; }
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setScanIn(`${m}m ${s}s`);
      } catch { setScanIn('—'); }
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [bot_state.last_daily_scan_day, data.config.RUN_INTERVAL_MINUTES]);

  // ── last Telegram message ─────────────────────────────────────────────────
  const [lastTg, setLastTg] = React.useState(null);
  React.useEffect(() => {
    fetch('/api/telegram').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.messages?.length) {
        const raw = d.messages[d.messages.length - 1].raw;
        setLastTg(stripTgPreview(raw) || raw);
      }
    }).catch(() => {});
  }, []);

  // ── market session ─────────────────────────────────────────────────────────
  const [sessions, setSessions] = React.useState(getMarketSessions());
  React.useEffect(() => {
    const id = setInterval(() => setSessions(getMarketSessions()), 60000);
    return () => clearInterval(id);
  }, []);

  // ── daily P&L ─────────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const todayTrades = closed.filter(t => t.timestamp_exit?.startsWith(today));
  const dailyPnl    = todayTrades.reduce((s, t) => s + (parseFloat(t.pnl_net_usd) || 0), 0);

  const hasPosition = position.qty > 0;

  return (
    <div style={ovStyles.wrap}>

      {/* ── Header ── */}
      <div style={ovStyles.header}>
        <div>
          <div style={ovStyles.pageTitle}>Overview</div>
          <div style={ovStyles.pageSub}>BTC/USD · 11 patterns · Coinbase CFM · Run every {data.config.RUN_INTERVAL_MINUTES}min</div>
        </div>
        <div style={ovStyles.btcBlock}>
          {/* Market session pills */}
          <div style={{display:'flex', justifyContent:'flex-end', gap:6, marginBottom:6}}>
            {sessions.map(s => (
              <span key={s.name} style={{fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:20,
                background: `${s.color}18`, border:`1px solid ${s.color}40`, color:s.color, letterSpacing:'0.4px'}}>
                ● {s.name}
              </span>
            ))}
          </div>
          <span style={ovStyles.btcLabel}>BTC Market Price</span>
          <span style={ovStyles.btcVal}>${btcPrice.toLocaleString('en-US')}</span>
          <div style={{display:'flex', justifyContent:'flex-end', alignItems:'center', gap:8, marginTop:2}}>
            {btc24h !== null && (
              <span style={{fontSize:12, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color: btc24h >= 0 ? '#00d084':'#ff4d6d'}}>
                {btc24h >= 0 ? '+':''}{btc24h.toFixed(2)}% 24h
              </span>
            )}
            <span style={{fontSize:11, color:'#5a5a6e', fontFamily:"'JetBrains Mono',monospace"}}>Live · 30s</span>
          </div>
        </div>
      </div>

      {/* ── Tier restriction alert ── */}
      {bot_state.tier_restricted && (
        <div style={ovStyles.alert}>
          ⚠️ Tier Restriction Active — Loss streak {bot_state.loss_streak}/3 reached · T1 entries only
        </div>
      )}

      {/* ── Daily P&L strip ── */}
      <div style={ovStyles.dailyStrip}>
        <span style={{fontSize:11, color:'#3e3e52', letterSpacing:'0.3px'}}>Today</span>
        <span style={{fontSize:13, fontWeight:700, fontFamily:"'JetBrains Mono',monospace",
          color: todayTrades.length === 0 ? '#3e3e52' : dailyPnl >= 0 ? '#00d084' : '#ff4d6d'}}>
          {todayTrades.length === 0 ? 'No trades closed today' : `${dailyPnl >= 0 ? '+' : ''}$${Math.abs(dailyPnl).toFixed(2)}`}
        </span>
        {todayTrades.length > 0 && (
          <span style={{fontSize:11, color:'#3e3e52'}}>· {todayTrades.length} trade{todayTrades.length > 1 ? 's':''} · {todayTrades.filter(t => (t.pnl_net_usd||0)>=0).length}W {todayTrades.filter(t => (t.pnl_net_usd||0)<0).length}L</span>
        )}
        <div style={{flex:1}}/>
        <span style={{fontSize:11, color:'#3e3e52'}}>Next scan</span>
        <span style={{fontSize:13, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:'#F7931A'}}>{scanIn}</span>
      </div>

      {/* ── KPI row ── */}
      <div style={ovStyles.kpiGrid}>
        <KpiCard label="Account Equity"   value={`$${account.equity.toLocaleString('en-US')}`} sub={`+${stats.return_pct}% on $${account.account_size}`} subColor={returnColor} accent={returnColor} />
        <KpiCard label="Buying Power"     value={`$${account.buying_power.toFixed(2)}`} sub="Available cash" />
        <KpiCard label="Net PnL (closed)" value={`${stats.total_net_pnl >= 0 ? '+' : ''}$${stats.total_net_pnl}`} sub={`${stats.closed_trades} closed trades`} accent={stats.total_net_pnl >= 0 ? '#00d084':'#ff4d6d'} subColor="#5a5a6e" />
        <KpiCard label="Win Rate"         value={closed.length ? `${stats.win_rate}%` : '—'} sub={closed.length ? `${stats.wins}W · ${stats.losses}L` : 'No closed trades'} />
        <KpiCard label="Avg R Multiple"   value={closed.length ? `${stats.avg_r > 0 ? '+' : ''}${stats.avg_r.toFixed(2)}R` : '—'} sub={closed.length ? `Total: ${stats.total_r.toFixed(2)}R` : 'No closed trades'} accent={stats.avg_r >= 1 ? '#00d084' : closed.length ? '#ff4d6d' : '#3e3e52'} />
        <KpiCard label="Max Drawdown"     value={closed.length ? `${stats.max_drawdown.toFixed(1)}%` : '—'} sub="From equity peak" accent={closed.length ? '#ff4d6d' : '#3e3e52'} />
      </div>

      {/* ── Mid row ── */}
      <div style={ovStyles.midRow}>

        {/* Open position */}
        <div style={ovStyles.card}>
          <div style={ovStyles.cardHead}>
            <span style={ovStyles.cardTitle}>Open Position</span>
            {hasPosition && (
              <div style={{display:'flex', gap:6, alignItems:'center'}}>
                <span style={{fontSize:9, color:'#3e3e52', letterSpacing:'0.5px'}}>QUALITY</span>
                <GradeBadge grade={bot_state.active_trade?.grade} />
                <span style={{fontSize:9, color:'#3e3e52', letterSpacing:'0.5px'}}>RISK</span>
                <TierBadge  tier={bot_state.active_trade?.tier} />
                <span style={{...ovStyles.sideBadge, background:'rgba(0,208,132,0.12)', color:'#00d084'}}>LONG</span>
              </div>
            )}
          </div>
          {hasPosition ? (
            <div style={ovStyles.posGrid}>
              <div style={ovStyles.posRow}><span style={ovStyles.posLabel}>Setup</span><span style={{...ovStyles.posVal, color:'#F7931A'}}>{bot_state.active_trade?.setup_type}</span></div>
              <div style={ovStyles.posRow}><span style={ovStyles.posLabel}>Qty</span><span style={ovStyles.posVal}>{position.qty} BTC</span></div>
              <div style={ovStyles.posRow}><span style={ovStyles.posLabel}>Entry</span><span style={ovStyles.posVal}>${(+position.avg_entry_price).toLocaleString('en-US')}</span></div>
              <div style={ovStyles.posRow}><span style={ovStyles.posLabel}>SL / TP</span><span style={ovStyles.posVal}>${(+bot_state.active_trade?.sl_price).toLocaleString('en-US')} / ${(+bot_state.active_trade?.tp_price).toLocaleString('en-US')}</span></div>
              <div style={ovStyles.posRow}><span style={ovStyles.posLabel}>Max Risk</span><span style={ovStyles.posVal}>${bot_state.active_trade?.max_risk_usd} · R:R {bot_state.active_trade?.rr_target}×</span></div>
              <div style={ovStyles.posRow}><span style={ovStyles.posLabel}>Unrealised PnL</span><span style={{...ovStyles.posVal, color:'#00d084'}}>+${position.unrealized_pl.toFixed(2)}</span></div>
            </div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:110, gap:10}}>
              {/* Pulse animation */}
              <div style={{position:'relative', width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center'}}>
                <div style={{position:'absolute', width:36, height:36, borderRadius:'50%', border:'1.5px solid #F7931A', animation:'ovRing 2.5s ease-in-out infinite'}}/>
                <div style={{width:10, height:10, borderRadius:'50%', background:'#F7931A', animation:'ovPulse 2.5s ease-in-out infinite'}}/>
              </div>
              <span style={{fontSize:12, color:'#3e3e52'}}>No open position</span>
              <span style={{fontSize:11, color:'#2a2a38'}}>Bot is watching · next scan in <span style={{color:'#F7931A', fontFamily:"'JetBrains Mono',monospace"}}>{scanIn}</span></span>
            </div>
          )}
        </div>

        {/* Equity curve */}
        <div style={ovStyles.card}>
          <div style={ovStyles.cardHead}>
            <span style={ovStyles.cardTitle}>Equity Curve</span>
            <span style={{fontSize:11, color:'#3e3e52'}}>${account.account_size} → ${account.equity}</span>
          </div>
          <SparkLine data={equity} color="#F7931A" height={72} />
          <div style={{...ovStyles.posRow, marginTop:10}}>
            <span style={ovStyles.posLabel}>Start</span><span style={ovStyles.posVal}>${equity[0]?.v}</span>
            <span style={ovStyles.posLabel}>Now</span><span style={{...ovStyles.posVal, color:'#00d084'}}>${equity[equity.length-1]?.v}</span>
          </div>
        </div>

        {/* Bot state */}
        <div style={ovStyles.card}>
          <div style={ovStyles.cardHead}><span style={ovStyles.cardTitle}>Bot State</span></div>
          <div style={ovStyles.posGrid}>
            <div style={ovStyles.posRow}>
              <span style={ovStyles.posLabel}>Loss Streak</span>
              <div style={{display:'flex', gap:4}}>
                {[1,2,3].map(n => (
                  <div key={n} style={{width:20, height:20, borderRadius:4, background: n <= bot_state.loss_streak ? '#ff4d6d' : '#1f1f28', border:'1px solid #2a2a38', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#fff', fontWeight:700}}>{n <= bot_state.loss_streak ? n : ''}</div>
                ))}
              </div>
            </div>
            <div style={ovStyles.posRow}><span style={ovStyles.posLabel}>Tier Restricted</span><span style={{...ovStyles.posVal, color: bot_state.tier_restricted ? '#ff4d6d':'#00d084'}}>{bot_state.tier_restricted ? 'YES — T1 only':'No'}</span></div>
            <div style={ovStyles.posRow}><span style={ovStyles.posLabel}>Trade Pending</span><span style={{...ovStyles.posVal, color: bot_state.trade_pending ? '#F7931A':'#5a5a6e'}}>{bot_state.trade_pending ? 'Waiting entry':'None'}</span></div>
            <div style={ovStyles.posRow}><span style={ovStyles.posLabel}>Next Scan</span><span style={{...ovStyles.posVal, color:'#F7931A'}}>{scanIn}</span></div>
            <div style={ovStyles.posRow}><span style={ovStyles.posLabel}>Last Scan</span><span style={{...ovStyles.posVal, fontSize:11}}>{bot_state.last_daily_scan_day}</span></div>
            {/* Last Telegram message */}
            {lastTg && (
              <div style={{marginTop:6, paddingTop:8, borderTop:'1px solid #1a1a22'}}>
                <div style={{fontSize:10, color:'#3e3e52', letterSpacing:'0.5px', marginBottom:4}}>LAST TELEGRAM</div>
                <div style={{fontSize:11, color:'#5a5a6e', fontFamily:"'JetBrains Mono',monospace", lineHeight:1.5,
                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100%'}}
                  title={lastTg}>
                  {lastTg.length > 72 ? lastTg.slice(0, 72) + '…' : lastTg}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div style={ovStyles.bottomRow}>
        <div style={{...ovStyles.card, flex:1}}>
          <div style={ovStyles.cardHead}>
            <div>
              <span style={ovStyles.cardTitle}>Trade Quality</span>
              <div style={{fontSize:10, color:'#2a2a38', marginTop:3}}>A+ &gt;65% · Solid 55–65% · B 45–55% historical WR</div>
            </div>
          </div>
          {closed.length > 0 ? (
            <div style={{display:'flex', gap:12, marginTop:4}}>
              {Object.entries(stats.grades).map(([g, n]) => (
                <div key={g} style={{textAlign:'center'}}>
                  <GradeBadge grade={g} />
                  <div style={{fontSize:20, fontWeight:700, color:'#ece9e2', fontFamily:"'JetBrains Mono',monospace", marginTop:8}}>{n}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{fontSize:12, color:'#2a2a38', marginTop:16}}>No closed trades yet</div>
          )}
        </div>

        <div style={{...ovStyles.card, flex:2}}>
          <div style={ovStyles.cardHead}><span style={ovStyles.cardTitle}>Live Win Rates by Setup</span></div>
          {closed.length > 0 ? (
            <div style={{display:'flex', gap:20, marginTop:4}}>
              {Object.entries(stats.setupStats).map(([type, s]) => {
                const wr = Math.round(s.w / (s.w + s.l) * 100);
                return (
                  <div key={type} style={{flex:1}}>
                    <div style={{fontSize:12, color:'#F7931A', fontWeight:600, textTransform:'uppercase', marginBottom:6}}>{type}</div>
                    <div style={{fontSize:18, fontWeight:700, color: wr>=60?'#00d084':'#ece9e2', fontFamily:"'JetBrains Mono',monospace"}}>{wr}%</div>
                    <div style={{fontSize:11, color:'#3e3e52', marginTop:2}}>{s.w}W / {s.l}L</div>
                    <div style={{marginTop:6, height:3, background:'#1f1f28', borderRadius:2}}>
                      <div style={{width:`${wr}%`, height:'100%', background: wr>=60?'#00d084':'#F7931A', borderRadius:2}}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{display:'flex', alignItems:'center', gap:8, marginTop:12}}>
              <span style={{fontSize:12, color:'#2a2a38'}}>No closed trades yet — win rates will populate after first closed trade</span>
            </div>
          )}
        </div>

        <div style={{...ovStyles.card, flex:1}}>
          <div style={ovStyles.cardHead}><span style={ovStyles.cardTitle}>Last Signal</span></div>
          {last_signal && (
            <div style={ovStyles.posGrid}>
              <div style={ovStyles.posRow}><span style={ovStyles.posLabel}>Setup</span><span style={{...ovStyles.posVal, color:'#F7931A'}}>{last_signal.setup_type} · <GradeBadge grade={last_signal.grade} /></span></div>
              <div style={ovStyles.posRow}><span style={ovStyles.posLabel}>Alignment</span>
                <div style={{display:'flex', gap:4}}>
                  {['weekly_ok','daily_ok','h4_ok'].map(k => (
                    <span key={k} style={{fontSize:11, color: last_signal.alignment[k]?'#00d084':'#ff4d6d'}}>{last_signal.alignment[k]?'✓':'✗'}{k.split('_')[0]}</span>
                  ))}
                </div>
              </div>
              <div style={ovStyles.posRow}><span style={ovStyles.posLabel}>Conditions</span><span style={{...ovStyles.posVal, color:'#00d084'}}>{last_signal.conditions.cnt}/3</span></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ovStyles = {
  wrap:       { padding:'28px 32px', height:'100%', overflowY:'auto', boxSizing:'border-box', fontFamily:"'Space Grotesk',sans-serif" },
  header:     { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 },
  pageTitle:  { fontSize:22, fontWeight:700, color:'#ece9e2', letterSpacing:'-0.5px' },
  pageSub:    { fontSize:12, color:'#3e3e52', marginTop:4 },
  btcBlock:   { textAlign:'right', display:'flex', flexDirection:'column' },
  btcLabel:   { fontSize:11, color:'#5a5a6e', letterSpacing:'0.5px' },
  btcVal:     { fontSize:24, fontWeight:700, color:'#F7931A', fontFamily:"'JetBrains Mono',monospace" },
  alert:      { background:'rgba(255,77,109,0.08)', border:'1px solid rgba(255,77,109,0.25)', borderRadius:8, padding:'10px 16px', fontSize:13, color:'#ff4d6d', marginBottom:12 },
  dailyStrip: { display:'flex', alignItems:'center', gap:10, background:'#111116', border:'1px solid #1f1f28', borderRadius:8, padding:'9px 16px', marginBottom:14, fontSize:13 },
  kpiGrid:    { display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginBottom:16 },
  kpiCard:    { background:'#111116', border:'1px solid #1f1f28', borderRadius:10, padding:'16px 18px' },
  kpiLabel:   { fontSize:11, color:'#3e3e52', letterSpacing:'0.4px', marginBottom:8 },
  kpiValue:   { fontSize:19, fontWeight:700, color:'#ece9e2' },
  kpiSub:     { fontSize:11, color:'#5a5a6e', marginTop:4 },
  midRow:     { display:'grid', gridTemplateColumns:'1.1fr 1fr 1fr', gap:12, marginBottom:16 },
  bottomRow:  { display:'flex', gap:12 },
  card:       { background:'#111116', border:'1px solid #1f1f28', borderRadius:10, padding:'18px 20px' },
  cardHead:   { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 },
  cardTitle:  { fontSize:13, fontWeight:600, color:'#ece9e2' },
  sideBadge:  { fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:4, letterSpacing:'0.5px' },
  posGrid:    { display:'flex', flexDirection:'column', gap:9 },
  posRow:     { display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 },
  posLabel:   { fontSize:12, color:'#3e3e52', flexShrink:0 },
  posVal:     { fontSize:12, fontWeight:600, color:'#ece9e2', fontFamily:"'JetBrains Mono',monospace", textAlign:'right' },
};

Object.assign(window, { Overview, GradeBadge, TierBadge });
