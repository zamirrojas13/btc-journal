
function GaugeArc({ pct, color, label, sub }) {
  const R = 60, cx = 75, cy = 75;
  const startAngle = -210, endAngle = 30;
  const totalArc = endAngle - startAngle;
  const filled = startAngle + totalArc * Math.min(pct, 1);
  const toRad = d => (d * Math.PI) / 180;
  const arcPath = (a1, a2, r) => {
    const x1 = cx + r * Math.cos(toRad(a1));
    const y1 = cy + r * Math.sin(toRad(a1));
    const x2 = cx + r * Math.cos(toRad(a2));
    const y2 = cy + r * Math.sin(toRad(a2));
    const large = (a2 - a1) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };
  return (
    <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
      <svg width={150} height={100} viewBox="0 0 150 100">
        <path d={arcPath(startAngle, endAngle, R)} fill="none" stroke="#1f1f28" strokeWidth={10} strokeLinecap="round" />
        <path d={arcPath(startAngle, filled, R)} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
          style={{filter:`drop-shadow(0 0 4px ${color}88)`}} />
        <text x={cx} y={cy+8} textAnchor="middle" fontSize={16} fontWeight={700} fill={color} fontFamily="'JetBrains Mono',monospace">{label}</text>
        <text x={cx} y={cy+22} textAnchor="middle" fontSize={9} fill="#3e3e52" fontFamily="'Space Grotesk',sans-serif">{sub}</text>
      </svg>
    </div>
  );
}

function RiskMonitor({ data }) {
  const { account, position, bot_state, trades, stats, session_dd, ev_by_setup, config } = data;
  const closed = trades.filter(t => !t.open && t.r_multiple !== null);

  // Drawdown calc — walk trades chronologically (oldest first) from starting balance
  const startBal = account.account_size;
  let peak = startBal, bal = startBal, maxDD = 0;
  [...closed].reverse().forEach(t => {   // closed is newest-first; reverse = oldest-first
    bal += (t.pnl_net_usd || 0);
    if (bal > peak) peak = bal;
    const dd = peak > 0 ? (bal - peak) / peak * 100 : 0;
    if (dd < maxDD) maxDD = dd;
  });
  // If no trades, peak = current equity
  if (closed.length === 0) peak = account.equity;
  const currentDD = peak > 0 ? ((account.equity - peak) / peak * 100) : 0;
  const ddPct = Math.min(Math.abs(currentDD) / 20, 1); // 20% = max gauge

  // Open risk %
  const openRiskUsd  = bot_state.active_trade?.max_risk_usd || 0;
  const openRiskPct  = account.equity > 0 ? (openRiskUsd / account.equity * 100) : 0;
  const tierRiskPct  = config.TIER_RISK_PCT?.[bot_state.active_trade?.tier || 3] ?? 0;

  // Session stats (today)
  const today = new Date().toISOString().slice(0,10);
  const todayTrades = closed.filter(t => t.timestamp_exit?.startsWith(today));

  // Consecutive stats
  let streak = 0, streakType = null;
  for (const t of [...closed].reverse()) {
    const isWin = t.r_multiple > 0;
    if (streakType === null) { streakType = isWin; streak = 1; }
    else if (isWin === streakType) { streak++; }
    else break;
  }

  const ddColor = Math.abs(currentDD) > 10 ? '#ff4d6d' : Math.abs(currentDD) > 5 ? '#F7931A' : '#00d084';
  const riskColor = openRiskPct > 8 ? '#ff4d6d' : openRiskPct > 5 ? '#F7931A' : '#00d084';

  return (
    <div style={rmStyles.wrap}>
      <div style={rmStyles.pageTitle}>Risk Monitor</div>

      {/* Gauges */}
      <div style={rmStyles.gaugeRow}>
        <div style={rmStyles.gaugeCard}>
          <div style={rmStyles.cardTitle}>Drawdown from Peak</div>
          <GaugeArc pct={ddPct} color={ddColor} label={`${Math.abs(currentDD).toFixed(1)}%`} sub="current DD" />
          <div style={rmStyles.gaugeInfo}>
            <div style={rmStyles.gRow}><span style={rmStyles.gLbl}>Peak equity</span><span style={rmStyles.gVal}>${peak.toFixed(2)}</span></div>
            <div style={rmStyles.gRow}><span style={rmStyles.gLbl}>Current equity</span><span style={rmStyles.gVal}>${account.equity.toFixed(2)}</span></div>
            <div style={rmStyles.gRow}><span style={rmStyles.gLbl}>Max DD (all time)</span><span style={{...rmStyles.gVal, color:'#ff4d6d'}}>{maxDD.toFixed(2)}%</span></div>
            <div style={rmStyles.gRow}><span style={rmStyles.gLbl}>Loss streak</span><span style={{...rmStyles.gVal, color: bot_state.loss_streak>=2?'#ff4d6d':'#5a5a6e'}}>{bot_state.loss_streak}/3</span></div>
          </div>
        </div>

        <div style={rmStyles.gaugeCard}>
          <div style={rmStyles.cardTitle}>Open Risk</div>
          <GaugeArc pct={openRiskPct/10} color={riskColor} label={`${openRiskPct.toFixed(1)}%`} sub="of equity" />
          <div style={rmStyles.gaugeInfo}>
            <div style={rmStyles.gRow}><span style={rmStyles.gLbl}>Risk $</span><span style={rmStyles.gVal}>${openRiskUsd}</span></div>
            <div style={rmStyles.gRow}><span style={rmStyles.gLbl}>Equity</span><span style={rmStyles.gVal}>${account.equity.toFixed(2)}</span></div>
            <div style={rmStyles.gRow}><span style={rmStyles.gLbl}>Tier</span><span style={rmStyles.gVal}>{bot_state.active_trade ? `T${bot_state.active_trade.tier}` : 'No trade'}</span></div>
            <div style={rmStyles.gRow}><span style={rmStyles.gLbl}>Tier risk %</span><span style={rmStyles.gVal}>{tierRiskPct.toFixed(1)}%</span></div>
          </div>
        </div>

        <div style={rmStyles.gaugeCard}>
          <div style={rmStyles.cardTitle}>Win Rate</div>
          {closed.length === 0 ? (
            <div style={{padding:'24px 0', textAlign:'center', color:'#2a2a38', fontSize:12}}>No closed trades yet</div>
          ) : (
            <GaugeArc pct={(stats.win_rate||0)/100} color={(stats.win_rate||0)>=60?'#00d084':(stats.win_rate||0)>=40?'#F7931A':'#ff4d6d'} label={`${stats.win_rate??0}%`} sub="all time" />
          )}
          <div style={rmStyles.gaugeInfo}>
            <div style={rmStyles.gRow}><span style={rmStyles.gLbl}>Wins</span><span style={{...rmStyles.gVal,color:'#00d084'}}>{stats.wins ?? 0}</span></div>
            <div style={rmStyles.gRow}><span style={rmStyles.gLbl}>Losses</span><span style={{...rmStyles.gVal,color:'#ff4d6d'}}>{stats.losses ?? 0}</span></div>
            <div style={rmStyles.gRow}><span style={rmStyles.gLbl}>Streak</span><span style={{...rmStyles.gVal, color: closed.length===0?'#3e3e52':streakType?'#00d084':'#ff4d6d'}}>{closed.length===0 ? '—' : `${streak} ${streakType?'wins':'losses'}`}</span></div>
            <div style={rmStyles.gRow}><span style={rmStyles.gLbl}>Avg R</span><span style={{...rmStyles.gVal,color:closed.length===0?'#3e3e52':(stats.avg_r||0)>0?'#00d084':'#ff4d6d'}}>{closed.length===0 ? '—' : `${(stats.avg_r||0)>0?'+':''}${parseFloat(stats.avg_r||0).toFixed(2)}R`}</span></div>
          </div>
        </div>

        <div style={rmStyles.gaugeCard}>
          <div style={rmStyles.cardTitle}>Tier Restriction</div>
          <div style={{padding:'12px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:10}}>
            <div style={{width:60, height:60, borderRadius:'50%', border:`3px solid ${bot_state.tier_restricted?'#ff4d6d':'#00d084'}`,
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700,
              color:bot_state.tier_restricted?'#ff4d6d':'#00d084', letterSpacing:'0.5px',
              boxShadow:`0 0 16px ${bot_state.tier_restricted?'#ff4d6d44':'#00d08444'}`}}>
              {bot_state.tier_restricted ? <><span>T1</span><span>ONLY</span></> : <><span>ALL</span><span>TIERS</span></>}
            </div>
          </div>
          <div style={rmStyles.gaugeInfo}>
            {[1,2,3].map(t => (
              <div key={t} style={rmStyles.gRow}>
                <span style={rmStyles.gLbl}>T{t} ({(config.TIER_RISK_PCT?.[t] ?? 0).toFixed(1)}%)</span>
                <span style={{...rmStyles.gVal, color: bot_state.tier_restricted && t>1 ? '#3e3e52' : t===3?'#F7931A':t===2?'#a78bfa':'#5a5a6e'}}>
                  {bot_state.tier_restricted && t>1 ? '⊘ Blocked' : '✓ Active'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* EV table */}
      <div style={rmStyles.card}>
        <div style={rmStyles.cardTitle}>Expected Value by Setup <span style={{fontSize:11, color:'#3e3e52', fontWeight:400, marginLeft:8}}>Based on {closed.length} closed trades</span></div>
        {closed.length === 0 ? (
          <div style={{padding:'32px 0', textAlign:'center', color:'#2a2a38', fontSize:12}}>
            Will populate after first closed trade
          </div>
        ) : (
        <table style={{width:'100%', borderCollapse:'collapse', marginTop:14}}>
          <thead>
            <tr>{['Setup','Trades','Win Rate','Avg Win R','Avg Loss R','EV per trade','Edge?'].map(h=>(
              <th key={h} style={{textAlign:'left',fontSize:10,color:'#3e3e52',fontWeight:600,padding:'8px 12px',letterSpacing:'0.5px',borderBottom:'1px solid #1a1a22'}}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {ev_by_setup.map(s => (
              <tr key={s.type} style={{borderBottom:'1px solid #16161e'}}>
                <td style={{padding:'11px 12px',fontSize:13,color:'#F7931A',fontWeight:600,textTransform:'uppercase'}}>{s.type}</td>
                <td style={{padding:'11px 12px',fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:'#5a5a6e'}}>{s.total}</td>
                <td style={{padding:'11px 12px',fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:s.wr>=0.6?'#00d084':s.wr>=0.4?'#F7931A':'#ff4d6d'}}>{(s.wr*100).toFixed(0)}%</td>
                <td style={{padding:'11px 12px',fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:'#00d084'}}>+{parseFloat(s.avgW).toFixed(2)}R</td>
                <td style={{padding:'11px 12px',fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:'#ff4d6d'}}>-{parseFloat(s.avgL).toFixed(2)}R</td>
                <td style={{padding:'11px 12px',fontSize:14,fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:s.ev>0?'#00d084':'#ff4d6d'}}>{s.ev>0?'+':''}{parseFloat(s.ev).toFixed(2)}R</td>
                <td style={{padding:'11px 12px'}}>
                  <span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:5,
                    background:s.ev>0.3?'rgba(0,208,132,0.12)':s.ev>0?'rgba(247,147,26,0.1)':'rgba(255,77,109,0.1)',
                    color:s.ev>0.3?'#00d084':s.ev>0?'#F7931A':'#ff4d6d'}}>
                    {s.ev>0.3?'Strong Edge':s.ev>0?'Marginal':'No Edge'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>

      {/* Session history */}
      <div style={rmStyles.card}>
        <div style={rmStyles.cardTitle}>Session Drawdown History</div>
        <div style={{display:'flex', flexDirection:'column', gap:8, marginTop:14}}>
          {data.session_dd.map(s => (
            <div key={s.date} style={{display:'flex', gap:12, alignItems:'center'}}>
              <span style={{fontSize:12, color:'#3e3e52', fontFamily:"'JetBrains Mono',monospace", width:96, flexShrink:0}}>{s.date}</span>
              <div style={{flex:1, height:5, background:'#1a1a22', borderRadius:3, overflow:'hidden'}}>
                {s.dd < 0 && <div style={{width:`${Math.min(Math.abs(s.dd)/10*100,100)}%`, height:'100%', background:'#ff4d6d', borderRadius:3}}></div>}
                {s.dd === 0 && s.end > s.start && <div style={{width:'100%', height:'100%', background:'rgba(0,208,132,0.3)', borderRadius:3}}></div>}
              </div>
              <span style={{fontSize:12, fontFamily:"'JetBrains Mono',monospace", width:56, textAlign:'right',
                color:s.dd<0?'#ff4d6d':s.end>s.start?'#00d084':'#3e3e52'}}>
                {s.dd !== 0 ? `${s.dd.toFixed(1)}%` : s.end>s.start ? `+$${(s.end-s.start).toFixed(0)}` : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const rmStyles = {
  wrap: { padding:'28px 32px', height:'100%', overflowY:'auto', boxSizing:'border-box', fontFamily:"'Space Grotesk',sans-serif" },
  pageTitle: { fontSize:22, fontWeight:700, color:'#ece9e2', letterSpacing:'-0.5px', marginBottom:22 },
  gaugeRow: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:14 },
  gaugeCard: { background:'#111116', border:'1px solid #1f1f28', borderRadius:10, padding:'18px 20px' },
  card: { background:'#111116', border:'1px solid #1f1f28', borderRadius:10, padding:'18px 22px', marginBottom:14 },
  cardTitle: { fontSize:13, fontWeight:600, color:'#ece9e2' },
  gaugeInfo: { display:'flex', flexDirection:'column', gap:7, marginTop:8 },
  gRow: { display:'flex', justifyContent:'space-between', alignItems:'center' },
  gLbl: { fontSize:11, color:'#3e3e52' },
  gVal: { fontSize:12, fontWeight:600, color:'#ece9e2', fontFamily:"'JetBrains Mono',monospace" },
};

Object.assign(window, { RiskMonitor });
