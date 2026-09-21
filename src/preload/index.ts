import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('disco', {
  platform: process.platform,
  version: '0.1.0'
})
