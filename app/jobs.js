'use strict';

const zed = require('./main');

//Session refresh every 30 minutes
setInterval(function() {
    if (zed.manager._steam.steamID) {
        //console.log('Already logged in: ' + zed.manager.steam.steamID);
        zed.manager._steam.webLogOn();
        //console.log('Called weblogon from cron');
    } else {
        zed.manager._steam.logOn(logOnOptions);
        console.log('Logged in again using cron');
    }
}, 30 * 60 * 1000);
