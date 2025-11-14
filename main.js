const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  // The size you LIKE it to start at
  const BASE_WIDTH  = 200;
  const BASE_HEIGHT = 360;

  // The absolute smallest you’ll allow it to shrink
  const MIN_WIDTH  = 150;   // go smaller if you want
  const MIN_HEIGHT = 330;

  const win = new BrowserWindow({
    width: BASE_WIDTH,       // start size
    height: BASE_HEIGHT,
    useContentSize: true,

    minWidth: MIN_WIDTH,     // <= allow shrinking further
    minHeight: MIN_HEIGHT,
    maxWidth: 900,
    maxHeight: 1200,

    resizable: true,
    backgroundColor: "#171a21",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Aspect ratio based on the "normal" shape
  win.setAspectRatio(BASE_WIDTH / BASE_HEIGHT);

  win.loadFile("index.html");
}

app.whenReady().then(createWindow);
