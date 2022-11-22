'use strict';

const zed = require('./main');
const chalk = require('chalk');

//Session
zed.manager._community.on('sessionExpired', function (err) {
    if (err) {
        console.log(chalk.red('Session Expired: ' + err));
    }

    if (zed.manager._steam.steamID) {
        zed.manager._steam.webLogOn();
        console.log(chalk.yellow('Called WebLogon'));
    } else {
        zed.manager._steam.logOn(zed.config.logOnOptions);
        console.log(chalk.yellow('Called Logon'));
    }
});



