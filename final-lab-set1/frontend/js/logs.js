const LOKI = 'http://localhost:3100';
let refreshTimer = null;

async function fetchLogs() {
  const service = document.getElementById('service-filter').value;
  const output  = document.getElementById('log-output');
  output.innerHTML = '<p class="hint">กำลังโหลด...</p>';

  const query = service === 'all'
    ? `{compose_project="task-board-security"}`
    : `{compose_project="task-board-security",service="${service}"}`;

  const end   = Date.now() * 1000000;
  const start = end - (60 * 60 * 1000000000);
  const url   = `${LOKI}/loki/api/v1/query_range?query=${encodeURIComponent(query)}&start=${start}&end=${end}&limit=100`;

  try {
    const res  = await fetch(url);
    const data = await res.json();
    const streams = data?.data?.result || [];

    if (!streams.length) {
      output.innerHTML = '<p class="hint">ไม่พบ logs — ลองใช้งาน Task Board ก่อนแล้วกด refresh</p>';
      return;
    }

    const entries = [];
    streams.forEach(stream => {
      stream.values.forEach(([ts, line]) => {
        entries.push({ ts: parseInt(ts), line, service: stream.stream.service || '' });
      });
    });

    entries.sort((a, b) => b.ts - a.ts);

    output.innerHTML = entries.map(e => {
      const time  = new Date(e.ts / 1000000).toLocaleTimeString('th-TH');
      const cls   = e.line.includes('error') || e.line.includes('failed') ? 'error'
                  : e.line.includes('warn')  ? 'warn' : 'info';
      return `<div class="log-entry ${cls}">[${time}] ${e.line}</div>`;
    }).join('');

  } catch (err) {
    output.innerHTML = `<p class="hint error">เชื่อมต่อ Loki ไม่ได้: ${err.message}</p>`;
  }
}

function startAutoRefresh() {
  stopAutoRefresh();
  fetchLogs();
  refreshTimer = setInterval(fetchLogs, 5000);
}

function stopAutoRefresh() {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
}