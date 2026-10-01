async function check() {
  const versionRes = await fetch("http://127.0.0.1:9222/json/list");
  const targets = await versionRes.json();
  const pageTarget = targets.find(t => t.type === "page");
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 1;
  const send = (method, params = {}) => new Promise(res => {
    const msgId = id++;
    const handler = (ev) => {
      const d = JSON.parse(ev.data);
      if (d.id === msgId) { ws.removeEventListener('message', handler); res(d.result); }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const mb = document.querySelector('.modal-box');
      if (!mb) return 'No modal box';
      const r = mb.getBoundingClientRect();
      const c = mb.firstElementChild;
      const cr = c ? c.getBoundingClientRect() : null;
      return {
        box: { w: r.width, h: r.height, top: r.top, left: r.left },
        inner: cr ? { w: cr.width, h: cr.height } : null
      };
    })()`,
    returnByValue: true
  });
  console.log("Rect:", res.result.value);
  ws.close();
}
check();
