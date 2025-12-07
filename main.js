const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const http = require('http');
const https = require('https');

const DATA_CONFIG_FILE = 'data-path.txt';
const DOWNLOAD_CONFIG_FILE = 'download-path.txt';
const DATA_ROOT_NAME = 'DesignThesisRetrieval';
const DATA_SUB_DIR = 'data';
const DOWNLOAD_SUB_DIR = 'downloads';

let mainWindow = null;

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

const sanitizeFileName = (name, fallbackPrefix = 'search') => {
  return (
    (name || '')
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
      .trim() || `${fallbackPrefix}-${Date.now()}`
  );
};

const buildPaperKey = (paper = {}) => {
  if (paper.id) {
    return paper.id;
  }
  const title = paper.title || 'untitled';
  const published = paper.published || '';
  return `${title}::${published}`;
};

const ensureDirPathWithSuffix = (inputPath, suffix) => {
  if (!inputPath || typeof inputPath !== 'string') {
    return '';
  }
  let normalized = path.normalize(inputPath.trim());
  if (!normalized) {
    return '';
  }

  // 移除末尾的分隔符
  while (normalized.length > 1 && (normalized.endsWith(path.sep) || normalized.endsWith(path.posix.sep))) {
    normalized = normalized.slice(0, -1);
  }

  const lowerNormalized = normalized.toLowerCase();
  const primarySuffix = `${path.sep}${suffix}`.toLowerCase();
  const secondarySuffix = `${path.posix.sep}${suffix}`.toLowerCase();

  if (lowerNormalized.endsWith(primarySuffix) || lowerNormalized.endsWith(secondarySuffix)) {
    return normalized;
  }

  return path.join(normalized, suffix);
};

const ensureDataDirPath = (inputPath) => {
  return ensureDirPathWithSuffix(inputPath, DATA_SUB_DIR);
};

const ensureDownloadDirPath = (inputPath) => {
  return ensureDirPathWithSuffix(inputPath, DOWNLOAD_SUB_DIR);
};

const MAX_DOWNLOAD_REDIRECTS = 5;

const downloadFile = (fileUrl, destinationPath, redirectCount = 0) => {
  return new Promise((resolve, reject) => {
    if (!fileUrl) {
      reject(new Error('无效的下载链接'));
      return;
    }
    let parsedUrl;
    try {
      parsedUrl = new URL(fileUrl);
    } catch (error) {
      reject(new Error('无效的下载链接'));
      return;
    }

    const protocol = parsedUrl.protocol === 'http:' ? http : https;
    const request = protocol.get(parsedUrl, (response) => {
      if (
        response.statusCode &&
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        if (redirectCount >= MAX_DOWNLOAD_REDIRECTS) {
          response.resume();
          reject(new Error('下载重定向次数过多'));
          return;
        }
        const redirectedUrl = new URL(response.headers.location, parsedUrl).toString();
        response.resume();
        downloadFile(redirectedUrl, destinationPath, redirectCount + 1)
          .then(resolve)
          .catch(reject);
        return;
        }

      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`下载失败，状态码 ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(destinationPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close(() => resolve(destinationPath));
      });

      const cleanupOnError = async (error) => {
        try {
          await fsp.unlink(destinationPath);
        } catch (_) {
          // ignore cleanup error
        }
        reject(error);
      };

      response.on('error', cleanupOnError);
      fileStream.on('error', cleanupOnError);
    });

    request.on('error', (error) => reject(error));
  });
};

const ensureUniqueFilePath = async (directory, fileName) => {
  const ext = path.extname(fileName) || '.pdf';
  const baseName = path.basename(fileName, ext);
  let counter = 1;
  let candidate = `${baseName}${ext}`;

  while (await fileExists(path.join(directory, candidate))) {
    candidate = `${baseName}-${counter}${ext}`;
    counter += 1;
  }

  return path.join(directory, candidate);
};

const buildDownloadFileName = (item = {}) => {
  const candidates = [item.title, item.id, item.rowKey];
  let sanitized = '';
  for (const raw of candidates) {
    const candidate = (raw || '').trim();
    if (!candidate) {
      continue;
    }
    sanitized = sanitizeFileName(candidate, 'paper');
    if (sanitized) {
      break;
    }
  }

  if (!sanitized) {
    sanitized = sanitizeFileName('', 'paper');
  }

  if (!sanitized.toLowerCase().endsWith('.pdf')) {
    sanitized = `${sanitized}.pdf`;
  }

  return sanitized;
};

const getDefaultDataDir = () => {
  if (!app.isPackaged) {
    return path.join(__dirname, DATA_SUB_DIR);
  }
  const documentsDir = app.getPath('documents') || app.getPath('downloads');
  const baseDir = path.join(documentsDir, DATA_ROOT_NAME);
  return ensureDataDirPath(baseDir);
};

const getDefaultDownloadDir = () => {
  if (!app.isPackaged) {
    return path.join(__dirname, DOWNLOAD_SUB_DIR);
  }
  const documentsDir = app.getPath('documents') || app.getPath('downloads');
  const baseDir = path.join(documentsDir, DATA_ROOT_NAME);
  return ensureDownloadDirPath(baseDir);
};

const getConfigFilePath = () => {
  return path.join(app.getPath('userData'), DATA_CONFIG_FILE);
};

const getDownloadConfigFilePath = () => {
  return path.join(app.getPath('userData'), DOWNLOAD_CONFIG_FILE);
};

const ensureDirectory = async (targetPath) => {
  await fsp.mkdir(targetPath, { recursive: true });
};

const fileExists = async (targetPath) => {
  try {
    await fsp.access(targetPath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const writeDataConfigPath = async (dir) => {
  const configPath = getConfigFilePath();
  await fsp.mkdir(path.dirname(configPath), { recursive: true });
  await fsp.writeFile(configPath, dir, 'utf8');
};

const writeDownloadConfigPath = async (dir) => {
  const configPath = getDownloadConfigFilePath();
  await fsp.mkdir(path.dirname(configPath), { recursive: true });
  await fsp.writeFile(configPath, dir, 'utf8');
};

const updateDataDirectory = async (targetPath) => {
  const sanitized = ensureDataDirPath(targetPath);
  if (!sanitized) {
    throw new Error('无效的 data 路径');
  }
  await ensureDirectory(sanitized);
  await writeDataConfigPath(sanitized);
  return sanitized;
};

const updateDownloadDirectory = async (targetPath) => {
  const sanitized = ensureDownloadDirPath(targetPath);
  if (!sanitized) {
    throw new Error('无效的下载路径');
  }
  await ensureDirectory(sanitized);
  await writeDownloadConfigPath(sanitized);
  return sanitized;
};

const resolveDataDirectory = async () => {
  const configPath = getConfigFilePath();
  if (await fileExists(configPath)) {
    try {
      const raw = await fsp.readFile(configPath, 'utf8');
      const trimmed = raw.trim();
      if (trimmed) {
        const resolvedPath = ensureDataDirPath(trimmed);
        if (resolvedPath) {
          await ensureDirectory(resolvedPath);
          if (resolvedPath !== trimmed) {
            try {
              await writeDataConfigPath(resolvedPath);
            } catch (writeError) {
              console.warn('更新 data 路径配置失败:', writeError);
            }
          }
          return resolvedPath;
        }
      }
    } catch (error) {
      console.error('读取 data 路径失败:', error);
    }
  }

  const fallback = getDefaultDataDir();
  await ensureDirectory(fallback);

  try {
    await writeDataConfigPath(fallback);
  } catch (error) {
    console.warn('写入默认 data 路径失败:', error);
  }

  return fallback;
};

const resolveDownloadDirectory = async () => {
  const configPath = getDownloadConfigFilePath();
  if (await fileExists(configPath)) {
    try {
      const raw = await fsp.readFile(configPath, 'utf8');
      const trimmed = raw.trim();
      if (trimmed) {
        const resolvedPath = ensureDownloadDirPath(trimmed);
        if (resolvedPath) {
          await ensureDirectory(resolvedPath);
          if (resolvedPath !== trimmed) {
            try {
              await writeDownloadConfigPath(resolvedPath);
            } catch (writeError) {
              console.warn('更新下载路径配置失败:', writeError);
            }
          }
          return resolvedPath;
        }
      }
    } catch (error) {
      console.error('读取下载路径失败:', error);
    }
  }

  const fallback = getDefaultDownloadDir();
  await ensureDirectory(fallback);

  try {
    await writeDownloadConfigPath(fallback);
  } catch (error) {
    console.warn('写入默认下载路径失败:', error);
  }

  return fallback;
};

let dataHandlersRegistered = false;

const registerDataHandlers = () => {
  if (dataHandlersRegistered) {
    return;
  }
  dataHandlersRegistered = true;

  ipcMain.handle('data:get-directory', async () => {
    try {
      const dir = await resolveDataDirectory();
      return { success: true, path: dir };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('data:save-papers', async (_event, payload = {}) => {
    try {
      const { searchName, searchType, query, maxResults, papers } = payload;

      if (!searchName || !Array.isArray(papers)) {
        return { success: false, error: '无效的入参：缺少搜索名称或论文数据。' };
      }

      const dir = await resolveDataDirectory();
      const safeFileName = `${sanitizeFileName(searchName)}.json`;
      const filePath = path.join(dir, safeFileName);

      let existingPapers = [];
      if (await fileExists(filePath)) {
        try {
          const raw = await fsp.readFile(filePath, 'utf8');
          const parsed = JSON.parse(raw);
          existingPapers = Array.isArray(parsed.papers) ? parsed.papers : [];
        } catch (error) {
          console.warn(`读取 ${filePath} 失败，将覆盖写入:`, error);
        }
      }

      const paperMap = new Map();
      existingPapers.forEach((paper) => {
        if (!paper) {
          return;
        }
        const key = buildPaperKey(paper);
        if (key) {
          paperMap.set(key, paper);
        }
      });

      let newCount = 0;
      const now = new Date().toISOString();
      papers.forEach((paper) => {
        if (!paper) {
          return;
        }
        const key = buildPaperKey(paper);
        if (!key || paperMap.has(key)) {
          return;
        }
        const record = {
          ...paper,
          recordCreatedAt: now
        };
        paperMap.set(key, record);
        newCount += 1;
      });

      const mergedPapers = Array.from(paperMap.values());
      const payloadToSave = {
        searchName,
        searchType,
        query,
        maxResults,
        updatedAt: now,
        paperCount: mergedPapers.length,
        papers: mergedPapers
      };

      await fsp.writeFile(filePath, JSON.stringify(payloadToSave, null, 2), 'utf8');

      return {
        success: true,
        filePath,
        newCount,
        total: mergedPapers.length
      };
    } catch (error) {
      console.error('保存论文数据失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('data:pick-directory', async () => {
    try {
      const currentDir = await resolveDataDirectory();
      const window = BrowserWindow.getFocusedWindow() || mainWindow;
      const result = await dialog.showOpenDialog(window, {
        title: '选择 data 文件夹存放路径',
        defaultPath: currentDir ? path.dirname(currentDir) : undefined,
        properties: ['openDirectory', 'createDirectory']
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, cancelled: true };
      }

      const selectedPath = result.filePaths[0];
      const updatedPath = await updateDataDirectory(selectedPath);
      return { success: true, path: updatedPath };
    } catch (error) {
      console.error('更新 data 路径失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('downloads:get-directory', async () => {
    try {
      const dir = await resolveDownloadDirectory();
      return { success: true, path: dir };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('downloads:pick-directory', async () => {
    try {
      const currentDir = await resolveDownloadDirectory();
      const window = BrowserWindow.getFocusedWindow() || mainWindow;
      const result = await dialog.showOpenDialog(window, {
        title: '选择论文下载存放路径',
        defaultPath: currentDir ? path.dirname(currentDir) : undefined,
        properties: ['openDirectory', 'createDirectory']
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, cancelled: true };
      }

      const selectedPath = result.filePaths[0];
      const updatedPath = await updateDownloadDirectory(selectedPath);
      return { success: true, path: updatedPath };
    } catch (error) {
      console.error('更新下载路径失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('downloads:download-papers', async (_event, payload = {}) => {
    try {
      const items = Array.isArray(payload.items) ? payload.items : [];
      if (items.length === 0) {
        return { success: false, error: '未提供需要下载的论文' };
      }

      const directory = await resolveDownloadDirectory();
      if (!directory) {
        return { success: false, error: '下载路径尚未配置' };
      }
      await ensureDirectory(directory);

      const downloaded = [];
      const failed = [];

      for (const item of items) {
        const { downloadUrl, id, title, rowKey } = item || {};
        if (!downloadUrl) {
          failed.push({
            id,
            title,
            rowKey,
            error: '缺少下载链接'
          });
          continue;
        }

        try {
          const fileName = buildDownloadFileName(item);
          const destinationPath = await ensureUniqueFilePath(directory, fileName);
          await downloadFile(downloadUrl, destinationPath);
          downloaded.push({
            id,
            title,
            rowKey,
            filePath: destinationPath
          });
        } catch (error) {
          failed.push({
            id,
            title,
            rowKey,
            error: error.message || '下载失败'
          });
        }
      }

      return {
        success: failed.length === 0,
        directory,
        downloaded,
        failed
      };
    } catch (error) {
      console.error('批量下载论文失败:', error);
      return { success: false, error: error.message };
    }
  });
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // 开发环境下自动打开开发者工具（已禁用）
  // if (isDev) {
  //   mainWindow.webContents.openDevTools();
  // }
}

app.whenReady().then(() => {
  registerDataHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    mainWindow = null;
    app.quit();
  }
});

