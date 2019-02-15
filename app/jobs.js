'use strict';

const zed = require('./main');
var cron = require('node-cron');

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

//Update Prices every day at 1:30pm
cron.schedule('30 13 * * 1,3,5,7', async () => {
    console.log('Updating prices in DB... This might take a while.');
    await zed.db.updatePricesInDb();
});

