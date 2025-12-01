const { app, BrowserWindow } = require('electron');
const path = require('path');

// 开发模式检测
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// 开发模式下启用热重载
if (isDev) {
  try {
    require('electron-reload')(__dirname, {
      // electron-reload 会自动找到 electron 可执行文件
      hardResetMethod: 'exit',
      // 忽略 node_modules 和隐藏文件
      ignored: /node_modules|[\/\\]\./,
      // 监听所有文件变化
      watchRenderer: true,
    });
    console.log('✅ 热重载已启用 - 修改文件后会自动刷新');
  } catch (err) {
    console.log('⚠️ 热重载加载失败:', err);
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');
  
  // 开发环境下自动打开开发者工具
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

