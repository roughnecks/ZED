'use strict';

require('console-stamp')(console, 'HH:MM:ss');
const SteamTotp = require('steam-totp');

//Inizializing -- VARS

const config = require('../config.json');
const manager = require('./manager');

const zed = {
    manager: manager,
    config: {
        identitySecret: config.identitySecret,
        ownerSteamID64: config.ownerSteamID64,
        ownerSteamID3: config.ownerSteamID3,
        botSteamID64: config.botSteamID64,
        botSteamID3: config.botSteamID3,
        ClanChatGroup: config.ClanChatGroupID,
        customGame: config.customGame,
        pin: config.familyViewPin,        
        //Items that bot owns and are not up for trading
        lockedItems: config.lockedItems,
        weatherAPI: config.openweathermapAPI,
        steamAPI: config.steamAPI,
        logOnOptions: {
            accountName: config.username,
            password: config.password,
            twoFactorCode: SteamTotp.generateAuthCode(config.sharedSecret)
        }
    }
};

module.exports = zed;