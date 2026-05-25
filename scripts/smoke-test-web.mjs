/**
 * Headless smoke test: launch Edge against the production preview, capture
 * console messages, check for runtime crashes that would render a blank screen.
 * Uses raw CDP over WebSocket so no extra deps are needed.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import http from "node:http";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const TARGET = process.argv[2] ?? "http://localhost:5500/";
const userDir = mkdtempSync(path.join(tmpdir(), "edge-smoke-"));
const debugPort = 9333;

const browser = spawn(
  EDGE,
  [
    "--headless=new",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "about:blank",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);

function get(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve(body));
      })
      .on("error", reject);
  });
}

async function findWsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const body = await get(`http://127.0.0.1:${debugPort}/json/version`);
      const j = JSON.parse(body);
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch {}
    await wait(250);
  }
  throw new Error("CDP did not come up");
}

import wsPkg from "ws";
const WS = wsPkg.WebSocket ?? wsPkg;

const wsUrl = await findWsUrl();
const ws = new WS(wsUrl);
let nextId = 1;
const pending = new Map();
const consoleLogs = [];
const errors = [];

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result ?? msg.error);
    pending.delete(msg.id);
    return;
  }
  if (msg.method === "Runtime.consoleAPICalled") {
    const text = msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ");
    consoleLogs.push(`${msg.params.type}: ${text}`);
  }
  if (msg.method === "Runtime.exceptionThrown") {
    errors.push(msg.params.exceptionDetails);
  }
  if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") {
    errors.push(msg.params.entry);
  }
});

function send(method, params = {}) {
  return new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

await new Promise((r) => ws.on("open", r));

// Open a new target page so we can attach to it
const tgt = await send("Target.createTarget", { url: "about:blank" });
const sessionRes = await send("Target.attachToTarget", { targetId: tgt.targetId, flatten: true });
const sessionId = sessionRes.sessionId;

function sendInSession(method, params = {}) {
  return new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, sessionId, method, params }));
  });
}

await sendInSession("Page.enable");
await sendInSession("Runtime.enable");
await sendInSession("Log.enable");
await sendInSession("Page.navigate", { url: TARGET });
// Wait for app to settle
await wait(8000);

async function evalSync(expression, awaitPromise = false) {
  return sendInSession("Runtime.evaluate", { expression, returnByValue: true, awaitPromise });
}

const html = await evalSync("document.getElementById('root')?.innerHTML?.length ?? 0");

const inputProbe = await evalSync(`
  (() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    return inputs.map((el) => ({
      type: el.type,
      placeholder: el.placeholder,
      autocomplete: el.autocomplete,
      inputmode: el.inputMode,
      visible: el.offsetParent !== null,
      fontSize: getComputedStyle(el).fontSize,
    }));
  })()
`);

const interaction = await evalSync(
  `
  (async () => {
    const all = Array.from(document.querySelectorAll('input'));
    const email = all.find((el) => el.type === 'email' || /email/i.test(el.placeholder ?? ''));
    const password = all.find((el) => el.type === 'password');
    if (!email || !password) return { ok: false, reason: 'missing inputs', count: all.length };

    const setVal = (el, val) => {
      const proto = Object.getPrototypeOf(el);
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      setter && setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };

    email.focus();
    const emailFocused = document.activeElement === email;
    setVal(email, 'test@example.com');

    password.focus();
    const passwordFocused = document.activeElement === password;
    setVal(password, 'Password123!');

    await new Promise((r) => setTimeout(r, 200));

    return {
      ok: true,
      emailFocused,
      passwordFocused,
      emailValue: email.value,
      passwordValue: password.value,
    };
  })()
`,
  true,
);

console.log("=== ROOT INNER LENGTH:", html.result?.value, "===");
console.log("=== INPUTS ===");
console.log(JSON.stringify(inputProbe.result?.value, null, 2));
console.log("=== INTERACTION ===");
console.log(JSON.stringify(interaction.result?.value, null, 2));
console.log("=== CONSOLE LOGS (last 30) ===");
for (const l of consoleLogs.slice(-30)) console.log(l);
console.log("=== EXCEPTIONS ===");
for (const e of errors) console.log(JSON.stringify(e, null, 2));

browser.kill();
try {
  rmSync(userDir, { recursive: true, force: true });
} catch {}
process.exit(0);
