const electron = require('electron')
const path = require('path')
const url = require('url')
const { app, ipcMain } = electron
const { isPackaged } = app
const { BrowserWindow } = electron

const installDevtools = require('./devtools')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

// have to do it this to access ffmpeg path from within webpack bundle
const ffmpegStaticBasePath = require('ffmpeg-static').path
const ffprobeStaticBasePath = require('ffprobe-static').path
const getFfmpegStaticPath = basePath =>
  basePath.replace('app.asar', 'app.asar.unpacked') // won't do anything in development

global.ffmpegpath = getFfmpegStaticPath(ffmpegStaticBasePath)
global.ffprobepath = getFfmpegStaticPath(ffprobeStaticBasePath)

async function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: { webSecurity: isPackaged },
  })

  // and load the index.html of the app.
  mainWindow.loadURL(
    isPackaged
      ? url.format({
          pathname: path.join(__dirname, 'build', 'index.html'),
          protocol: 'file',
          slashes: 'true',
        })
      : 'http://localhost:3000'
  )

  // if (!isPackaged) {
  await installDevtools()

  // mainWindow.webContents.openDevTools()
  // }

  mainWindow.on('close', e => {
    if (mainWindow) {
      e.preventDefault()
      mainWindow.webContents.send('app-close')
    }
  })

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow()

  // Register a 'CommandOrControl+X' shortcut listener.
  const ret = electron.globalShortcut.register('CommandOrControl+K', () => {
    electron.BrowserWindow.getFocusedWindow().webContents.openDevTools()
  })

  if (!ret) {
    console.log('registration failed')
  }

  // Check whether a shortcut is registered.
  console.log(electron.globalShortcut.isRegistered('CommandOrControl+K'))
})

app.on('will-quit', () => {
  // Unregister a shortcut.
  electron.globalShortcut.unregister('CommandOrControl+K')

  // Unregister all shortcuts.
  electron.globalShortcut.unregisterAll()
})

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function() {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.on('closed', function() {
  mainWindow = null
  app.quit()
})
