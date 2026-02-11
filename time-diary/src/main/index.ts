import { app, shell, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, nativeImage, net } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import Store from 'electron-store'

interface TimeEntry {
  id: string
  title: string
  startTime: number
  endTime?: number
  mood?: 'focus' | 'neutral' | 'tired'
  description?: string
}

interface AIConfig {
  apiKey: string
  baseURL: string
  model: string
}

const store = new Store<{ entries: TimeEntry[]; aiConfig: AIConfig }>({
  defaults: {
    entries: [],
    aiConfig: {
      apiKey: '',
      baseURL: 'https://api.openai.com/v1',
      model: 'gpt-3.5-turbo'
    }
  }
})

let mainWindow: BrowserWindow | null = null
let floatingWindow: BrowserWindow | null = null
let tray: Tray | null = null

let isAppQuitting = false

function createFloatingWindow(): void {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    return
  }

  floatingWindow = new BrowserWindow({
    width: 320,
    height: 140,
    frame: false,
    resizable: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    floatingWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/index.html?mode=floating')
  } else {
    floatingWindow.loadFile(join(__dirname, '../renderer/index.html'), { search: 'mode=floating' })
  }
}

function createTray(): void {
  const iconImage = nativeImage.createFromPath(icon)
  tray = new Tray(iconImage)
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Show Time Diary', 
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      } 
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        isAppQuitting = true
        app.quit()
      } 
    }
  ])

  tray.setToolTip('Time Diary')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })
}

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  // Prevent closing, hide to tray instead
  mainWindow.on('close', (event) => {
    if (!isAppQuitting) {
      event.preventDefault()
      if (!floatingWindow || floatingWindow.isDestroyed()) {
        createFloatingWindow()
      }
      floatingWindow?.show()
      mainWindow!.hide()
      return false
    }
    return true
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  
  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  function broadcastUpdate() {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('entries-updated')
    })
  }

  ipcMain.on('switch-to-floating', () => {
    if (!floatingWindow || floatingWindow.isDestroyed()) {
      createFloatingWindow()
    }
    floatingWindow?.show()
    mainWindow?.hide()
  })

  ipcMain.on('switch-to-main', () => {
    mainWindow?.show()
    floatingWindow?.hide()
  })

  // Time Diary IPC Handlers
  ipcMain.handle('get-entries', () => {
    return store.get('entries')
  })

  ipcMain.handle('add-entry', (_, entry: TimeEntry) => {
    const entries = store.get('entries')
    store.set('entries', [...entries, entry])
    broadcastUpdate()
    return true
  })

  ipcMain.handle('update-entry', (_, updatedEntry: TimeEntry) => {
    const entries = store.get('entries')
    const index = entries.findIndex((e) => e.id === updatedEntry.id)
    if (index !== -1) {
      entries[index] = updatedEntry
      store.set('entries', entries)
      broadcastUpdate()
      return true
    }
    return false
  })

  ipcMain.handle('delete-entry', (_, id: string) => {
    const entries = store.get('entries')
    store.set('entries', entries.filter((e) => e.id !== id))
    broadcastUpdate()
    return true
  })

  // AI Configuration IPC Handlers
  ipcMain.handle('get-ai-config', () => {
    return store.get('aiConfig')
  })

  ipcMain.handle('save-ai-config', (_, config: AIConfig) => {
    store.set('aiConfig', config)
    return true
  })

  // AI Completion Handler
  ipcMain.handle('generate-diary', async (_, { prompt }: { prompt: string }) => {
    const config = store.get('aiConfig')
    if (!config.apiKey) {
      throw new Error('API Key is missing')
    }

    const requestBody = JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that summarizes daily activities into a reflective diary.' },
        { role: 'user', content: prompt }
      ]
    })

    return new Promise((resolve, reject) => {
      const request = net.request({
        method: 'POST',
        url: `${config.baseURL}/chat/completions`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        }
      })

      request.on('response', (response) => {
        let data = ''
        response.on('data', (chunk) => {
          data += chunk.toString()
        })
        response.on('end', () => {
          if (response.statusCode === 200) {
            try {
              const result = JSON.parse(data)
              const content = result.choices[0]?.message?.content || ''
              resolve(content)
            } catch (e) {
              reject(new Error('Failed to parse AI response'))
            }
          } else {
            reject(new Error(`AI Request failed with status ${response.statusCode}: ${data}`))
          }
        })
      })

      request.on('error', (error) => {
        reject(error)
      })

      request.write(requestBody)
      request.end()
    })
  })

  createTray()
  createWindow()

  // Register Global Shortcut
  const ret = globalShortcut.register('Alt+J', () => {
    console.log('Alt+J pressed')
    if (mainWindow) {
      if (mainWindow.isVisible() && mainWindow.isFocused()) {
        console.log('Hiding window')
        mainWindow.hide()
      } else {
        console.log('Showing window')
        mainWindow.show()
        mainWindow.focus()
      }
    } else {
      console.log('mainWindow is null')
    }
  })

  if (!ret) {
    console.log('registration failed')
  }

  // Check if shortcut is registered
  console.log('Alt+J registered:', globalShortcut.isRegistered('Alt+J'))

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else mainWindow?.show()
  })
})

app.on('before-quit', () => {
  isAppQuitting = true
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // For this app, we want to stay in tray even if window is closed (hidden)
    // So we don't quit here unless isAppQuitting is true
    // But window-all-closed might not fire if we preventDefault in 'close'
    // So this is mostly fallback
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
