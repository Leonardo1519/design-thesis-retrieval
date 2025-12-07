// 预加载脚本
// 在渲染进程中安全地暴露受保护的功能
const { contextBridge, ipcRenderer } = require('electron');

// 暴露受保护的方法给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 可以在这里添加需要暴露给渲染进程的 API
  platform: process.platform,
  versions: process.versions,
  savePapers: (payload) => ipcRenderer.invoke('data:save-papers', payload),
  getDataDirectory: () => ipcRenderer.invoke('data:get-directory'),
  pickDataDirectory: () => ipcRenderer.invoke('data:pick-directory'),
  getDownloadDirectory: () => ipcRenderer.invoke('downloads:get-directory'),
  pickDownloadDirectory: () => ipcRenderer.invoke('downloads:pick-directory'),
  downloadPapers: (payload) => ipcRenderer.invoke('downloads:download-papers', payload)
});

