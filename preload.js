// 预加载脚本
// 在渲染进程中安全地暴露受保护的功能
const { contextBridge } = require('electron');

// 暴露受保护的方法给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 可以在这里添加需要暴露给渲染进程的 API
  platform: process.platform,
  versions: process.versions
});

