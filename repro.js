// Reproduction script with network mocking in Edge CDP
async function run() {
  const versionRes = await fetch("http://127.0.0.1:9222/json/list");
  const targets = await versionRes.json();
  let pageTarget = targets.find(t => t.type === "page");
  if (!pageTarget) {
    const newTabRes = await fetch("http://127.0.0.1:9222/json/new?http://localhost:5173/");
    pageTarget = await newTabRes.json();
  }

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

  const dummyUser = {
    id: "test-user-123",
    aud: "authenticated",
    role: "authenticated",
    email: "test@example.com",
    user_metadata: { username: "Tester" },
    app_metadata: { provider: "email" }
  };

  const dummySession = {
    access_token: "mock-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "mock-refresh",
    user: dummyUser
  };

  const dummyData = {
    id: "test-user-123",
    user_id: "test-user-123",
    body: { onboarded: true, uiMode: "standard", sesso: "M", peso: 75, altezza: 175 },
    routines: [
      {
        id: 101,
        name: "SCHEDA TEST A",
        exercises: [
          {
            name: "Panca Piana Bilanciere",
            group: "Petto",
            sets: [
              { w: 60, r: 10, done: false, elapsed: 0 },
              { w: 60, r: 10, done: false, elapsed: 0 }
            ]
          }
        ]
      }
    ],
    history: [],
    stats: { workouts: 0, setsDone: 0, volume: 0, cardioMin: 0, questsDone: 0, hints: [] },
    xp: 150,
    level: 2
  };

  ws.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    if (data.id && callbacks.has(data.id)) {
      const { resolve, reject } = callbacks.get(data.id);
      callbacks.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    } else if (data.method === "Runtime.exceptionThrown") {
      const ex = data.params.exceptionDetails;
      console.error(">>> RUNTIME EXCEPTION:", ex.text, ex.exception?.description || ex.exception?.value);
    } else if (data.method === "Runtime.consoleAPICalled") {
      const text = data.params.args.map(a => a.value || a.description).join(" ");
      console.log(`CONSOLE [${data.params.type}]:`, text);
    } else if (data.method === "Fetch.requestPaused") {
      const { requestId, request } = data.params;
      const url = request.url;
      if (url.includes("/rest/v1/user_data")) {
        const bodyStr = JSON.stringify(dummyData);
        await send("Fetch.fulfillRequest", {
          requestId,
          responseCode: 200,
          responseHeaders: [
            { name: "Content-Type", value: "application/json" },
            { name: "Content-Range", value: "0-0/1" }
          ],
          body: Buffer.from(bodyStr).toString("base64")
        });
      } else if (url.includes("/rest/v1/premium")) {
        await send("Fetch.fulfillRequest", {
          requestId,
          responseCode: 200,
          responseHeaders: [{ name: "Content-Type", value: "application/json" }],
          body: Buffer.from("null").toString("base64")
        });
      } else if (url.includes("/auth/v1/user")) {
        await send("Fetch.fulfillRequest", {
          requestId,
          responseCode: 200,
          responseHeaders: [{ name: "Content-Type", value: "application/json" }],
          body: Buffer.from(JSON.stringify(dummyUser)).toString("base64")
        });
      } else {
        await send("Fetch.continueRequest", { requestId });
      }
    }
  };

  await new Promise(r => ws.onopen = r);
  console.log("Connected to CDP WebSocket");

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Fetch.enable", {
    patterns: [{ urlPattern: "*supabase.co*" }]
  });

  // Pre-seed localStorage with auth session
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      localStorage.setItem("sb-awkdcbaycoljewjjawip-auth-token", JSON.stringify(${JSON.stringify(dummySession)}));
    `
  });

  // Navigate to localhost:5173
  await send("Page.navigate", { url: "http://localhost:5173/" });
  console.log("Navigating to http://localhost:5173/ ...");

  // Wait 3.5 seconds for boot
  await new Promise(r => setTimeout(r, 3500));

  const pageText = await send("Runtime.evaluate", {
    expression: "document.body.innerText.slice(0, 400)",
    returnByValue: true
  });
  console.log("Page text after boot:\n", pageText.result.value);

  // Click on "Inizia" button for "SCHEDA TEST A"
  const startRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const startBtn = btns.find(b => b.innerText.includes('Inizia') || b.innerText.includes('Riprendi'));
      if (startBtn) {
        startBtn.click();
        return 'Started workout with: ' + startBtn.innerText;
      }
      return 'Available buttons: ' + btns.map(b => b.innerText.trim()).join(' | ');
    })()`,
    returnByValue: true
  });
  console.log("Start workout:", startRes.result.value);

  // Wait 1.5 seconds for SessionView to mount
  await new Promise(r => setTimeout(r, 1500));

  const sessionCheck = await send("Runtime.evaluate", {
    expression: "document.body.innerText.slice(0, 300)",
    returnByValue: true
  });
  console.log("Session text:\n", sessionCheck.result.value);

  // Click on a check button to complete a set
  await send("Runtime.evaluate", {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const setBtn = btns.find(b => b.className.includes('check-btn') || b.className.includes('set-chip'));
      if (setBtn) setBtn.click();
    })()`
  });

  await new Promise(r => setTimeout(r, 500));

  // Click "Termina ✓"
  const termRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const termBtn = btns.find(b => b.innerText.includes('Termina'));
      if (termBtn) {
        termBtn.click();
        return 'Clicked Termina';
      }
      return 'Available: ' + btns.map(b => b.innerText.trim()).join(' | ');
    })()`,
    returnByValue: true
  });
  console.log("Termina:", termRes.result.value);

  // Wait 1 second for finishing popup
  await new Promise(r => setTimeout(r, 1000));

  const modalButtons = await send("Runtime.evaluate", {
    expression: "Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim())",
    returnByValue: true
  });
  console.log("Modal buttons:", modalButtons.result.value);

  // Click "Sì, aggiorna il modello ✓"
  const finishRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.innerText.includes('aggiorna il modello') || btn.innerText.includes('salva solo il record'));
      if (b) {
        b.click();
        return 'Clicked: ' + b.innerText;
      }
      return 'No finish button found';
    })()`,
    returnByValue: true
  });
  console.log("Finish click:", finishRes.result.value);

  // Wait 2.5 seconds to observe the screen state!
  await new Promise(r => setTimeout(r, 2500));

  const finalCheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const modalBack = document.querySelector('.modal-back');
      const root = document.querySelector('#root');
      return {
        bodyBg: window.getComputedStyle(document.body).backgroundColor,
        bodyText: document.body.innerText,
        hasModalBack: !!modalBack,
        modalBackDisplay: modalBack ? window.getComputedStyle(modalBack).display : null,
        modalBackBg: modalBack ? window.getComputedStyle(modalBack).backgroundColor : null,
        modalBoxHtml: document.querySelector('.modal-box')?.outerHTML?.slice(0, 500),
        rootInnerHtml: root?.innerHTML?.slice(0, 400)
      };
    })()`,
    returnByValue: true
  });
  console.log("FINAL OBSERVED STATE:\n", JSON.stringify(finalCheck.result.value, null, 2));

  ws.close();
  process.exit(0);
}

run().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
