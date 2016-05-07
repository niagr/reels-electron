import * as electron from 'electron';

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

let mainWindow: Electron.BrowserWindow = null;

app.on('window-all-closed', () => {
    app.quit();
});

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 1500,
        height: 800
    });
    mainWindow.loadURL(`file://${__dirname}/index.html`);
    mainWindow.webContents.openDevTools();
    mainWindow.on('closed', () => {
        mainWindow = null;
        console.log(`main window closed`);
    });
});