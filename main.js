"use strict";
var electron = require('electron');
var app = electron.app;
var BrowserWindow = electron.BrowserWindow;
var mainWindow = null;
app.on('window-all-closed', function () {
    app.quit();
});
app.on('ready', function () {
    mainWindow = new BrowserWindow({
        width: 1500,
        height: 800
    });
    mainWindow.loadURL("file://" + __dirname + "/index.html");
    mainWindow.webContents.openDevTools();
    mainWindow.on('closed', function () {
        mainWindow = null;
        console.log("main window closed");
    });
});
