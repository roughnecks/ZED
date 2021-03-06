'use strict';

const zed = require('./main');
const config = require('../config.json');
const SteamUser = require('steam-user');
const db = require('./db');
const chalk = require('chalk');
const axios = require('axios');
const Tf2Stats = require('./models/Tf2Stats');
const CSGOStats = require('./models/CSGOStats');

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


        //Join GROUP CHAT
        if (zed.config.ClanChatGroup) {
            zed.manager._steam.chat.getClanChatGroupInfo(zed.config.ClanChatGroup, function (err, response) {
                if (!err) {
                    //console.log(response);
                    zed.manager._steam.chat.joinGroup(response.chat_group_summary.chat_group_id, function (err, response) {
                        if (err) {
                            console.log(err);
                        }
                    });
                } else {
                    console.log(err);
                }
            });
        }


    } else {
        console.log(details);
        //Do whatever u want to handle the error...
    }
});

//Session
zed.manager._steam.on('webSession', (sessionid, cookies) => {

    if (typeof config.familyViewPin === undefined) {
        zed.manager.setCookies(cookies, function (err) {
            if (err) {
                console.log(err);
                process.exit(1); //Exit, if we cannot connect we can't do anything.
                return;
            }
        });
        zed.manager._community.setCookies(cookies);
    } else {
        zed.manager.setCookies(cookies, config.familyViewPin, function (err) {
            if (err) {
                console.log(err);
                process.exit(1); //Exit, if we cannot connect we can't do anything.
                return;
            }
        });
        zed.manager._community.setCookies(cookies, config.familyViewPin);
    }
    
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
                    console.log(chalk.yellow('Adding new friend...'));
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
        console.log(chalk.yellow('New comment(s): ' + count));
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
        console.log(chalk.yellow('New Item(s) in Inventory: ' + count));
        zed.db.syncInventoryWithDb();
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



//New Group Chat Message
//This will fire when a new chat message gets posted in Group Chat we're in
zed.manager._steam.chat.on('chatMessage', function (message) {
    var senderID = message.steamid_sender;
    var senderAccountID = senderID.accountid;
    
    //console.log(message);

    zed.manager._steam.getPersonas([senderID], function (err, personas) {
        if (!err) {
            var sender = personas[senderID]["player_name"];
            parseMessage(message.chat_group_id, message.chat_id, message.message_no_bbcode, senderID, senderAccountID, sender);
        } else {
            console.log(err);
        }
    });

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
    else if (message === "!sync" && steamID.getSteamID64() === zed.config.ownerSteamID64) {
        console.log('!sync request received.');
        zed.db.syncInventoryWithDb();
        zed.manager._steam.chatMessage(steamID, 'On it. Check your console');
    }
    else {
        zed.manager._steam.chatMessage(steamID, 'I don\'t understand any other command but "!help", "!sign" and "!lottery" (so far).');
    }
});


async function parseMessage(groupID, chatID, message, senderID, senderAccountID, sender) {
    if (!message || !message.startsWith('!')) {
        return;
    }

    if (message === "!hello") {
        zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Hi there " + "[mention=" + senderAccountID + "]@" + sender + "[/mention]" + "!" + " :steamhappy:");  // [mention=accountid]@name[/mention]
    } else if (message === "!next") {
        zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Your satisfaction is our best prize. Next!");
    } else if (message === "!help") {
        zed.manager._steam.chat.sendChatMessage(groupID, chatID, "I'm a Steam CHAT and Trading BoT; if you want to trade with me, first read the info showcase on my profile. For a list of available commands, type '!commands' without the quotes. More at: https://github.com/roughnecks/ZED" );
    } else if (message === "!commands") {
        zed.manager._steam.chat.sendChatMessage(groupID, chatID, "!csgo - Retrieve CS:GO User Stats" + "\n" + "!hello" + "\n" + "!help" + "\n" + "!next" + "\n" 
        + "!quote add <text> | del <number> | <number> | info <number> | rand [nickname] | match <string> | last [nickname] - Group Quotes Management" 
        + "\n" + "!tf2 <class> - Retrieve TF2 User Stats for selected Class" + "\n" + "!weather <city> <metric || imperial> - Ask the weatherman for location");
    } else if (message.startsWith('!weather')) {
        var str = message.substr(9);
        var res = str.split(" ");
        if (res.length > 1) {
            var units = res[res.length - 1];
            units = units.toUpperCase();
            res.length = res.length - 1;
            var city = res.join(' ');
            checkWeather(city, units, groupID, chatID);
        } else { zed.manager._steam.chat.sendChatMessage(groupID, chatID, "You must specify a city and a unit of measure, either 'metric' or 'imperial'."); }
    
    
    } else if (message.startsWith('!tf2')) {
        var tf2class = message.substr(5);
        if (tf2class) {
            tf2Stats(tf2class, groupID, chatID, sender, senderID);
        } else { zed.manager._steam.chat.sendChatMessage(groupID, chatID, "You must specify a class."); }
    
    
    } else if (message === "!csgo") {
        csgoStats(groupID, chatID, sender, senderID);


    } else if (message.startsWith('!quote')) {
        var str = message.substr(7);
        var res = str.split(" ");
        if (res[0] === 'add') {
            res.shift();
            var quote = res.join(' ');
            if (quote === "") {
                zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Where's my quote!?");
            }
            else {
                var date = new Date();
                var seconds = Math.round(date.getTime() / 1000);
                let senderID64 = senderID.getSteamID64();
                var sequenceID = await db.getNextSequenceValue("quoteID");
                var insertion = await db.insertQuote(sequenceID, sender, senderID64, quote, seconds, groupID, chatID);
                if (insertion) {
                    zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Quote #" + sequenceID + " added.");
                } else { zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Some kind of error occurred. Quote wasn't added :("); }
            }

        } else if (res[0] === 'del') {
            res.shift();
            var quoteNum = res.join(' ');
            quoteNum = Number(quoteNum);
            if (isNaN(quoteNum) || (quoteNum === 0)) {
                zed.manager._steam.chat.sendChatMessage(groupID, chatID, "I need a quote's number, starting from '1'.");
                return;
            }
            let author = await db.quoteInfo(quoteNum);
            let senderID64 = senderID.getSteamID64();
            let ismod = await isMod(senderID, groupID);
            if ((ismod === 30) || (ismod === 40) || (ismod === 50) || (senderID64 === author) || (senderID64 === zed.config.ownerSteamID64)) {
                var deletion = await db.deleteQuote(quoteNum);
                if (typeof deletion !== 'undefined') {
                    if (deletion === 1) {
                        zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Quote #" + quoteNum + " deleted.");
                    } else { zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Quote not found"); }
                } else {
                    zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Some kind of error occurred. Quote wasn't deleted :(");
                }
            } else { zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Sorry, you're not a Group Mod nor the quote's Author."); }


        } else if (str == "") {
            zed.manager._steam.chat.sendChatMessage(groupID, chatID, "I need a quote number, starting from '1' or any sub-command. See '!commands'.");
        

        } else if (!isNaN(Number(str))) {
            var quoteNum = Number(str);
            var quote = await db.findQuote(quoteNum);
            if (quote) {
                zed.manager._steam.chat.sendChatMessage(groupID, chatID, quote);
            } else { zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Quote not found."); }


        } else if(res[0] === 'info') {
            res.shift();
            var quoteNum = res.join(' ');
            quoteNum = Number(quoteNum);
            if ( isNaN(quoteNum) || (quoteNum === 0) ) {
                zed.manager._steam.chat.sendChatMessage(groupID, chatID, "I need a quote's number, starting from '1'.");
                return;
            }
            let author = await db.quoteInfo(quoteNum);
            let ismod = await isMod(senderID, groupID);
            if ((ismod === 30) || (ismod === 40) || (ismod === 50)) {
                zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Author's SteamID64 is: " + author);
            } else { 
                zed.manager._steam.chat.sendChatMessage(groupID, chatID, "You need to be a mod for such request.") 
            }
        

        } else if (res[0] === 'rand') {
            res.shift();
            let match = res.join(' ');
            if (match) {
                let rand = await db.randQuote(match);
                if (rand) {
                    zed.manager._steam.chat.sendChatMessage(groupID, chatID, rand);
                } else { zed.manager._steam.chat.sendChatMessage(groupID, chatID, "No Match."); }
            } else {
                let rand = await db.randQuote();
                if (rand) {
                    zed.manager._steam.chat.sendChatMessage(groupID, chatID, rand);
                } else { zed.manager._steam.chat.sendChatMessage(groupID, chatID, "No Match."); }
            }
        

        } else if (res[0] === 'match') {
            res.shift();
            let query = res.join(' ');
            if (query) {
                let output = await db.matchQuote(query);
                zed.manager._steam.chat.sendChatMessage(groupID, chatID, output);
            } else { zed.manager._steam.chat.sendChatMessage(groupID, chatID, "I need a string to search for."); }
         
         
        } else if ( res[0] === 'last') {
            res.shift();
            let match = res.join(' ');
            if (match) {
                let last = await db.lastQuote(match);
                if (last) {
                    zed.manager._steam.chat.sendChatMessage(groupID, chatID, last);
                } else { zed.manager._steam.chat.sendChatMessage(groupID, chatID, "No Match."); }
            } else {
                let last = await db.lastQuote();
                if (last) {
                    zed.manager._steam.chat.sendChatMessage(groupID, chatID, last);
                } else { zed.manager._steam.chat.sendChatMessage(groupID, chatID, "No Match."); }
            }


        } else { zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Not a valid sub-command or quote number."); }
    }
}


async function checkWeather(city, units, groupID, chatID) {

    var url;
    var apiKey = zed.config.weatherAPI;

    if (apiKey) {
        if (units === 'METRIC') {
            url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=${units}&appid=${apiKey}`;
        } else if (units === 'IMPERIAL') {
            url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=${units}&appid=${apiKey}`;
        }
        else {
            zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Wrong or missing unit of measure.");
            return;
        }


        try {
            var response = await axios.get(url);
            var weather = response.data;
            //console.log(weather);
            if (weather.cod === 200) {
                if (units === 'METRIC') {
                    let result = `It's ${weather.weather[0].description} and ${weather.main.temp} °C in ${weather.name}, ${weather.sys.country}! Pressure is ${weather.main.pressure} hPa, humidity is ${weather.main.humidity}% and wind speed is ${weather.wind.speed} meter/sec.`;
                    zed.manager._steam.chat.sendChatMessage(groupID, chatID, result);
                } else if (units == 'IMPERIAL') {
                    let result = `It's ${weather.weather[0].description} and ${weather.main.temp} °F in ${weather.name}, ${weather.sys.country}! Pressure is ${weather.main.pressure} hPa, humidity is ${weather.main.humidity}% and wind speed is ${weather.wind.speed} miles/hour.`;
                    zed.manager._steam.chat.sendChatMessage(groupID, chatID, result);
                }
            }
        } catch (e) {
            //console.error(e);
            if (e.response.status === 404) {
                zed.manager._steam.chat.sendChatMessage(groupID, chatID, "City not found.");
                console.log('Response Data = ' + (JSON.stringify(e.response.data)));
                return;
            } else {
                zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Houston, we have a problem! Check console.");
                console.log('Response Data = ' + (JSON.stringify(e.response.data)));
                return;
            }
        }
    } else {
        zed.manager._steam.chat.sendChatMessage(groupID, chatID, "No API Key defined in config file, aborting.");
        return;
    }
}


async function tf2Stats(tf2class, groupID, chatID, sender, senderID) {
    var apikey = zed.config.steamAPI;

    if (apikey) {
        var playerID64 = senderID.getSteamID64();
        var player = sender;
        var tf2classLower = tf2class.toLowerCase();
        var tf2classCapitalized = tf2classLower.charAt(0).toUpperCase() + tf2classLower.slice(1);

        var url = `http://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/?appid=440&key=${apikey}&steamid=${playerID64}`;


        try {
            var response = await axios.get(url);
            var output = response.data;
            var tf2Stats = new Tf2Stats();
            //console.log(JSON.stringify(output))

            tf2Stats.setStatsValues(tf2classCapitalized, output.playerstats.stats);
            zed.manager._steam.chat.sendChatMessage(groupID, chatID, tf2Stats.getStatSummary(tf2classCapitalized, player));

        } catch (e) {
            //console.error(e);
            if (e.response.status === 500) {
                zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Your Game Details are not Public.");
                console.log('Response Data = ' + (JSON.stringify(e.response.data)));
                return;
            } else {
                zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Houston, we have a problem! Check console.");
                console.log('Response Data = ' + (JSON.stringify(e.response.data)));
                return;
            }
        }

    } else {
        zed.manager._steam.chat.sendChatMessage(groupID, chatID, "No API Key defined in config file, aborting.");
        return;
    }
}

async function csgoStats(groupID, chatID, sender, senderID) {

    var apikey = zed.config.steamAPI;

    if (apikey) {
        var playerID64 = senderID.getSteamID64();
        var player = sender;

        var url = `http://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/?appid=730&key=${apikey}&steamid=${playerID64}`;

        try {
            var response = await axios.get(url);
            var output = response.data;
            var csgoStats = new CSGOStats();
            
            csgoStats.setStatsValues(output.playerstats.stats);
            zed.manager._steam.chat.sendChatMessage(groupID, chatID, csgoStats.getStatSummary(player));

        } catch (e) {
            //console.error(e);
            if (e.response.status === 500) {
                zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Your Game Details are not Public.");
                console.log('Response Data = ' + (JSON.stringify(e.response.data)));
                return;
            } else {
                zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Houston, we have a problem! Check console.");
                console.log('Response Data = ' + (JSON.stringify(e.response.data)));
                return;
            }
        }

    } else {
        zed.manager._steam.chat.sendChatMessage(groupID, chatID, "No API Key defined in config file, aborting.");
        return;
    }
}

async function isMod(member, groupID) {
    var response = await zed.manager._steam.chat.setSessionActiveGroups(groupID);
    var memberID64 = member.getSteamID64();
    var groupInfo = Object.values(response.chat_room_groups);
    var members = groupInfo[0].members;
    for(let element of members) {
        var elementID64 = element.steamid.getSteamID64();
        if (elementID64 === memberID64) {
            return (element.rank);
        }
    }
}

