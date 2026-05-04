
function Analytics({ data }) {
  const { daily_pnl, hourly_stats, dow_stats, ev_by_setup, trades, stats } = data;
  const closed = trades.filter(t => !t.open && t.r_multiple !== null);

  // Calendar heatmap
  const calDays = Object.entries(daily_pnl).sort(([a],[b]) => a.localeCompare(b));
  const maxAbs  = Math.max(...Object.values(daily_pnl).map(Math.abs));
  const heatColor = v => {
    if (v === 0) return '#1a1a22';
    const intensity = Math.min(Math.abs(v) / maxAbs, 1);
    return v > 0
      ? `rgba(0,208,132,${0.15 + intensity * 0.75})`
      : `rgba(255,77,109,${0.15 + intensity * 0.75})`;
  };

  // Grade performance
  const gradeR = {};
  closed.forEach(t => {
    if (!gradeR[t.grade]) gradeR[t.grade] = [];
    gradeR[t.grade].push(t.r_multiple);
  });
  const gradeStats = Object.entries(gradeR).map(([g, rs]) => ({
    grade: g,
    avg: +(rs.reduce((a,b)=>a+b,0)/rs.length).toFixed(2),
    count: rs.length,
    wins: rs.filter(r=>r>0).length,
  }));

  return (
    <div style={anStyles.wrap}>
      <div style={anStyles.pageTitle}>Analytics</div>

      {/* Top KPIs */}
      {(() => {
        const hasTrades = closed.length > 0;
        const pnlVals   = Object.values(daily_pnl);
        const bestDay   = hasTrades ? Math.max(...pnlVals) : null;
        const worstDay  = hasTrades ? Math.min(...pnlVals) : null;
        const profitD   = pnlVals.filter(v=>v>0).length;
        const tradeD    = pnlVals.filter(v=>v!==0).length;
        const kpis = [
          { label:'Total R',     val: hasTrades ? `${stats.total_r>0?'+':''}${stats.total_r.toFixed(2)}R` : '—', col: hasTrades?(stats.total_r>0?'#00d084':'#ff4d6d'):'#3e3e52' },
          { label:'Avg R/trade', val: hasTrades ? `${stats.avg_r>0?'+':''}${stats.avg_r.toFixed(2)}R` : '—',     col: hasTrades?(stats.avg_r>1?'#00d084':stats.avg_r>0?'#F7931A':'#ff4d6d'):'#3e3e52' },
          { label:'Win Rate',    val: hasTrades ? `${stats.win_rate}%` : '—',                                     col: hasTrades?'#ece9e2':'#3e3e52' },
          { label:'Best day',    val: hasTrades ? `+$${bestDay.toFixed(0)}` : '—',                                col: hasTrades?'#00d084':'#3e3e52' },
          { label:'Worst day',   val: hasTrades ? `$${worstDay.toFixed(0)}` : '—',                                col: hasTrades?'#ff4d6d':'#3e3e52' },
          { label:'Profit days', val: hasTrades ? `${profitD}/${tradeD}` : '—',                                   col: hasTrades?'#F7931A':'#3e3e52' },
        ];
        return (
          <div style={anStyles.kpiRow}>
            {kpis.map(k => (
              <div key={k.label} style={anStyles.kpiCard}>
                <div style={anStyles.kpiLabel}>{k.label}</div>
                <div style={{...anStyles.kpiVal, color:k.col}}>{k.val}</div>
              </div>
            ))}
          </div>
        );
      })()}

      <div style={anStyles.twoCol}>
        {/* P&L Calendar */}
        <div style={anStyles.card}>
          <div style={anStyles.cardTitle}>P&L Calendar <span style={anStyles.cardSub}>Last 30 days</span></div>
          <div style={{display:'flex', flexWrap:'wrap', gap:4, marginTop:12}}>
            {calDays.map(([date, val]) => (
              <div key={date} title={`${date}: ${val >= 0 ? '+':''}\$${val}`}
                style={{ width:32, height:32, borderRadius:5, background:heatColor(val),
                  border:'1px solid rgba(255,255,255,0.04)', cursor:'default',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{fontSize:9, color:'rgba(255,255,255,0.4)', fontFamily:"'JetBrains Mono',monospace"}}>
                  {new Date(date+'T12:00:00').getDate()}
                </span>
              </div>
            ))}
          </div>
          <div style={{display:'flex', gap:12, marginTop:12, alignItems:'center'}}>
            <div style={{display:'flex', gap:4, alignItems:'center'}}>
              <div style={{width:12,height:12,borderRadius:2,background:'rgba(0,208,132,0.8)'}}></div>
              <span style={{fontSize:11,color:'#3e3e52'}}>Profit</span>
            </div>
            <div style={{display:'flex', gap:4, alignItems:'center'}}>
              <div style={{width:12,height:12,borderRadius:2,background:'rgba(255,77,109,0.8)'}}></div>
              <span style={{fontSize:11,color:'#3e3e52'}}>Loss</span>
            </div>
            <div style={{display:'flex', gap:4, alignItems:'center'}}>
              <div style={{width:12,height:12,borderRadius:2,background:'#1a1a22'}}></div>
              <span style={{fontSize:11,color:'#3e3e52'}}>No trade</span>
            </div>
          </div>
          {closed.length === 0 && (
            <div style={{fontSize:11, color:'#2a2a38', marginTop:8}}>
              All days grey = bot is live but no trades have closed yet
            </div>
          )}
        </div>

        {/* Expected Value by setup */}
        <div style={anStyles.card}>
          <div style={anStyles.cardTitle}>Expected Value by Setup</div>
          {ev_by_setup.length > 0 ? (
            <div style={{marginTop:14, display:'flex', flexDirection:'column', gap:14}}>
              {ev_by_setup.map(s => (
                <div key={s.type}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:6}}>
                    <div style={{display:'flex', gap:8, alignItems:'center'}}>
                      <span style={{fontSize:13, fontWeight:700, color:'#F7931A', textTransform:'uppercase'}}>{s.type}</span>
                      <span style={{fontSize:11, color:'#3e3e52'}}>{s.total} trades · {(s.wr*100).toFixed(0)}% WR</span>
                    </div>
                    <span style={{fontSize:15, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color: s.ev>0?'#00d084':'#ff4d6d'}}>
                      EV: {s.ev>0?'+':''}{s.ev}R
                    </span>
                  </div>
                  <div style={{display:'flex', gap:10, marginBottom:6}}>
                    <span style={{fontSize:11, color:'#5a5a6e'}}>Avg win: <span style={{color:'#00d084'}}>+{s.avgW}R</span></span>
                    <span style={{fontSize:11, color:'#5a5a6e'}}>Avg loss: <span style={{color:'#ff4d6d'}}>-{s.avgL}R</span></span>
                  </div>
                  <div style={{height:6, background:'#1a1a22', borderRadius:3, overflow:'hidden'}}>
                    <div style={{width:`${s.wr*100}%`, height:'100%', background: s.ev>0?'#00d084':'#ff4d6d', borderRadius:3}}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:100, gap:6}}>
              <span style={{fontSize:20, opacity:0.1}}>◉</span>
              <span style={{fontSize:12, color:'#3e3e52'}}>Will populate after first closed trade</span>
            </div>
          )}
        </div>
      </div>

      <div style={anStyles.twoCol}>
        {/* Time of day */}
        <div style={anStyles.card}>
          <div style={anStyles.cardTitle}>Win Rate by H4 Bar <span style={anStyles.cardSub}>UTC open time</span></div>
          {closed.length > 0 ? (
            <div style={{marginTop:16, display:'flex', gap:8, alignItems:'flex-end', height:100}}>
              {hourly_stats.map(h => {
                const total = h.wins + h.losses;
                const wr = total ? h.wins/total : 0;
                const barH = Math.max(8, wr * 90);
                const col = wr >= 0.6 ? '#00d084' : wr >= 0.4 ? '#F7931A' : '#ff4d6d';
                return (
                  <div key={h.hour} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4}}>
                    <span style={{fontSize:10, color: col, fontWeight:700}}>{(wr*100).toFixed(0)}%</span>
                    <div style={{width:'100%', height:barH, background:col, borderRadius:'3px 3px 0 0', opacity:0.8}}></div>
                    <span style={{fontSize:10, color:'#3e3e52', fontFamily:"'JetBrains Mono',monospace"}}>{h.label}</span>
                    <span style={{fontSize:9, color:'#2a2a38'}}>{h.wins}W {h.losses}L</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:100, gap:6}}>
              <span style={{fontSize:20, opacity:0.1}}>◈</span>
              <span style={{fontSize:12, color:'#3e3e52'}}>Will populate after first closed trade</span>
            </div>
          )}
        </div>

        {/* Day of week */}
        <div style={anStyles.card}>
          <div style={anStyles.cardTitle}>Performance by Day of Week</div>
          {closed.length > 0 ? (
            <div style={{marginTop:12, display:'flex', flexDirection:'column', gap:8}}>
              {dow_stats.map(d => {
                const total = d.wins + d.losses;
                const wr = total ? d.wins/total : 0;
                const hasData = total > 0;
                return (
                  <div key={d.day} style={{display:'flex', gap:10, alignItems:'center'}}>
                    <span style={{fontSize:12, color:'#5a5a6e', width:32, flexShrink:0}}>{d.day}</span>
                    <div style={{flex:1, height:6, background:'#1a1a22', borderRadius:3, overflow:'hidden'}}>
                      <div style={{width:`${wr*100}%`, height:'100%', background: wr>=0.6?'#00d084':wr>=0.4?'#F7931A':'#ff4d6d', borderRadius:3}}></div>
                    </div>
                    <span style={{fontSize:11, fontFamily:"'JetBrains Mono',monospace", color: hasData?'#5a5a6e':'#2a2a38', width:36}}>
                      {hasData ? `${(wr*100).toFixed(0)}%` : '—'}
                    </span>
                    <span style={{fontSize:11, fontFamily:"'JetBrains Mono',monospace", color: !hasData?'#2a2a38':d.total_r>0?'#00d084':'#ff4d6d', width:50, textAlign:'right'}}>
                      {hasData ? `${d.total_r>0?'+':''}${d.total_r.toFixed(2)}R` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:100, gap:6}}>
              <span style={{fontSize:20, opacity:0.1}}>◬</span>
              <span style={{fontSize:12, color:'#3e3e52'}}>Will populate after first closed trade</span>
            </div>
          )}
        </div>
      </div>

      {/* Grade performance */}
      <div style={anStyles.card}>
        <div style={anStyles.cardTitle}>Quality Grade vs Actual R Achieved
          <span style={anStyles.cardSub}>Does A+ actually outperform B in practice?</span>
        </div>
        {gradeStats.length > 0 ? (
          <div style={{display:'flex', gap:0, marginTop:14}}>
            {gradeStats.map((g, i) => (
              <div key={g.grade} style={{flex:1, padding:'0 20px', borderRight: i<gradeStats.length-1?'1px solid #1a1a22':'none'}}>
                <div style={{marginBottom:8}}><GradeBadge grade={g.grade} /></div>
                <div style={{fontSize:22, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color: g.avg>0?'#00d084':'#ff4d6d', marginBottom:4}}>
                  {g.avg>0?'+':''}{g.avg}R
                </div>
                <div style={{fontSize:11, color:'#3e3e52'}}>avg per trade</div>
                <div style={{marginTop:8, fontSize:11, color:'#5a5a6e'}}>{g.wins}/{g.count} wins</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:80, gap:6}}>
            <span style={{fontSize:12, color:'#3e3e52'}}>Will populate after first closed trade</span>
            <span style={{fontSize:11, color:'#2a2a38'}}>This shows whether your A+ setups actually beat your B setups in real trading</span>
          </div>
        )}
      </div>
    </div>
  );
}

const anStyles = {
  wrap: { padding:'28px 32px', height:'100%', overflowY:'auto', boxSizing:'border-box', fontFamily:"'Space Grotesk',sans-serif" },
  pageTitle: { fontSize:22, fontWeight:700, color:'#ece9e2', letterSpacing:'-0.5px', marginBottom:22 },
  kpiRow: { display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10, marginBottom:14 },
  kpiCard: { background:'#111116', border:'1px solid #1f1f28', borderRadius:10, padding:'14px 16px' },
  kpiLabel: { fontSize:10, color:'#3e3e52', letterSpacing:'0.4px', marginBottom:7 },
  kpiVal: { fontSize:18, fontWeight:700, fontFamily:"'JetBrains Mono',monospace" },
  twoCol: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 },
  card: { background:'#111116', border:'1px solid #1f1f28', borderRadius:10, padding:'18px 22px', marginBottom:14 },
  cardTitle: { fontSize:13, fontWeight:600, color:'#ece9e2' },
  cardSub: { fontSize:11, color:'#3e3e52', fontWeight:400, marginLeft:8 },
};

Object.assign(window, { Analytics });
