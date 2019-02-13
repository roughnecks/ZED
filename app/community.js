'use strict';

const zed = require('./main');

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



