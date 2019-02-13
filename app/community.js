'use strict';

const zed = require('./main');
var cron = require('node-cron');

//Session
zed.manager._community.on('sessionExpired', function (err) {
    if (err) {
        console.log('Session Expired: ' + err);
    }

    if (zed.manager._steam.steamID) {
        zed.manager._steam.webLogOn();
        console.log('called weblogon: ' + zed.manager._steam.steamID);
    } else {
        zed.manager._steam.logOn(logOnOptions);
        console.log('called logon');
    }
});


//Session refresh every 30 minutes
cron.schedule('*/30 * * * *', () => {
    if (zed.manager._steam.steamID) {
        //console.log('Already logged in: ' + zed.manager.steam.steamID);
        zed.manager._steam.webLogOn();
        //console.log('Called weblogon from cron');
    } else {
        zed.manager._steam.logOn(logOnOptions);
        console.log('Logged in again using cron');
    }
});