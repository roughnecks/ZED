'use strict';

const zed = require('./main');
const SteamUser = require('steam-user');

//console colors
const chalk = require('chalk');

zed.manager._steam.on('loggedOn', function (details) {
    if (details.eresult === SteamUser.EResult.OK) {
        zed.manager._steam.getPersonas([zed.manager._steam.steamID], function (err, personas) {
            console.log("");
            console.log("== Logged in =============");
            if (!err) {
                console.log('== Name: ' + personas[zed.manager._steam.steamID]["player_name"]);
            }
            else {
                console.log(err);
            }
            console.log('== ID64: ' + zed.manager._steam.steamID);
            console.log("==========================");
            console.log("");
            console.log(chalk.bgBlue(zed.config.customGame));
            console.log("");
        });
        zed.manager._steam.setPersona(5); //"5": "LookingToTrade" -- https://github.com/DoctorMcKay/node-steam-user/blob/master/enums/EPersonaState.js
        zed.manager._steam.gamesPlayed(zed.config.customGame);
    } else {
        console.log(details);
        //Do whatever u want to handle the error...
    }
});

//Session
zed.manager._steam.on('webSession', (sessionid, cookies) => {
    zed.manager.setCookies(cookies, function (err) {
        if (err) {
            console.log(err);
            process.exit(1); //Exit, if we cannot connect we can't do anything.
            return;
        }
    });
    zed.manager._community.setCookies(cookies);
    //startConfirmationChecker is deprecated.
    //zed.manager._community.startConfirmationChecker(10000, config.identitySecret);

    //Checking for offline friend requests
    for (let i = 0; i < Object.keys(zed.manager._steam.myFriends).length; i++) {
        if (zed.manager._steam.myFriends[Object.keys(zed.manager._steam.myFriends)[i]] == 2) {

            //Getting name of friend to be added next
            zed.manager._steam.getPersonas([Object.keys(zed.manager._steam.myFriends)[i]], function (err, personas) {
                if (!err) {
                    console.log(chalk.yellow('Adding New Friend: ' + personas[Object.keys(zed.manager._steam.myFriends)[i]]["player_name"]));
                }
                else {
                    console.log(err);
                    console.log('Adding new friend...');
                }
            });

            zed.manager._steam.addFriend(Object.keys(zed.manager._steam.myFriends)[i]);
            console.log(chalk.green('Offline Friend Request Accepted.'));
        }
    }
});

//EVENTS

//Comments Check
//This will fire when we receive a comment
zed.manager._steam.on('newComments', function (count, myItems, discussions) {
    if (count !== 0) {
        console.log('New comment(s): ' + count);
    }
});


//Chat Messages Check
//This will fire when we receive a chat message from ANY friend
zed.manager._steam.on('friendMessage', function (steamID, message) {
    if (message.startsWith('[tradeoffer sender=')) {
        return;
    }

    zed.manager._steam.getPersonas([steamID], function (err, personas) {
        if (!err) {
            console.log('Friend message from ' + personas[steamID]["player_name"] + ': ' + message);
        }
        else {
            console.log('Friend message from ' + steamID.getSteamID64() + ': ' + message);
        }
    });
});


//New Items Check
//This will fire when we receive any Items in our Inventory
//To reset its value we need to load Inventory while logged in
zed.manager._steam.on('newItems', function (count) {
    if (count !== 0) {
        //zed.manager._steam.chatMessage(ownerSteamID3, 'New Item(s) in my Inventory - Check them out!'); 
        console.log('New Item(s) in Inventory: ' + count);
    }
});

//Accept friend requests
zed.manager._steam.on('friendRelationship', (steamID, relationship) => {
    if (relationship === 2) {
        zed.manager._steam.getPersonas([steamID], function (err, personas) {
            if (!err) {
                console.log(chalk.yellow('Adding New Friend: ' + personas[steamID]["player_name"]));
            }
            else {
                console.log(chalk.yellow('Adding New Friend: ' + steamID.getSteamID64()));
            }
        });
        zed.manager._steam.addFriend(steamID);
        console.log(chalk.green('Friend Request Accepted.'));
    }
});

//Commands
zed.manager._steam.on('friendMessage', function (steamID, message) {
    if (message.startsWith('[tradeoffer sender=')) {
        return;
    }

    if (message === "!help") {
        zed.manager._steam.chatMessage(steamID, 'Hello, if you want me to sign your profile, type "!sign" without the quotes. For info about bot\'s lottery, type "!lottery". Have a nice day!');
    }
    else if (message === "!sign") {
        zed.manager._community.postUserComment(steamID, 'ZED was here. :meltdownzed:');
        zed.manager._steam.chatMessage(steamID, 'Done! Check your profile\'s comments.');
        zed.manager._steam.getPersonas([steamID], function (err, personas) {
            if (!err) {
                console.log('Signed ' + personas[steamID]["player_name"] + '\'s profile.');
            }
            else {
                console.log('Signed ' + steamID.getSteamID64() + '\'s profile.');
            }
        });
    }
    else if (message === "!lottery") {
        zed.manager._steam.chatMessage(steamID, 'Lottery RULES:' + "\n" + '1) Send any 1 "Trading Card - Background - Emoticon - Booster Pack" to me and write "lottery" (without the quotes) in the comment section of the trading offer window. I\'ll send back a random item of the same type.' + "\n" + '2) You have to be friend with me.' + "\n" + '3) You must not be in Trading Escrow.');
    }
    else {
        zed.manager._steam.chatMessage(steamID, 'I don\'t understand any other command but "!help", "!sign" and "!lottery" (so far).');
    }
});