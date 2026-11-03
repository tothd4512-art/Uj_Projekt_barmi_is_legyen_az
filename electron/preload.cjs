const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('buildMuhely', {
  isDesktop: true,
  platform: process.platform,
});
