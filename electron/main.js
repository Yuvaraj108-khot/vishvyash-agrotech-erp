/**
 * Vishvyash Agrotech ERP — Electron Main Process
 *
 * Architecture:
 *   VishvyashERP.exe
 *     ├── Electron (this file)       → shows the UI window
 *     └── utilityProcess (server)    → runs embedded Node/Express backend
 *                                       connects to Neon PostgreSQL
 *
 * User experience: Double-click → ERP opens. That's it.
 */

const { app, BrowserWindow, utilityProcess, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { fork } = require('child_process');

// ─── Constants ────────────────────────────────────────────────────────────────
const isDev = !app.isPackaged;

// Internal port — users never see this. Express runs here, Electron loads it.
const INTERNAL_PORT = 57842;

// ─── State ────────────────────────────────────────────────────────────────────
let serverProcess = null;
let mainWindow = null;
let splashWindow = null;
let isQuitting = false;

// ─── Logging ──────────────────────────────────────────────────────────────────
const logDir = path.join(app.getPath('userData'), 'logs');
const logFile = path.join(logDir, 'startup.log');

function writeStartupLog(message) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] [Electron] ${message}\n`);
    console.log(`[Electron Log] ${message}`);
  } catch (e) {
    console.error('Failed to write to startup.log:', e);
  }
}

// ─── Paths (dev vs packaged) ──────────────────────────────────────────────────
function getPaths() {
  writeStartupLog(`getPaths() checking isDev = ${isDev}`);
  if (isDev) {
    // Development: server compiled to server/dist/
    const root = path.resolve(__dirname, '..');
    return {
      serverScript : path.join(root, 'server', 'dist', 'src', 'index.js'),
      serverCwd    : path.join(root, 'server'),
      appConfig    : path.join(__dirname, 'app.config.json'),
      userData     : app.getPath('userData'),
      prismaEngine : path.join(root, 'server', 'node_modules', '.prisma', 'client', 'query_engine-windows.dll.node'),
    };
  } else {
    // Packaged: server bundle copied to resources/server/ by electron-builder
    return {
      serverScript : path.join(process.resourcesPath, 'server', 'dist', 'src', 'index.js'),
      serverCwd    : path.join(process.resourcesPath, 'server'),
      appConfig    : path.join(process.resourcesPath, 'app.config.json'),
      userData     : app.getPath('userData'),
      prismaEngine : path.join(process.resourcesPath, 'server', 'node_modules', '.prisma', 'client', 'query_engine-windows.dll.node'),
    };
  }
}

// ─── Load credentials from app.config.json ───────────────────────────────────
function loadConfig(paths) {
  writeStartupLog(`loadConfig() started. paths.appConfig = ${paths.appConfig}`);
  // On first launch, copy bundled config to userData so admin can update it there
  const userConfigPath = path.join(paths.userData, 'app.config.json');
  writeStartupLog(`userConfigPath = ${userConfigPath}`);

  if (!fs.existsSync(userConfigPath) && fs.existsSync(paths.appConfig)) {
    try {
      fs.mkdirSync(paths.userData, { recursive: true });
      fs.copyFileSync(paths.appConfig, userConfigPath);
      writeStartupLog(`First launch: credentials copied to ${userConfigPath}`);
    } catch (e) {
      writeStartupLog(`WARNING: Could not copy app.config.json to userData: ${e.message}`);
    }
  }

  // Read from userData (highest priority) or fallback to bundled config
  const configFile = fs.existsSync(userConfigPath) ? userConfigPath : paths.appConfig;
  writeStartupLog(`Reading config file from: ${configFile}`);

  try {
    const raw = fs.readFileSync(configFile, 'utf8');
    const parsed = JSON.parse(raw);
    writeStartupLog(`Config loaded successfully: true`);
    writeStartupLog(`DATABASE_URL exists: ${!!parsed.DATABASE_URL}`);
    writeStartupLog(`JWT_SECRET exists: ${!!parsed.JWT_SECRET}`);
    return parsed;
  } catch (e) {
    writeStartupLog(`ERROR: Failed to read/parse app.config.json: ${e.message}`);
    writeStartupLog(`Config loaded successfully: false`);
    return {};
  }
}

// ─── Wait for server health endpoint ─────────────────────────────────────────
function waitForServer(maxWaitMs = 120000) {
  writeStartupLog(`waitForServer() started. Max wait time = ${maxWaitMs}ms`);
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let isResolved = false;

    const check = () => {
      if (isResolved) return;
      writeStartupLog(`Polling server health check endpoint...`);
      const req = http.get(
        `http://localhost:${INTERNAL_PORT}/health`,
        { timeout: 2000 },
        (res) => {
          res.resume(); // Consume data to free memory/socket
          writeStartupLog(`Health check response: statusCode = ${res.statusCode}`);
          if (res.statusCode === 200) {
            isResolved = true;
            resolve(true);
          } else {
            scheduleRetry();
          }
        }
      );
      req.on('error', (err) => {
        if (isResolved) return;
        writeStartupLog(`Health check request error: ${err.message}`);
        scheduleRetry();
      });
      req.on('timeout', () => {
        if (isResolved) return;
        writeStartupLog(`Health check request timeout`);
        req.destroy();
        scheduleRetry();
      });
    };

    const scheduleRetry = () => {
      if (isResolved) return;
      if (Date.now() - startTime > maxWaitMs) {
        writeStartupLog(`ERROR: Server did not start within ${maxWaitMs / 1000} seconds`);
        isResolved = true;
        reject(new Error(`Server did not start within ${maxWaitMs / 1000} seconds`));
        return;
      }
      setTimeout(check, 1000);
    };

    check();
  });
}

// ─── Start embedded server ────────────────────────────────────────────────────
function startServer(paths, config) {
  writeStartupLog(`startServer() called. paths.serverScript = ${paths.serverScript}`);
  if (!fs.existsSync(paths.serverScript)) {
    writeStartupLog(`ERROR: Could not find server script at ${paths.serverScript}`);
    dialog.showErrorBox(
      'Installation Error',
      `Could not find the server at:\n${paths.serverScript}\n\nPlease reinstall Vishvyash ERP.`
    );
    app.quit();
    return false;
  }

  // Create user storage directories (PDFs and backups go to AppData, not install dir)
  const pdfDir    = path.join(paths.userData, 'storage', 'pdfs');
  const backupDir = path.join(paths.userData, 'storage', 'backups');
  fs.mkdirSync(pdfDir,    { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });

  const userConfigPath = path.join(paths.userData, 'app.config.json');
  const configFile = fs.existsSync(userConfigPath) ? userConfigPath : paths.appConfig;

  const serverEnv = {
    // Required
    NODE_ENV      : 'production',
    PORT          : String(INTERNAL_PORT),
    // Credentials from config (never hardcoded in source)
    DATABASE_URL  : config.DATABASE_URL  || '',
    JWT_SECRET    : config.JWT_SECRET    || '',
    JWT_EXPIRES_IN: config.JWT_EXPIRES_IN || '7d',
    CONFIG_FILE_PATH: configFile,
    STARTUP_LOG_PATH: logFile,
    PRISMA_QUERY_ENGINE_LIBRARY: paths.prismaEngine,
    // Storage paths — use AppData so they survive app updates
    PDF_DIR       : pdfDir,
    BACKUP_DIR    : backupDir,
    // Tells the server it's inside Electron
    ELECTRON_APP  : 'true',
    // System paths Node.js needs
    PATH          : process.env.PATH     || '',
    APPDATA       : process.env.APPDATA  || '',
    USERPROFILE   : process.env.USERPROFILE || '',
    SystemRoot    : process.env.SystemRoot  || '',
    TEMP          : process.env.TEMP        || '',
    TMP           : process.env.TMP         || '',
  };

  console.log('─'.repeat(60));
  console.log('Starting embedded ERP server...');
  console.log('Script :', paths.serverScript);
  console.log('Port   :', INTERNAL_PORT);
  console.log('PDFs   :', pdfDir);
  console.log('─'.repeat(60));

  const logFilePath = path.join(paths.userData, 'server.log');
  // Clear old log file
  try {
    fs.writeFileSync(logFilePath, `=== Vishvyash ERP Server Log - ${new Date().toISOString()} ===\n`);
  } catch (err) {
    console.error('Failed to initialize server log file:', err);
  }

  const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

  writeStartupLog(`Forking server child_process...`);
  serverProcess = fork(paths.serverScript, [], {
    env        : serverEnv,
    cwd        : paths.serverCwd,
    stdio      : 'pipe',
  });

  serverProcess.stdout.on('data', (d) => {
    process.stdout.write('[Server] ' + d);
    logStream.write(`[STDOUT] ${d}`);
  });
  serverProcess.stderr.on('data', (d) => {
    process.stderr.write('[Server ERR] ' + d);
    logStream.write(`[STDERR] ${d}`);
  });

  serverProcess.on('exit', (code) => {
    if (isQuitting) return;
    writeStartupLog(`ERROR: Server exited unexpectedly with code ${code}`);
    console.error('Server exited unexpectedly with code', code);
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type   : 'error',
        title  : 'Server Stopped',
        message: 'The ERP server stopped unexpectedly.\nClick Restart to relaunch, or Quit to exit.',
        buttons: ['Restart', 'Quit'],
        defaultId: 0,
      }).then(({ response }) => {
        if (response === 0) { app.relaunch(); }
        app.quit();
      });
    }
  });

  return true;
}

// ─── Splash window ────────────────────────────────────────────────────────────
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width            : 480,
    height           : 300,
    frame            : false,
    resizable        : false,
    center           : true,
    alwaysOnTop      : true,
    backgroundColor  : '#064e3b',
    webPreferences   : { nodeIntegration: false, contextIsolation: true },
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
}

// ─── Main window ──────────────────────────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width     : 1440,
    height    : 900,
    minWidth  : 1024,
    minHeight : 640,
    show      : false,
    title     : 'Vishvyash Agrotech ERP',
    icon      : path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload          : path.join(__dirname, 'preload.js'),
      nodeIntegration  : false,
      contextIsolation : true,
    },
  });

  buildMenu();

  mainWindow.once('ready-to-show', () => {
    if (splashWindow) { splashWindow.close(); splashWindow = null; }
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Open external links in system browser, not inside the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.loadURL(`http://localhost:${INTERNAL_PORT}`);
}

// ─── Application menu ─────────────────────────────────────────────────────────
function buildMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label      : 'Reload',
          accelerator: 'F5',
          click      : () => mainWindow?.reload(),
        },
        { type: 'separator' },
        {
          label      : 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click      : () => app.quit(),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(isDev ? [
          { type: 'separator' },
          { role: 'toggleDevTools', label: 'Developer Tools' },
        ] : []),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Vishvyash ERP',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type   : 'info',
              title  : 'Vishvyash Agrotech ERP',
              message: 'Vishvyash Agrotech Energy\nBiomass Briquettes — ERP v1.0.0',
              detail : 'Desktop Edition\n\nData is stored in Neon PostgreSQL cloud database.\nNo local database required.',
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);
}

// ─── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  writeStartupLog(`=======================================================`);
  writeStartupLog(`Vishvyash ERP starting up...`);
  const paths  = getPaths();
  const config = loadConfig(paths);

  // Guard: DATABASE_URL must be configured
  if (!config.DATABASE_URL) {
    writeStartupLog(`ERROR: DATABASE_URL missing from config`);
    dialog.showErrorBox(
      'Configuration Error',
      'DATABASE_URL is missing from app.config.json.\n\n' +
      'Please contact the system administrator.\n' +
      `Config location:\n${paths.appConfig}`
    );
    app.quit();
    return;
  }

  // 1. Show splash immediately
  createSplashWindow();

  // 2. Start the embedded server
  const started = startServer(paths, config);
  if (!started) return;

  // 3. Wait for server to be ready (polls /health)
  try {
    writeStartupLog(`Waiting for server to become ready...`);
    await waitForServer(120000);
    writeStartupLog(`✅ Server is ready on port ${INTERNAL_PORT}`);
  } catch (e) {
    writeStartupLog(`ERROR: waitForServer failed: ${e.message}`);
    if (splashWindow) { splashWindow.close(); }
    dialog.showErrorBox(
      'Startup Failed',
      'The ERP server failed to start in 120 seconds.\n\n' +
      'Possible causes:\n' +
      '• Cannot connect to Neon database (check internet connection)\n' +
      '• DATABASE_URL is incorrect\n\n' +
      'Please check your internet connection and try again.'
    );
    app.quit();
    return;
  }

  // 4. Open the main window — loads http://localhost:57842
  createMainWindow();
});

app.on('before-quit', () => {
  isQuitting = true;
  if (serverProcess) {
    console.log('Stopping embedded server...');
    serverProcess.kill();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
