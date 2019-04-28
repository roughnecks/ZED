'use strict';

const zed = require('./main');
const config = require('../config.json');
const SteamUser = require('steam-user');

const chalk = require('chalk');
const request = require('request');

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

    /*
    if (server_message && server_message.message == 2) {
        zed.manager._steam.getPersonas([server_message.steamid_param], function (err, personas) {
            if (!err) {
                var joined = personas[server_message.steamid_param]["player_name"];
                zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Welcome aboard " + "[mention=" + server_message.steamid_param.accountid + "]@" + joined + "[/mention]" + "!" + " :steamhappy:");
            } else {
                console.log(err);
                return;
            }
        });
    }
    */

    if (message === "!hello") {
        zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Hi there " + "[mention=" + senderAccountID + "]@" + sender + "[/mention]" + "!" + " :steamhappy:");  // [mention=accountid]@name[/mention]
    } else if (message === "!next") {
        zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Your satisfaction is our best prize. Next!");
    } else if (message === "!help") {
        zed.manager._steam.chat.sendChatMessage(groupID, chatID, "I'm a trading and chat bot; if you want to trade with me, first read the info showcase on my profile. For a list of available commands, type '!commands' without the quotes. More at: https://github.com/roughnecks/ZED" );
    } else if (message === "!commands") {
        zed.manager._steam.chat.sendChatMessage(groupID, chatID, "!commands - !hello - !help - !next - !weather <city> <metric || imperial> - !tf2 <class>");
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

        request(url, function (err, response, body) {
            if (err) {
                console.log('error:', error);
            } else {
                let weather = JSON.parse(body);
                if (weather.cod == 404) {
                    zed.manager._steam.chat.sendChatMessage(groupID, chatID, "City not found.");
                    return;
                } else if (weather.cod == 200) {
                    if (units === 'METRIC') {
                        let result = `It's ${weather.weather[0].description} and ${weather.main.temp} °C in ${weather.name}, ${weather.sys.country}! Pressure is ${weather.main.pressure} hPa, humidity is ${weather.main.humidity}% and wind speed is ${weather.wind.speed} meter/sec.`;
                        zed.manager._steam.chat.sendChatMessage(groupID, chatID, result);
                    } else if (units == 'IMPERIAL') {
                        let result = `It's ${weather.weather[0].description} and ${weather.main.temp} °F in ${weather.name}, ${weather.sys.country}! Pressure is ${weather.main.pressure} hPa, humidity is ${weather.main.humidity}% and wind speed is ${weather.wind.speed} miles/hour.`;
                        zed.manager._steam.chat.sendChatMessage(groupID, chatID, result);
                    }
                }
                else {
                    zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Houston, we have a problem!");
                    console.log(weather);
                }
            }
        });
    } else {
        zed.manager._steam.chat.sendChatMessage(groupID, chatID, "No API Key defined in config file, aborting.")
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

        request(url, function (error, response, body) {
            if (error) {
                console.log('error: '+ error);
            } else {
                //console.log(response.statusCode);

                if (response.statusCode == 500) {
                    zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Your Game Details are not Public.");
                    return;
                } else if (response.statusCode == 200) {
                    let output = JSON.parse(body);
                    //console.log(JSON.stringify(output))

                    var accumBuild, maxBuild, accumDam, maxDam, accumDom, maxDom, accumKAss, maxKAss, accumKills, maxKills, accHours, maxMins, maxSecs, accumCap, maxCap, accumDef, maxDef, accumPoints, maxPoints, accumRev, maxRev, accumBack, maxBack, accumLeach, maxLeach, accumBuilt, maxBuilt, accumTel, maxTel, maxSentry, accumHeadS, maxHeadS, accumHeal, maxHeal, accumInvul, maxInvul;
                    accumBuild = maxBuild = accumDam = maxDam = accumDom = maxDom = accumKAss = maxKAss = accumKills = maxKills = accHours = maxMins = maxSecs = accumCap = maxCap = accumDef = maxDef = accumPoints = maxPoints = accumRev = maxRev = accumBack = maxBack = accumLeach = maxLeach = accumBuilt = maxBuilt = accumTel = maxTel = maxSentry = accumHeadS = maxHeadS = accumHeal = maxHeal = accumInvul = maxInvul = "-";

                    var stats = output.playerstats.stats;
                    for (var i = 0; i < stats.length; i++) {
                        if (stats[i].name == tf2classCapitalized + ".accum.iBuildingsDestroyed") {
                            accumBuild = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".max.iBuildingsDestroyed") {
                            maxBuild = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".accum.iDamageDealt") {
                            accumDam = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".max.iDamageDealt") {
                            maxDam = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".accum.iDominations") {
                            accumDom = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".max.iDominations") {
                            maxDom = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".accum.iKillAssists") {
                            accumKAss = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".max.iKillAssists") {
                            maxKAss = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".accum.iNumberOfKills") {
                            accumKills = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".max.iNumberOfKills") {
                            maxKills = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".accum.iPlayTime") {
                            var accumTime = stats[i].value;
                            accHours = Math.round(accumTime * 100 / 3600) / 100;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".max.iPlayTime") {
                            var maxTime = stats[i].value;
                            maxMins = Math.floor(maxTime / 60);
                            maxSecs = maxTime - maxMins * 60;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".accum.iPointCaptures") {
                            accumCap = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".max.iPointCaptures") {
                            maxCap = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".accum.iPointDefenses") {
                            accumDef = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".max.iPointDefenses") {
                            maxDef = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".accum.iPointsScored") {
                            accumPoints = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".max.iPointsScored") {
                            maxPoints = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".accum.iRevenge") {
                            accumRev = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".max.iRevenge") {
                            maxRev = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".accum.iBackstabs") {
                            accumBack = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".max.iBackstabs") {
                            maxBack = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".accum.iHealthPointsLeached") {
                            accumLeach = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".max.iHealthPointsLeached") {
                            maxLeach = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".accum.iBuildingsBuilt") {
                            accumBuilt = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".max.iBuildingsBuilt") {
                            maxBuilt = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".accum.iNumTeleports") {
                            accumTel = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".max.iNumTeleports") {
                            maxTel = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".max.iSentryKills") {
                            maxSentry = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".accum.iHeadshots") {
                            accumHeadS = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".max.iHeadshots") {
                            maxHeadS = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".accum.iHealthPointsHealed") {
                            accumHeal = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".max.iHealthPointsHealed") {
                            maxHeal = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".accum.iNumInvulnerable") {
                            accumInvul = stats[i].value;
                        }
                        else if (stats[i].name == tf2classCapitalized + ".max.iNumInvulnerable") {
                            maxInvul = stats[i].value;
                        }
                    }
                } else {
                    zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Unknown Error");
                    console.log('Response Status Code = ' + response.statusCode);
                    console.log('Body = ' + body);
                    return;
                }

                let result = ":sticky:" + `${tf2classCapitalized} Stats for Player "${player}":` + "\n" + "\n" 
                + "Total Playtime / Longest Life: " + `${accHours}hrs` + " / " + `${maxMins}:${maxSecs}mins` + "\n"
                + "Total / Most Points: " + accumPoints + " / " + maxPoints + "\n"
                + "Total / Most Kills: " + accumKills + " / " + maxKills + "\n"
                + "Total / Most Damage Dealt: " + accumDam + " / " + maxDam + "\n"
                + "Total / Most Kill Assists: " + accumKAss + " / " + maxKAss + "\n"
                + "Total / Most Dominations: " + accumDom + " / " + maxDom + "\n"
                + "Total / Most Revenges: " + accumRev + " / " + maxRev + "\n"
                + "Total / Most Buildings Destroyed: " + accumBuild + " / " + maxBuild + "\n"
                + "Total / Most Captures: " + accumCap + " / " + maxCap + "\n"
                + "Total / Most Defenses: " + accumDef + " / " + maxDef;
                
                
                if ((tf2classCapitalized === 'Demoman') || (tf2classCapitalized === 'Soldier') || (tf2classCapitalized === 'Pyro') || (tf2classCapitalized === 'Heavy') || (tf2classCapitalized === 'Scout')) {
                    zed.manager._steam.chat.sendChatMessage(groupID, chatID, result);
                } else if (tf2classCapitalized === 'Medic') {
                    let medicResult = result + "\n" 
                    + "Total / Most Points Healed: " + accumHeal + " / " + maxHeal + "\n" 
                    + "Total / Most ÜberCharges: " + accumInvul + " / " + maxInvul;
                    zed.manager._steam.chat.sendChatMessage(groupID, chatID, medicResult);
                } else if (tf2classCapitalized === 'Engineer') {
                    let engiResult = result + "\n" 
                    + "Total / Most Buildings Built: " + accumBuilt + " / " + maxBuilt + "\n" 
                    + "Total / Most Teleports: " + accumTel + " / " + maxTel + "\n" 
                    + "Most Kills By Sentry: " + maxSentry;
                    zed.manager._steam.chat.sendChatMessage(groupID, chatID, engiResult);
                } else if (tf2classCapitalized === 'Spy') {
                    let spyResult = result + "\n" 
                    + "Total / Most Backstabs: " + accumBack + " / " + maxBack + "\n" 
                    + "Total / Most Health Points Leached: " + accumLeach + " / " + maxLeach;
                    zed.manager._steam.chat.sendChatMessage(groupID, chatID, spyResult);
                } else if (tf2classCapitalized === 'Sniper') {
                    let snipResult = result + "\n" 
                    + "Total / Most Headshots: " + accumHeadS + " / " + maxHeadS;
                    zed.manager._steam.chat.sendChatMessage(groupID, chatID, snipResult);
                }
                else {zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Invalid class, moron!")};
            }
        });
    } else {
        zed.manager._steam.chat.sendChatMessage(groupID, chatID, "No API Key defined in config file, aborting.")
        return;
    }
}

