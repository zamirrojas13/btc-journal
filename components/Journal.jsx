
function Journal({ data }) {
  const [expanded, setExpanded] = React.useState(null);
  const [filter, setFilter]     = React.useState('all');

  const trades = data.trades.filter(t =>
    filter === 'all'    ? true :
    filter === 'open'   ? t.open :
    filter === 'closed' ? !t.open :
    filter === 'long'   ? t.direction === 'long' :
    filter === 'short'  ? t.direction === 'short' :
    filter === 'tier1'  ? t.tier === 1 :
    filter === 'tier2'  ? t.tier === 2 :
    filter === 'tier3'  ? t.tier === 3 :
    filter === 'a+'     ? t.grade === 'A+' :
    filter === 'solid'  ? t.grade === 'Solid' :
    filter === 'b'      ? t.grade === 'B' :
    true
  );

  const exitColor = r => r === 'tp_hit' ? '#00d084' : r === 'sl_hit' ? '#ff4d6d' : r === 'trail_stop' ? '#F7931A' : '#5a5a6e';

  return (
    <div style={jStyles.wrap}>
      <div style={jStyles.header}>
        <div style={jStyles.pageTitle}>Trade Journal</div>
        <div style={jStyles.filters}>
          {[
            ['all','All'], ['open','Open'], ['closed','Closed'],
            ['long','Longs'], ['short','Shorts'],
            ['tier1','T1'], ['tier2','T2'], ['tier3','T3'],
            ['a+','A+'], ['solid','Solid'], ['b','B'],
          ].map(([f, lbl]) => (
            <button key={f} onClick={() => setFilter(f)}
              style={{...jStyles.filterBtn, ...(filter===f ? jStyles.filterActive : {})}}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <div style={jStyles.tableWrap}>
        <table style={jStyles.table}>
          <thead>
            <tr>
              {['ID','Dir','Setup','Tier','Grade','Entry','Exit','Exit Reason','Bars','R Mult','Net PnL','Fees',''].map(h => (
                <th key={h} style={jStyles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 && (
              <tr>
                <td colSpan={13} style={{padding:'56px 24px', textAlign:'center'}}>
                  <div style={{fontSize:24, opacity:0.07, marginBottom:12}}>✦</div>
                  <div style={{fontSize:14, color:'#3e3e52', marginBottom:6}}>
                    {data.trades.length === 0 ? 'No trades recorded yet' : `No ${filter} trades`}
                  </div>
                  <div style={{fontSize:12, color:'#2a2a38'}}>
                    {data.trades.length === 0
                      ? 'Your first trade will appear here automatically once the bot closes a position.'
                      : 'Try a different filter to see other trades.'}
                  </div>
                </td>
              </tr>
            )}
            {trades.map(t => (
              <React.Fragment key={t.trade_id}>
                <tr style={{...jStyles.tr, ...(t.open?{background:'rgba(247,147,26,0.03)'}:{})}}
                    onClick={() => setExpanded(expanded===t.trade_id ? null : t.trade_id)}>
                  <td style={{...jStyles.monoTd, fontSize:10, color:'#3e3e52'}}>{t.trade_id}</td>
                  <td style={jStyles.td}>
                    <span style={{...jStyles.badge, ...(t.direction==='long'?jStyles.long:jStyles.short)}}>{t.direction.toUpperCase()}</span>
                  </td>
                  <td style={jStyles.td}>
                    <span style={{fontSize:12, color:'#F7931A', fontWeight:600}}>{t.setup_type}</span>
                    {t.open && <span style={jStyles.openPill}>OPEN</span>}
                  </td>
                  <td style={jStyles.td}><TierBadge tier={t.tier} /></td>
                  <td style={jStyles.td}><GradeBadge grade={t.grade} /></td>
                  <td style={jStyles.monoTd}>${(+t.entry_price).toLocaleString('en-US')}</td>
                  <td style={jStyles.monoTd}>{t.exit_price ? `$${(+t.exit_price).toLocaleString('en-US')}` : '—'}</td>
                  <td style={jStyles.td}>
                    {t.exit_reason
                      ? <span style={{fontSize:11, color: exitColor(t.exit_reason), fontFamily:"'JetBrains Mono',monospace"}}>{t.exit_reason}</span>
                      : <span style={{color:'#2a2a38', fontSize:11}}>—</span>}
                  </td>
                  <td style={{...jStyles.monoTd, color:'#5a5a6e'}}>{t.bars_held ?? '—'}</td>
                  <td style={{...jStyles.monoTd, fontWeight:700, color: t.r_multiple == null ? '#5a5a6e' : t.r_multiple >= 0 ? '#00d084':'#ff4d6d'}}>
                    {t.r_multiple == null ? '—' : `${t.r_multiple >= 0 ? '+':''}${parseFloat(t.r_multiple).toFixed(2)}R`}
                  </td>
                  <td style={{...jStyles.monoTd, color: t.pnl_net_usd == null ? '#5a5a6e' : t.pnl_net_usd >= 0 ? '#00d084':'#ff4d6d'}}>
                    {t.pnl_net_usd == null ? '—' : `${t.pnl_net_usd >= 0 ? '+':''}$${Math.abs(parseFloat(t.pnl_net_usd)).toFixed(2)}`}
                  </td>
                  <td style={{...jStyles.monoTd, color:'#5a5a6e'}}>{t.fees_usd ? `$${parseFloat(t.fees_usd).toFixed(2)}` : '—'}</td>
                  <td style={{...jStyles.td, color:'#3e3e52', cursor:'pointer', fontSize:16, paddingRight:14}}>{expanded===t.trade_id?'−':'+'}</td>
                </tr>

                {expanded === t.trade_id && (
                  <tr style={{background:'#0d0d11'}}>
                    <td colSpan={13} style={{padding:'16px 20px'}}>
                      <div style={jStyles.expandGrid}>

                        {/* Trade details */}
                        <div style={jStyles.expandCard}>
                          <div style={jStyles.expandTitle}>Trade Details</div>
                          <div style={jStyles.xrow}><span style={jStyles.xlbl}>trade_id</span><span style={jStyles.xval}>{t.trade_id}</span></div>
                          <div style={jStyles.xrow}><span style={jStyles.xlbl}>primary_setup</span><span style={{...jStyles.xval,color:'#F7931A'}}>{t.primary_setup}</span></div>
                          <div style={jStyles.xrow}><span style={jStyles.xlbl}>Entry time</span><span style={jStyles.xval}>{t.timestamp_entry?.slice(0,16).replace('T',' ')} UTC</span></div>
                          <div style={jStyles.xrow}><span style={jStyles.xlbl}>Exit time</span><span style={jStyles.xval}>{t.timestamp_exit?.slice(0,16).replace('T',' ') ?? '—'} {t.timestamp_exit ? 'UTC':''}</span></div>
                          <div style={jStyles.xrow}><span style={jStyles.xlbl}>SL / TP</span><span style={jStyles.xval}>${(+t.sl_price).toLocaleString('en-US')} / ${(+t.tp_price).toLocaleString('en-US')}</span></div>
                          <div style={jStyles.xrow}><span style={jStyles.xlbl}>RR target</span><span style={jStyles.xval}>1 : {t.rr_target}</span></div>
                          <div style={jStyles.xrow}><span style={jStyles.xlbl}>max_risk_usd</span><span style={jStyles.xval}>${t.max_risk_usd}</span></div>
                          <div style={jStyles.xrow}><span style={jStyles.xlbl}>nano_qty</span><span style={jStyles.xval}>{t.nano_qty}</span></div>
                          <div style={jStyles.xrow}><span style={jStyles.xlbl}>atr_scale_applied</span><span style={{...jStyles.xval,color:t.atr_scale_applied?'#00d084':'#5a5a6e'}}>{String(t.atr_scale_applied)}</span></div>
                        </div>

                        {/* Indicators at entry */}
                        <div style={jStyles.expandCard}>
                          <div style={jStyles.expandTitle}>Indicators at Entry</div>
                          <div style={jStyles.xrow}><span style={jStyles.xlbl}>ATR(14)</span><span style={jStyles.xval}>{t.atr != null ? `$${(+t.atr).toLocaleString('en-US')}` : '—'}</span></div>
                          <div style={jStyles.xrow}><span style={jStyles.xlbl}>ATR avg50</span><span style={jStyles.xval}>{t.atr_avg50 != null ? `$${(+t.atr_avg50).toLocaleString('en-US')}` : '—'}</span></div>
                          <div style={jStyles.xrow}><span style={jStyles.xlbl}>EMA(21)</span><span style={jStyles.xval}>{t.ema_fast != null ? `$${(+t.ema_fast).toLocaleString('en-US')}` : '—'}</span></div>
                          <div style={jStyles.xrow}><span style={jStyles.xlbl}>EMA(50)</span><span style={jStyles.xval}>{t.ema_slow != null ? `$${(+t.ema_slow).toLocaleString('en-US')}` : '—'}</span></div>

                          <div style={jStyles.xrow}><span style={jStyles.xlbl}>Vol ratio</span><span style={{...jStyles.xval, color:(+t.vol_ratio)>=1.5?'#F7931A':'#ece9e2'}}>{t.vol_ratio != null ? `${parseFloat(t.vol_ratio).toFixed(2)}×` : '—'}</span></div>
                          <div style={jStyles.xrow}><span style={jStyles.xlbl}>hi50 / lo50</span><span style={jStyles.xval}>{t.hi50 != null ? `$${(+t.hi50).toLocaleString('en-US')}` : '—'} / {t.lo50 != null ? `$${(+t.lo50).toLocaleString('en-US')}` : '—'}</span></div>
                        </div>

                        {/* MTF alignment */}
                        <div style={jStyles.expandCard}>
                          <div style={jStyles.expandTitle}>MTF Alignment</div>
                          <div style={jStyles.xrow}><span style={jStyles.xlbl}>Daily trend</span><span style={{...jStyles.xval,color:t.daily_trend==='bull'?'#00d084':'#ff4d6d'}}>{t.daily_trend ?? '—'}</span></div>
                          <div style={jStyles.xrow}><span style={jStyles.xlbl}>Weekly trend</span><span style={{...jStyles.xval,color:t.weekly_trend==='bull'?'#00d084':'#ff4d6d'}}>{t.weekly_trend ?? '—'}</span></div>
                          <div style={jStyles.xrow}><span style={jStyles.xlbl}>EMA gap daily</span><span style={{...jStyles.xval,color:t.ema_gap_daily!=null&&Math.abs(t.ema_gap_daily)>=0.01?'#00d084':'#5a5a6e'}}>{t.ema_gap_daily != null ? `${(t.ema_gap_daily*100).toFixed(1)}%` : '—'}</span></div>
                          <div style={jStyles.xrow}><span style={jStyles.xlbl}>EMA gap weekly</span><span style={{...jStyles.xval,color:t.ema_gap_weekly!=null&&Math.abs(t.ema_gap_weekly)>=0.02?'#00d084':'#5a5a6e'}}>{t.ema_gap_weekly != null ? `${(t.ema_gap_weekly*100).toFixed(1)}%` : '—'}</span></div>
                          <div style={jStyles.xrow}><span style={jStyles.xlbl}>sig_body_ratio</span><span style={jStyles.xval}>{t.sig_body_ratio ?? '—'}</span></div>
                          <div style={jStyles.xrow}><span style={jStyles.xlbl}>sig_dist_ema50</span><span style={jStyles.xval}>{t.sig_dist_ema50 != null ? `${(t.sig_dist_ema50*100).toFixed(1)}%` : '—'}</span></div>
                          <div style={jStyles.xrow}><span style={jStyles.xlbl}>d_rsi / w_rsi</span><span style={jStyles.xval}>{t.d_rsi ?? '—'} / {t.w_rsi ?? '—'}</span></div>
                          <div style={jStyles.xrow}><span style={jStyles.xlbl}>tp_near_res</span><span style={{...jStyles.xval,color:t.tp_near_res?'#ff4d6d':'#5a5a6e'}}>{t.tp_near_res != null ? String(t.tp_near_res) : '—'}</span></div>
                        </div>

                        {/* Notes */}
                        <div style={jStyles.expandCard}>
                          <div style={jStyles.expandTitle}>Notes</div>
                          <div style={{fontSize:13, color:'#ece9e2', lineHeight:1.7}}>{t.notes || <span style={{color:'#2a2a36'}}>No notes</span>}</div>
                          {t.entry_block_reason && <div style={{marginTop:10, fontSize:12, color:'#ff4d6d'}}>Block reason: {t.entry_block_reason}</div>}
                          <div style={{marginTop:12, paddingTop:10, borderTop:'1px solid #1a1a22'}}>
                            <div style={jStyles.xrow}><span style={jStyles.xlbl}>venue</span><span style={jStyles.xval}>{t.venue}</span></div>
                            <div style={jStyles.xrow}><span style={jStyles.xlbl}>venue_adapter</span><span style={jStyles.xval}>{t.venue_adapter}</span></div>
                            <div style={jStyles.xrow}><span style={jStyles.xlbl}>source</span><span style={jStyles.xval}>{t.source}</span></div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const jStyles = {
  wrap: { padding:'28px 32px', height:'100%', overflowY:'auto', boxSizing:'border-box', fontFamily:"'Space Grotesk',sans-serif" },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 },
  pageTitle: { fontSize:22, fontWeight:700, color:'#ece9e2', letterSpacing:'-0.5px' },
  filters: { display:'flex', gap:6, flexWrap:'wrap' },
  filterBtn: { padding:'6px 14px', borderRadius:6, border:'1px solid #1f1f28', background:'transparent', color:'#5a5a6e', fontSize:11, cursor:'pointer', fontFamily:"'Space Grotesk',sans-serif" },
  filterActive: { background:'rgba(247,147,26,0.1)', color:'#F7931A', border:'1px solid rgba(247,147,26,0.25)' },
  tableWrap: { background:'#111116', border:'1px solid #1f1f28', borderRadius:10, overflow:'hidden' },
  table: { width:'100%', borderCollapse:'collapse' },
  th: { textAlign:'left', fontSize:10, color:'#3e3e52', fontWeight:600, padding:'11px 12px', letterSpacing:'0.5px', background:'#0d0d11', borderBottom:'1px solid #1a1a22' },
  tr: { borderBottom:'1px solid #15151d', cursor:'pointer' },
  td: { padding:'10px 12px', fontSize:12, color:'#ece9e2', verticalAlign:'middle' },
  monoTd: { padding:'10px 12px', fontSize:12, color:'#ece9e2', verticalAlign:'middle', fontFamily:"'JetBrains Mono',monospace" },
  badge: { fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:4, letterSpacing:'0.5px' },
  long:  { background:'rgba(0,208,132,0.12)', color:'#00d084' },
  short: { background:'rgba(255,77,109,0.12)', color:'#ff4d6d' },
  openPill: { marginLeft:6, fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:3, background:'rgba(247,147,26,0.15)', color:'#F7931A', letterSpacing:'0.5px' },
  expandGrid: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12 },
  expandCard: { background:'#111116', border:'1px solid #1f1f28', borderRadius:8, padding:'14px 16px' },
  expandTitle: { fontSize:10, color:'#3e3e52', fontWeight:700, letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:10 },
  xrow: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 },
  xlbl: { fontSize:11, color:'#3e3e52' },
  xval: { fontSize:11, fontWeight:600, color:'#ece9e2', fontFamily:"'JetBrains Mono',monospace", textAlign:'right' },
};

Object.assign(window, { Journal });
