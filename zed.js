/*

BOT'S INFO: ZED

Author:         roughnecks | http://steamcommunity.com/id/starshiptrooper/
Description:    SteamBot | Handles Trade Offers and Friends Invites
Date:           11 Jan. 2019

--------------------------------------------------------------------------

*/

//BOT START


'use strict';

//Main module
var zed = require('./app/main');
require('./app/community');
require('./app/client');
require('./app/jobs');

//console colors
const chalk = require('chalk');

async function init() {
    //Logging ON
    console.log("");
    console.log(chalk.yellow('ZED version: v' + process.env.npm_package_version));
    console.log(chalk.yellow('node.js version: ' + process.version));
    console.log("");

    //Connect to database
    //If connection fails - exit
    if (!await zed.db.connect()) {
        process.exit(1);
        return false;
    }

    //process.on('exit', function () { zed.db.disconnect(); });

    //Check for inventory items in DB and parse them if DB is empty
    await zed.db.checkData();

    //Everything ready, now we can logon
    zed.manager._steam.logOn(zed.config.logOnOptions);
}

init();