'use strict';

const zed = require('./main');

const chalk = require('chalk');

//Session refresh every 30 minutes
setInterval(function() {
    if (zed.manager._steam.steamID) {
        zed.manager._steam.webLogOn();
        //console.log(chalk.yellow('Called WebLogon (setInterval)'));
    } else {
        zed.manager._steam.logOn(zed.config.logOnOptions);
        console.log(chalk.yellow('Called Logon (setInterval)'));
    }
}, 30 * 60 * 1000);
