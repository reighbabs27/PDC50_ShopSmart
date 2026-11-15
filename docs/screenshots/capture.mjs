import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9222;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expr) {
    const res = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true });
    return res.result?.value;
  }

  async captureScreenshot(outputPath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(outputPath, Buffer.from(res.data, 'base64'));
    console.log(`Saved screenshot to ${outputPath}`);
  }

  close() {
    this.ws.close();
  }
}

async function main() {
  const screenshotsDir = path.resolve('c:/Users/Reighh/Downloads/PDC50_ShopSmart/docs/screenshots');

  console.log('Starting headless Chrome on port', PORT);
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--window-size=1280,850',
    '--hide-scrollbars',
    '--disable-gpu',
    'http://localhost:5173/assistant'
  ]);

  try {
    let wsUrl = null;
    for (let i = 0; i < 20; i++) {
      await sleep(300);
      try {
        const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
        const json = await res.json();
        const page = json.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
        if (page) {
          wsUrl = page.webSocketDebuggerUrl;
          break;
        }
      } catch {}
    }

    if (!wsUrl) throw new Error('Could not connect to Chrome debugging port.');

    const cdp = new CDPClient(wsUrl);
    await cdp.init();
    console.log('Connected to CDP page target!');

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await sleep(1500);

    // Case 1: Catalog match using sample chip 0 ("Which keyboard is below ₱2,000?")
    console.log('Testing Case 1: Catalog Match ...');
    await cdp.eval(`
      (() => {
        const chips = document.querySelectorAll('.sample-chip');
        if (chips[0]) chips[0].click();
        setTimeout(() => {
          const btn = document.querySelector('form button[type="submit"]');
          if (btn) btn.click();
        }, 100);
      })()
    `);
    await sleep(2500);
    await cdp.captureScreenshot(path.join(screenshotsDir, '01_catalog_match.png'));

    // Case 2: No match using sample chip 2 ("Do you have any refrigerators?")
    console.log('Testing Case 2: No Match ...');
    await cdp.eval(`
      (() => {
        const chips = document.querySelectorAll('.sample-chip');
        if (chips[2]) chips[2].click();
        setTimeout(() => {
          const btn = document.querySelector('form button[type="submit"]');
          if (btn) btn.click();
        }, 100);
      })()
    `);
    await sleep(2500);
    await cdp.captureScreenshot(path.join(screenshotsDir, '02_no_match.png'));

    // Case 3: Provider failure / Fallback
    console.log('Testing Case 3: Provider Failure / Fallback ...');
    await cdp.eval(`
      (() => {
        const chips = document.querySelectorAll('.sample-chip');
        if (chips[1]) chips[1].click();
        setTimeout(() => {
          const btn = document.querySelector('form button[type="submit"]');
          if (btn) btn.click();
        }, 100);
      })()
    `);
    await sleep(2500);
    await cdp.captureScreenshot(path.join(screenshotsDir, '03_provider_failure_fallback.png'));

    cdp.close();
    console.log('All screenshots captured successfully!');
  } finally {
    chrome.kill();
  }
}

main().catch(console.error);
