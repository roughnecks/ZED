'use strict';

require('console-stamp')(console, 'HH:MM:ss');
const SteamTotp = require('steam-totp');

//Inizializing -- VARS

const config = require('../config.json');
const manager = require('./manager');
const db = require('./db');

const zed = {
    manager: manager,
    db: db,
    config: {
        identitySecret: config.identitySecret,
        ownerSteamID64: config.ownerSteamID64,
        ownerSteamID3: config.ownerSteamID3,
        botSteamID64: config.botSteamID64,
        botSteamID3: config.botSteamID3,
        customGame: config.customGame,
        
        //Items that bot owns and are not up for trading
        lockedItems: config.lockedItems,
        logOnOptions: {
            accountName: config.username,
            password: config.password,
            twoFactorCode: SteamTotp.generateAuthCode(config.sharedSecret)
        }
    }
};

module.exports = zed;