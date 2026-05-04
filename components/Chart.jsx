
function ChartPage({ data }) {
  const canvasRef = React.useRef(null);
  const [hovered, setHovered] = React.useState(null);
  const [liveCandles, setLiveCandles] = React.useState(null);
  const [livePrice, setLivePrice]     = React.useState(null);
  const [feedStatus, setFeedStatus]   = React.useState('connecting…');
  const candles = liveCandles || data.candles;
  const trades = data.trades;

  // Real data from Coinbase Exchange (public, no auth)
  React.useEffect(() => {
    const fetchCandles = () => {
      fetch('https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=3600')
        .then(r => r.json())
        .then(arr => {
          if (!Array.isArray(arr)) throw 0;
          const mapped = arr.slice().reverse().map(c =>
            ({ t: c[0]*1000, l: c[1], h: c[2], o: c[3], c: c[4], v: c[5] }));
          setLiveCandles(mapped.slice(-120));
          setFeedStatus('Coinbase · live');
        }).catch(() => setFeedStatus('Coinbase · feed offline'));
    };
    const fetchPrice = () => {
      fetch('https://api.exchange.coinbase.com/products/BTC-USD/ticker')
        .then(r => r.json())
        .then(t => { if (t?.price) setLivePrice(parseFloat(t.price)); }).catch(()=>{});
    };
    fetchCandles(); fetchPrice();
    const id1 = setInterval(fetchCandles, 5*60*1000);
    const id2 = setInterval(fetchPrice, 10*1000);
    return () => { clearInterval(id1); clearInterval(id2); };
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const PAD = { top: 20, right: 60, bottom: 40, left: 10 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0d0d11';
    ctx.fillRect(0, 0, W, H);

    const prices = candles.flatMap(c => [c.h, c.l]);
    const minP = Math.min(...prices) * 0.999;
    const maxP = Math.max(...prices) * 1.001;
    const priceRange = maxP - minP;

    const toX = i => PAD.left + (i / (candles.length - 1)) * chartW;
    const toY = p => PAD.top + chartH - ((p - minP) / priceRange) * chartH;

    // Grid lines
    ctx.strokeStyle = '#1a1a22';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = PAD.top + (i / 5) * chartH;
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(PAD.left + chartW, y);
      ctx.stroke();
      const price = maxP - (i / 5) * priceRange;
      ctx.fillStyle = '#3e3e52';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('$' + price.toFixed(0), W - PAD.right + 4, y + 3);
    }

    // Volume bars (background)
    const maxVol = Math.max(...candles.map(c => c.v));
    candles.forEach((c, i) => {
      const x = toX(i);
      const bw = Math.max(2, chartW / candles.length - 1);
      const volH = (c.v / maxVol) * 40;
      ctx.fillStyle = c.c >= c.o ? 'rgba(0,208,132,0.15)' : 'rgba(255,77,109,0.12)';
      ctx.fillRect(x - bw / 2, PAD.top + chartH - volH, bw, volH);
    });

    // Candles
    candles.forEach((c, i) => {
      const x = toX(i);
      const bw = Math.max(2, chartW / candles.length - 1.5);
      const isGreen = c.c >= c.o;
      const col = isGreen ? '#00d084' : '#ff4d6d';

      // Wick
      ctx.strokeStyle = col;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, toY(c.h));
      ctx.lineTo(x, toY(c.l));
      ctx.stroke();

      // Body
      const top = toY(Math.max(c.o, c.c));
      const bot = toY(Math.min(c.o, c.c));
      const bodyH = Math.max(1, bot - top);
      ctx.fillStyle = isGreen ? 'rgba(0,208,132,0.85)' : 'rgba(255,77,109,0.85)';
      ctx.fillRect(x - bw / 2, top, bw, bodyH);
    });

    // Trade markers
    trades.forEach(t => {
      const idx = Math.floor(Math.random() * 20) + (candles.length - 25); // recent candles
      if (idx < 0 || idx >= candles.length) return;
      const x = toX(idx);
      const isLong = t.side === 'LONG';
      const py = isLong ? toY(t.entry) + 14 : toY(t.entry) - 14;

      ctx.fillStyle = isLong ? '#00d084' : '#ff4d6d';
      ctx.beginPath();
      if (isLong) {
        ctx.moveTo(x, py - 10);
        ctx.lineTo(x + 5, py);
        ctx.lineTo(x - 5, py);
      } else {
        ctx.moveTo(x, py + 10);
        ctx.lineTo(x + 5, py);
        ctx.lineTo(x - 5, py);
      }
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = isLong ? 'rgba(0,208,132,0.12)' : 'rgba(255,77,109,0.12)';
      ctx.strokeStyle = isLong ? '#00d084' : '#ff4d6d';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x - 20, isLong ? py - 22 : py + 10, 40, 12);
      ctx.fillRect(x - 20, isLong ? py - 22 : py + 10, 40, 12);
      ctx.fillStyle = isLong ? '#00d084' : '#ff4d6d';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(isLong ? '▲ L' : '▼ S', x, isLong ? py - 13 : py + 19);
    });

    // Current price line
    const lastClose = candles[candles.length - 1].c;
    const py = toY(lastClose);
    ctx.strokeStyle = '#F7931A';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD.left, py);
    ctx.lineTo(PAD.left + chartW, py);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#F7931A';
    ctx.fillRect(W - PAD.right + 2, py - 9, PAD.right - 4, 18);
    ctx.fillStyle = '#0d0d11';
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('$' + lastClose.toFixed(0), W - PAD.right / 2, py + 3);

    // Time axis
    ctx.fillStyle = '#3e3e52';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    [0, 0.25, 0.5, 0.75, 1].forEach(pct => {
      const i = Math.floor(pct * (candles.length - 1));
      const x = toX(i);
      const d = new Date(candles[i].t);
      ctx.fillText(`${d.getMonth()+1}/${d.getDate()}`, x, PAD.top + chartH + 20);
    });

  }, [candles]);

  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];
  const change = lastCandle.c - prevCandle.c;
  const changePct = (change / prevCandle.c * 100);

  return (
    <div style={chartStyles.wrap}>
      <div style={chartStyles.header}>
        <div>
          <div style={chartStyles.pageTitle}>BTC / USD  <span style={chartStyles.tf}>1H</span></div>
          <div style={chartStyles.pageSub}>{feedStatus}</div>
        </div>
        <div style={chartStyles.priceInfo}>
          <span style={chartStyles.price}>${(livePrice || lastCandle.c).toFixed(2)}</span>
          <span style={{...chartStyles.change, color: change >= 0 ? '#00d084' : '#ff4d6d'}}>
            {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%)
          </span>
        </div>
        <div style={chartStyles.candleInfo}>
          {['O','H','L','C'].map((k, i) => (
            <div key={k} style={chartStyles.ohlc}>
              <span style={chartStyles.ohlcLabel}>{k}</span>
              <span style={chartStyles.ohlcVal}>${[lastCandle.o,lastCandle.h,lastCandle.l,lastCandle.c][i].toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={chartStyles.canvasWrap}>
        <canvas ref={canvasRef} width={1100} height={480} style={{ width: '100%', height: 480, display: 'block' }} />
      </div>
      <div style={chartStyles.legend}>
        <span style={{color:'#00d084', fontSize:11}}>▲ LONG entry</span>
        <span style={{color:'#ff4d6d', fontSize:11}}>▼ SHORT entry</span>
        <span style={{color:'#F7931A', fontSize:11}}>— Current price</span>
        <span style={{color:'#5a5a6e', fontSize:11}}>Bars: volume</span>
      </div>
    </div>
  );
}

const chartStyles = {
  wrap: { padding: '28px 32px', height: '100%', overflowY: 'auto', boxSizing: 'border-box' },
  header: { display: 'flex', alignItems: 'center', gap: 32, marginBottom: 20 },
  pageTitle: { fontSize: 20, fontWeight: 700, color: '#ece9e2' },
  tf: { background: 'rgba(247,147,26,0.15)', color: '#F7931A', fontSize: 12, padding: '2px 8px', borderRadius: 4, marginLeft: 8, fontFamily: "'JetBrains Mono', monospace" },
  pageSub: { fontSize: 11, color: '#3e3e52', marginTop: 4 },
  priceInfo: { display: 'flex', flexDirection: 'column' },
  price: { fontSize: 24, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#ece9e2' },
  change: { fontSize: 13, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 },
  candleInfo: { display: 'flex', gap: 20, marginLeft: 'auto' },
  ohlc: { display: 'flex', gap: 6, alignItems: 'center' },
  ohlcLabel: { fontSize: 11, color: '#3e3e52', letterSpacing: '0.5px' },
  ohlcVal: { fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#ece9e2' },
  canvasWrap: { background: '#0d0d11', border: '1px solid #1f1f28', borderRadius: 10, overflow: 'hidden' },
  legend: { display: 'flex', gap: 20, marginTop: 14, padding: '0 4px' },
};

Object.assign(window, { ChartPage });
