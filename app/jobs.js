'use strict';

const zed = require('./main');

const chalk = require('chalk');

const schedule = require('node-schedule');

const fs = require("fs");
const path = require("path");
//const path = __dirname;


//Session refresh every 30 minutes
setInterval(function() {
    if (zed.manager._steam.steamID) {
        zed.manager._steam.webLogOn();
        //console.log(chalk.yellow('Called WebLogon (setInterval)'));
    } else {
        zed.manager._steam.logOn(zed.config.logOnOptions);
        //zed.manager._steam.logOn(logOnOptions);
        console.log(chalk.yellow('Called Logon (setInterval)'));
    }
}, 30 * 60 * 1000);



//Delete all cooldowns at Midnight

schedule.scheduleJob('0 0 * * *', () => {

    const directory = "app/cooldown";
    //console.log(path);

    fs.readdir(directory, (err, files) => {
        if (err) throw err;

        for (const file of files) {
            fs.unlink(path.join(directory, file), (err) => {
                console.log(file + " deleted");
                if (err) throw err;
            });
        }
    });
});