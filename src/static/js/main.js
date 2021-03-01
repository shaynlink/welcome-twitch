const { ipcRenderer } = require('electron');
const msg = document.getElementById('message');
const progress = document.getElementById('pg');

ipcRenderer.on('load-message', (channel, message) => {
    console.log('[DEBUG - load] ' + message);
    const raw = message.split('.');
    const value = raw.shift();
    const _msg = raw.join('.');

    msg.innerHTML = _msg;
    progress.value = parseInt(value);
});

ipcRenderer.on('auth', (channel, message) => {
    if (message.type == 'SAVETOKEN') {
        window.localStorage.setItem('auth', JSON.stringify(message.data));
    };
    if (message.type == 'SAVEDATA') {
        window.localStorage.setItem('data', JSON.stringify(message.data));
    };

    if (message.type == 'SAVESETTINGS') {
        
    };
    console.log(message);
});

ipcRenderer.send('load-message', 'ready');

ipcRenderer.send('auth', {
    token: window.localStorage.getItem('auth'),
    data: window.localStorage.getItem('data'),
    settings: window.localStorage.getItem('settings'),
});