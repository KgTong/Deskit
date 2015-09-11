var menubar = require('menubar');
var clipboard = require('clipboard');
var ipc = require('ipc');
var dialog = require('dialog');
var path = require('path');
var sound = require("mac-sounds");
var tray = path.join(__dirname, 'assets', 'osx', 'trayTemplate.png');
var trayActive = path.join(__dirname, 'assets', 'osx', 'tray-active.png');
var globalShortcut = require('global-shortcut');
var pkg = require('./package');
var notifier = require('node-notifier');

var mb = menubar({
  dir: __dirname,
  index: 'file://' + path.join(__dirname, 'main.html'),
  icon: tray,
  preloadWindow: true,
  width: 340,
  height: 300,
  y: 30,
  transparent: true,
  resizable: false
});

var app = mb.app;

mb.on('ready', function() {
  console.log('app is ready');
  var appIcon = mb.tray;
  appIcon.setHighlightMode(false);
  mb.on('show', function() {
    mb.window.webContents.send('show');
    appIcon.setImage(trayActive);
  });
  mb.on('hide', function() {
    mb.window.webContents.send('hide');
    appIcon.setImage(tray);
  });
  globalShortcut.register('cmd+shift+5', qrcodeHandler);

  appIcon.setToolTip(pkg.description + ' - ' + pkg.version);
});

ipc.on('qrcode', qrcodeHandler);

function qrcodeHandler() {
  // 首先获得粘贴板中的数据
  if (clipboard.readText() && clipboard.readText().length > 0) {
    // 做一次字符转换，因为qrcode不支持中文
    var url = utf16to8(clipboard.readText());
    mb.window.webContents.send('generateQrcode', url);
  }
}

function captureHandler() {
  mb.window.webContents.send('hide');
  upload([], {
    capture: true
  }, function() {
    mb.window.webContents.send('show');
  });
}

function upload(files, options, callback) {
  //mb.window.webContents.send('uploading');
  return cdn(files, options).then(function(urls) {
    if (typeof urls === 'string') {
      urls = [urls];
    }
    sound('glass');
    mb.window.webContents.send('uploaded', urls);
    if (!mb.window.isVisible()) {
      notifier.notify({
        title: urls.length + '个文件上传成功！',
        icon: urls[0],
        message: '地址已复制到剪切板：' + urls.join(' ')
      });
    }
  }).catch(function(e) {
    var msg;
    if (typeof e.code === 'string') {
      msg = e.code;
    } else {
      msg = e.toString();
    }
    mb.window.webContents.send('upload-failed', msg);
  }).finally(function() {
    callback && callback();
  });
}

// qrcode只支持英文，需要对中文进行一下转义
function utf16to8(str) {  
    var out, i, len, c;  
    out = "";  
    len = str.length;  
    for(i = 0; i < len; i++) {  
    c = str.charCodeAt(i);  
    if ((c >= 0x0001) && (c <= 0x007F)) {  
        out += str.charAt(i);  
    } else if (c > 0x07FF) {  
        out += String.fromCharCode(0xE0 | ((c >> 12) & 0x0F));  
        out += String.fromCharCode(0x80 | ((c >>  6) & 0x3F));  
        out += String.fromCharCode(0x80 | ((c >>  0) & 0x3F));  
    } else {  
        out += String.fromCharCode(0xC0 | ((c >>  6) & 0x1F));  
        out += String.fromCharCode(0x80 | ((c >>  0) & 0x3F));  
    }  
    }  
    return out;  
}