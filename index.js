'use strict';

const console = require('console');
const { app, BrowserWindow, ipcMain } = require('electron');
const process = require('process');
const express = require('express');
const http = require('http');
const childProcess = require('child_process');
const fs = require('fs');
const WebSocket = require('ws');
const axios = require('axios');
const Util = require('./src/util/util');
const {resolve, join} = require('path');
const { response } = require('express');

let window = {setProgressBar: () => {}};
let message = '1.Chargement du serveur 127.0.0.1:1757';
let server;
let ws;
let auth = null;
let userData;

let channel = {reply: () => {}};
let authChan;
let msgChan;

const port = 1757;
const state = Math.floor(Math.random() * 10e10);
const botID = 'mgzu7y11e2kszl1zrpam37emkmgt03';
const codeFlow = `https://id.twitch.tv/oauth2/authorize?client_id=${botID}&redirect_uri=http://localhost:${port}/callback&response_type=token&scope=chat:read&force_verify=true&state=${state}`;

const settings = {
    worlds: [...Util.worlds()],
};

const setMessage = (msg, chan = channel, value) => {
    message = msg;

    chan ? chan.reply('load-message', msg) : null;
};

// Server
const router = express();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.get('/test', (req, res) => {
    return res.status(200).json({message: 'bump'});
});

router.get('/callback', (req, res) => {
    setMessage('4.Traitement des données', channel);
    window.setProgressBar(4/8);

    res.setHeader('Content-Type', 'text/html; charset=utf8');

    let cb = fs.readFileSync('./src/lib/callback.html', {encoding: 'utf8'});
    cb = cb.replace(/{{PORT}}/g, port);

    return res.status(200).end(cb);
});

router.get('/hash', (req, res) => {
    if (!req.query.content) return res.status(400).end();
    const hash = Object.fromEntries(decodeURIComponent(req.query.content).split('&').map((v) => v.split('=')));

    // avoid CSRF attacks
    if (hash.state != state) {
        console.log('Bad state');
        return res.status(400).end();
    } else res.status(200).end();

    authChan.reply('auth', {type: 'SAVETOKEN', data: hash});

    auth = hash;

    connectTwith();
});

function createWindow() {
    let win = new BrowserWindow({
        width: 1350,
        minWidth: 720,
        height: 660,
        minHeight: 400,
        webPreferences: {
            nodeIntegration: true,
        },
        show: false,
        backgroundColor: '#202C33',
        autoHideMenuBar: true,
        darkTheme: true,
        titleBarStyle: 'customButtonsOnHover',
        title: 'Welcome Twitch',
        icon: resolve('welcometwitch.ico'),
    });

    win.once('ready-to-show', () => {
        win.show();
    });

    win.setProgressBar(1/8);

    win.loadFile('./src/view/home.html');

    return win;
};

let tries = 0;

async function connectTwith() {
    tries++;
    if (tries > 5) {
        app.quit();
        throw TypeError('Cannot make connection with twitch');
    };

    if (ws && (ws.readyState == ws.OPEN || ws.readyState == ws.CONNECTING)) {
        ws.close();
    };

    setMessage('5.Récupération des données nécessaire', channel);
    window.setProgressBar(5/8);
    
    if (!userData) {
        userData = await axios({
            url: 'https://api.twitch.tv/helix/users',
            method: 'GET',
            headers: {
                'Client-Id': botID,
                'Authorization': 'Bearer ' + auth.access_token,
            },
        }).then((response) => response.data.data[0]).catch((er) => er);

        if (userData instanceof Error) {
            authChan.reply('auth', {type: 'DELETEALL'});
            app.relaunch({ args: process.argv.slice(1).concat(['--relaunch']) });
            return app.exit(0);
        };

        authChan.reply('auth', {type: 'SAVEDATA', data: userData});
    };
    
    setMessage('6.Connexion avec Twitch', channel);
    window.setProgressBar(6/8);
    
    ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

    const wssend = (msg) => {
        console.log('[CLIENT] %s', msg);
        ws.send(msg);
    };

    ws.on('open', () => {
        console.log('WS connected');
        setMessage('7.Authentification du bot avec Twitch');
        window.setProgressBar(7/8);
        wssend(`PASS oauth:${auth.access_token}`);
        wssend(`NICK ${userData.login.trim().toLowerCase()}`);
    });

    ws.on('error', (err) => {
        if (ws && (ws.readyState == ws.OPEN || ws.readyState == ws.CONNECTING)) {
            ws.close();
        };
        setTimeout(() => {connectTwith()}, 5000);
    });

    ws.on('close', (code, reason) => {
        if (ws && (ws.readyState == ws.OPEN || ws.readyState == ws.CONNECTING)) {
            ws.close();
        };
        setTimeout(() => {connectTwith()}, 5000);
    });

    const usr = userData.login.trim().toLowerCase();

    ws.on('message', (message) => {
        const group = message.trim().split('\n');
        
        group.forEach((msg) => {
            console.log('[SERVER] %s', msg);
            msg = msg.trim().split(' ');
    
            const cmd = msg.shift();
    
            if (cmd == ':tmi.twitch.tv') {
                const id = msg.shift();

                switch (id) {
                    case '001':
                    case '002':
                    case '003':
                    case '004':
                    case '375':
                    case '372':
                    case 'CAP':
                        break;
                    case '376':
                        wssend('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
                        wssend(`:${usr}!${usr}@${usr}.tmi.twitch.tv JOIN #${usr}`)
                        setMessage('8.Finis !', channel);
                        window.setProgressBar(8/8);
                        setTimeout(() => {
                            window.setProgressBar(-1);
                            return window.loadFile('./src/view/index.html');
                        }, 500);
                        break;
                    default:
                        console.log('unknown %s - %s', id, msg);
                        break;
                };

                return;
            };
    
            if (cmd == 'PING') {
                return wssend('PONG :tmi.twitch.tv');
            };

            if (cmd == `:${usr}!${usr}@${usr}.tmi.twitch.tv`) {
                const subcmd = msg.shift();

                switch (subcmd) {
                    case 'JOIN':
                        break;
                };

                return;
            };

            if (cmd == `:${usr}.tmi.twitch.tv`) return;

            if (['PART', 'JOIN'].includes(msg[0])) return;

            if (msg[0].trim().toLowerCase().includes('tmi.twitch.tv')) {
                const subcmd = msg[1];
                
                switch (subcmd) {
                    case 'USERSTATE':
                    case 'ROOMSTATE':
                        break;
                    case 'PRIVMSG':
                            const data = Object.fromEntries(cmd.split(';').map((_r) => _r.split('=')));

                            const _msg = msg.join(' ').split(':').pop();
                            msgChan.reply('msg', {
                                hasHello: Util.hashello(_msg, settings.worlds),
                                color: data.color,
                                username: data['display-name'],
                                content: _msg,
                            });
                        break;
                
                    default:
                        break;
                };

                return;
            };
        });
    });
};

app.whenReady().then(() => {
    window = createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    };
});

app.on('activate', () => {
    if (BrowerWindow.getAllWindows().length === 0) {
        win = createWindow();
    };
});

ipcMain.once('load-message', (chan) => {
    channel = chan;

    channel.reply('load-message', message);
});

ipcMain.once('auth', (chan, msg) => {
    authChan = chan;
    if (!!msg.token) {
        auth = JSON.parse(msg.token);
        connectTwith();
    };

    if (!!msg.data) {
        userData = JSON.parse(msg.data);
    };

    server = http.createServer(router);
    server.listen(1757, '127.0.0.1', 0, () => {
        console.log('Server connected: 127.0.0.1:1757')
        setMessage('2.Serveur connecté: 127.0.0.1:1757', channel);
        window.setProgressBar(2/8);

        if (!auth) {
            setMessage(`3.Une authentification est requise<br/><span style="font-size: 12px">Redirection... <a href="${codeFlow}" style="color: #1F6FDC">Lien d'authentification Twitch</a></span>`, channel);
            window.setProgressBar(3/8);
            if (process.platform == 'win32') childProcess.exec(`start "" "${codeFlow}"`);
            else if (process.platform == 'darwin') childProcess.exec(`open ${codeFlow}`); // Not verified
            else childProcess.exec(`xdg-open ${codeFlow}`); // Not verified
        };
    });
});

ipcMain.once('msg', (channel, msg) => {
    msgChan = channel;
});

ipcMain.on('state', (channel, msg) => {
    if (msg == 'RELOAD') {
        app.relaunch({ args: process.argv.slice(1).concat(['--relaunch']) });
        app.exit(0);
    };
});