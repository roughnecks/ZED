'use strict';

const SteamUser = require('steam-user');
const config = require('../config');

//console colors
const chalk = require('chalk');

const client = new SteamUser();

client.on('loggedOn', function (details) {
    if (details.eresult == SteamUser.EResult.OK) {
        client.getPersonas([client.steamID], function (personas) {
            console.log("");
            console.log("== Logged in =============");
            console.log('== Name: ' + personas[client.steamID]["player_name"]);
            console.log('== ID64: ' + client.steamID);
            console.log("==========================");
            console.log("");
            console.log(chalk.bgBlue(config.customGame));
            console.log("");
        });
        client.setPersona(5); //"5": "LookingToTrade" -- https://github.com/DoctorMcKay/node-steam-user/blob/master/enums/EPersonaState.js
        client.gamesPlayed(config.customGame);
    } else {
        console.log(details);
        //Do whatever u want to handle the error...
    }
});

//Session
client.on('webSession', (sessionid, cookies) => {
    manager.setCookies(cookies, function (err) {
        if (err) {
            console.log(err);
            process.exit(1); //Exit, if we cannot connect we can't do anything.
            return;
        }
    });
    community.setCookies(cookies);
    //startConfirmationChecker is deprecated.
    //community.startConfirmationChecker(10000, config.identitySecret);

    //Checking for offline friend requests
    for (let i = 0; i < Object.keys(client.myFriends).length; i++) {
        if (client.myFriends[Object.keys(client.myFriends)[i]] == 2) {

            //Getting name of friend to be added next
            client.getPersonas([Object.keys(client.myFriends)[i]], function (personas) {
                console.log(chalk.yellow('Adding New Friend: ' + personas[Object.keys(client.myFriends)[i]]["player_name"]));
            });

            client.addFriend(Object.keys(client.myFriends)[i]);
            console.log(chalk.green('Offline Friend Request Accepted.'));
        }
    }
});

//EVENTS

//Comments Check
//This will fire when we receive a comment
client.on('newComments', function (count, myItems, discussions) {
    if (count !== 0) {
        console.log('New comment(s): ' + count);
    }
});


//Chat Messages Check
//This will fire when we receive a chat message from ANY friend
client.on('friendMessage', function (steamID, message) {
    client.getPersonas([steamID], function (personas) {
        console.log('Friend message from ' + personas[steamID]["player_name"] + ': ' + message);
    });
});


//New Items Check
//This will fire when we receive any Items in our Inventory
//To reset its value we need to load Inventory while logged in
client.on('newItems', function (count) {
    if (count !== 0) {
        //client.chatMessage(ownerSteamID3, 'New Item(s) in my Inventory - Check them out!'); 
        console.log('New Item(s) in Inventory: ' + count);
    }
});

//Accept friend requests
client.on('friendRelationship', (steamID, relationship) => {
    if (relationship === 2) {
        client.getPersonas([steamID], function (personas) {
            console.log(chalk.yellow('Adding New Friend: ' + personas[steamID]["player_name"]));
        });
        client.addFriend(steamID);
        console.log(chalk.green('Friend Request Accepted.'));
    }
});

//Commands
client.on('friendMessage', function (steamID, message) {
    if (message == "!help") {
        client.chatMessage(steamID, 'Hello, if you want me to sign your profile, type "!sign" without the quotes. For info about bot\'s lottery, type "!lottery". Have a nice day!');
    }
    else if (message == "!sign") {
        community.postUserComment(steamID, 'ZED was here. :meltdownzed:');
        client.chatMessage(steamID, 'Done! Check your profile\'s comments.');
        client.getPersonas([steamID], function (personas) {
            console.log('Signed ' + personas[steamID]["player_name"] + '\'s profile.');
        });
    }
    else if (message == "!lottery") {
        client.chatMessage(steamID, 'Lottery RULES:' + "\n" + '1) Send any 1 "Trading Card - Background - Emoticon - Booster Pack" to me and write "lottery" (without the quotes) in the comment section of the trading offer window. I\'ll send back a random item of the same type.' + "\n" + '2) You have to be friend with me.' + "\n" + '3) You must not be in Trading Escrow.');
    }
    else {
        client.chatMessage(steamID, 'I don\'t understand any other command but "!help", "!sign" and "!lottery" (so far).');
    }
});

module.exports = client;