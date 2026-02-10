import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getEntries: () => ipcRenderer.invoke('get-entries'),
  addEntry: (entry: any) => ipcRenderer.invoke('add-entry', entry),
  updateEntry: (entry: any) => ipcRenderer.invoke('update-entry', entry),
  deleteEntry: (id: string) => ipcRenderer.invoke('delete-entry', id),
  getAIConfig: () => ipcRenderer.invoke('get-ai-config'),
  saveAIConfig: (config: any) => ipcRenderer.invoke('save-ai-config', config),
  generateDiary: (prompt: string) => ipcRenderer.invoke('generate-diary', { prompt }),
  switchToFloating: () => ipcRenderer.send('switch-to-floating'),
  switchToMain: () => ipcRenderer.send('switch-to-main'),
  onEntriesUpdated: (callback: () => void) => {
    const subscription = (_event: any) => callback()
    ipcRenderer.on('entries-updated', subscription)
    return () => ipcRenderer.removeListener('entries-updated', subscription)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
