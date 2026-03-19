const { app, BrowserWindow, session, systemPreferences, shell } = require('electron');

// Windows Squirrel installer events
if (process.platform === 'win32') {
  try {
    if (require('electron-squirrel-startup')) { app.quit(); }
  } catch (e) { /* paket yoksa devam et */ }
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'NatureCo',
    icon: __dirname + '/icon.png',
    show: false,
    backgroundColor: '#0F172A',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: 'persist:natureco'
    }
  });

  // Tüm izinleri otomatik ver
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });
  session.defaultSession.setPermissionCheckHandler(() => true);

  // Harici linkleri sistem browser'ında aç
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith('https://natureco.me') && !url.startsWith('http://localhost')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.setMenuBarVisibility(false);

  // Yükleme başarısız olursa yine de pencereyi göster
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Load failed:', errorCode, errorDescription);
    mainWindow.show();
    // Offline fallback sayfası göster
    mainWindow.webContents.loadURL(`data:text/html;charset=utf-8,
      <html style="background:#0F172A;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
      <div style="text-align:center">
        <div style="font-size:48px;margin-bottom:16px">🌿</div>
        <h2 style="margin:0 0 8px">NatureCo</h2>
        <p style="color:#6b7280;margin:0 0 24px">Bağlantı kurulamadı. İnternet bağlantınızı kontrol edin.</p>
        <button onclick="location.reload()" style="background:#10B981;color:#fff;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-size:14px">Yeniden Dene</button>
      </div></html>
    `);
  });

  // Hazır olunca göster — 10 saniye timeout fallback
  let shown = false;
  const showFallback = setTimeout(() => {
    if (!shown) { shown = true; mainWindow.show(); }
  }, 10000);

  mainWindow.once('ready-to-show', () => {
    clearTimeout(showFallback);
    if (!shown) { shown = true; mainWindow.show(); }
  });

  mainWindow.loadURL('https://natureco.me/chat');
}

app.whenReady().then(async () => {
  if (process.platform === 'darwin') {
    try {
      await systemPreferences.askForMediaAccess('camera');
      await systemPreferences.askForMediaAccess('microphone');
    } catch (e) { /* izin isteği başarısız olsa da devam et */ }
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
