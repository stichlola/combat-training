async function run() {
  const versionRes = await fetch("http://127.0.0.1:9222/json/list");
  const targets = await versionRes.json();
  let pageTarget = targets.find(t => t.type === "page");

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  let id = 1;
  const callbacks = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      callbacks.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  const errors = [];
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && callbacks.has(data.id)) {
      const { resolve, reject } = callbacks.get(data.id);
      callbacks.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    } else if (data.method === "Runtime.exceptionThrown") {
      const ex = data.params.exceptionDetails;
      console.error(">>> RUNTIME EXCEPTION:", ex.text, ex.exception?.description || ex.exception?.value);
      errors.push(ex);
    } else if (data.method === "Runtime.consoleAPICalled") {
      const text = data.params.args.map(a => a.value || a.description).join(" ");
      console.log(`CONSOLE [${data.params.type}]:`, text);
    }
  };

  await new Promise(r => ws.onopen = r);
  await send("Page.enable");
  await send("Runtime.enable");

  // Navigate to test.html
  await send("Page.navigate", { url: "http://localhost:5173/test.html" });
  await new Promise(r => setTimeout(r, 1200));

  // Click Termina button
  await send("Runtime.evaluate", {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const termBtn = btns.find(b => b.innerText.toLowerCase().includes('termina'));
      if (termBtn) termBtn.click();
    })()`
  });

  await new Promise(r => setTimeout(r, 600));

  // Click "Sì, aggiorna il modello ✓"
  await send("Runtime.evaluate", {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.innerText.toLowerCase().includes('aggiorna il modello'));
      if (b) b.click();
    })()`
  });

  // Wait 1.5 seconds for ResultsScreen
  await new Promise(r => setTimeout(r, 1500));

  const check = await send("Runtime.evaluate", {
    expression: `(() => {
      const mb = document.querySelector('.modal-box');
      if (!mb) return 'No modal box found!';
      const r = mb.getBoundingClientRect();
      const c = mb.firstElementChild;
      const cr = c ? c.getBoundingClientRect() : null;
      return {
        box: { w: r.width, h: r.height, top: r.top, left: r.left },
        inner: cr ? { w: cr.width, h: cr.height } : null,
        innerText: mb.innerText
      };
    })()`,
    returnByValue: true
  });
  console.log("Check:", JSON.stringify(check.result.value, null, 2));

  ws.close();
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
