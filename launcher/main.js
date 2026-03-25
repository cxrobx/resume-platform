const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const os = require('os');

// Absolute path to the repo — this is a personal launcher, not a portable app
const REPO = path.join(os.homedir(), 'Projects', 'resume-platform');

let apiProc = null;
let webProc = null;
let mainWin = null;
let starting = false;

// Run a command in a login shell so the user's PATH (Homebrew, nvm, etc.) is available.
// detached:true puts it in its own process group so we can kill the whole group on quit.
function sh(cmd, cwd) {
  return spawn('/bin/zsh', ['-l', '-c', cmd], {
    cwd,
    env: { ...process.env, HOME: os.homedir() },
    detached: true,
    stdio: 'pipe',
  });
}

// Poll a URL until it responds with a non-error status or we time out.
function waitForOk(url, maxMs = 60000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + maxMs;
    const check = () => {
      http.get(url, (res) => {
        // Any response (including redirects) means the server is up
        if (res.statusCode < 500) { resolve(); return; }
        retry();
      }).on('error', retry);
    };
    const retry = () => {
      if (Date.now() > deadline) { reject(new Error(`Timed out waiting for ${url}`)); return; }
      setTimeout(check, 1000);
    };
    setTimeout(check, 500);
  });
}

function killAll() {
  [apiProc, webProc].forEach((p) => {
    if (!p) return;
    try { process.kill(-p.pid, 'SIGTERM'); } catch (_) {}
    try { p.kill('SIGTERM'); } catch (_) {}
  });
  apiProc = null;
  webProc = null;
}

async function start() {
  if (starting) return;
  starting = true;

  const loadWin = new BrowserWindow({
    width: 360,
    height: 200,
    frame: false,
    resizable: false,
    center: true,
    webPreferences: { nodeIntegration: false },
  });
  loadWin.loadFile(path.join(__dirname, 'loading.html'));

  // Start API server
  apiProc = sh(
    `source .venv/bin/activate && TYPST_PATH=/opt/homebrew/bin/typst RESUME_ROOT=../resume python3 main.py`,
    path.join(REPO, 'api')
  );

  // Start Next.js dev server
  webProc = sh(
    `NEXT_PUBLIC_API_URL=http://localhost:8001 npm run dev -- -p 3030`,
    path.join(REPO, 'web')
  );

  try {
    // API is fast; Next.js dev compile can take up to ~30s on first run
    await waitForOk('http://localhost:8001/health', 30000);
    await waitForOk('http://localhost:3030', 60000);
  } catch (err) {
    if (!loadWin.isDestroyed()) {
      loadWin.loadFile(path.join(__dirname, 'error.html'));
    }
    starting = false;
    return;
  }

  if (!loadWin.isDestroyed()) loadWin.close();

  mainWin = new BrowserWindow({
    width: 1400,
    height: 900,
    titleBarStyle: 'hiddenInset',
    webPreferences: { nodeIntegration: false },
  });
  mainWin.loadURL('http://localhost:3030/editor');
  mainWin.on('closed', () => { mainWin = null; });
  starting = false;
}

app.whenReady().then(start);

// Clean up servers before the app exits
app.on('before-quit', killAll);
app.on('will-quit', killAll);

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Re-open window when dock icon is clicked
app.on('activate', () => {
  if (!mainWin && !starting) start();
});
