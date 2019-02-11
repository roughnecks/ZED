'use strict';

const SteamCommunity = require('steamcommunity');
var client = require('./client');
var cron = require('node-cron');

const community = new SteamCommunity();

//Session
community.on('sessionExpired', function (err) {
    if (err) {
        console.log('Session Expired: ' + err);
    }

    if (client.steamID) {
        client.webLogOn();
        console.log('called weblogon: ' + client.steamID);
    } else {
        client.logOn(logOnOptions);
        console.log('called logon');
    }
});


//Session refresh every 30 minutes
cron.schedule('*/30 * * * *', () => {
    if (client.steamID) {
        //console.log('Already logged in: ' + client.steamID);
        client.webLogOn();
        //console.log('Called weblogon from cron');
    } else {
        client.logOn(logOnOptions);
        console.log('Logged in again using cron');
    }
});

module.exports = community;