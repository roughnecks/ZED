'use strict';

const zed = require('./main');
const config = require('../config.json');
const SteamUser = require('steam-user');
const NodeSteamID = require('steamid');
const chalk = require('chalk');
const axios = require('axios');
const Tf2Stats = require('./models/Tf2Stats');
const CSGOStats = require('./models/CSGOStats');

const fs = require('fs');
const shell = require('child_process').execSync;
const streamTitle = require('stream-title');
const { exec } = require('child_process');

const ud = require('urban-dictionary')

const path = __dirname;

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
    }
});

//Accept friend requests
zed.manager._steam.on('friendRelationship', (steamID, relationship) => {
    if (relationship === 2) {
        zed.manager._steam.getPersonas([steamID], function (err, personas) {
            if (!err) {
                console.log(chalk.yellow('Adding New Friend: ' + personas[steamID]["player_name"]));
                console.log(chalk.cyan("=========================="));
            }
            else {
                console.log(chalk.yellow('Adding New Friend: ' + steamID.getSteamID64()));
                console.log(chalk.cyan("=========================="));
            }
        });
        zed.manager._steam.addFriend(steamID);
        console.log(chalk.green('Friend Request Accepted.'));
        zed.manager._steam.chatMessage(steamID, 'Hello :lunar2019wavingpig: and thanks for adding me. Please leave a message in my profile if you think I\'m useful and let your friends know about me!');
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
        zed.manager._steam.chatMessage(steamID, 'Hello, if you want me to sign your profile, type "!sign" without the quotes. Also join my group chat for more commands, like CSGO and TF2 user stats: https://steamcommunity.com/groups/zedspace' + "\n" + 'Have a nice day!');
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
    else {
        zed.manager._steam.chatMessage(steamID, 'I don\'t understand any other command but "!help" and "!sign" (so far).');
    }
});


async function parseMessage(groupID, chatID, message, senderID, senderAccountID, sender) {

//console.log("groupid = " + groupID);
//console.log("chatid = " + chatID);

    if (!message || !message.startsWith('!')) {
        return;
    }

    if (message === "!hello") {
        zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Hi there " + "[mention=" + senderAccountID + "]@" + sender + "[/mention]" + "!" + " :steamhappy:");  // [mention=accountid]@name[/mention]
    } else if (message === "!next") {
        zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Your satisfaction is our best prize. Next!");
    } else if (message === "!help") {
        zed.manager._steam.chat.sendChatMessage(groupID, chatID, "I'm a Steam CHAT and Trading BoT; if you want to trade with me, first read the info showcase on my profile. For a list of available commands, type '!commands' without the quotes. More at: https://github.com/roughnecks/ZED" );
    } else if (message === "!radio") {
        zed.manager._steam.chat.sendChatMessage(groupID, chatID, ":cassette: Listen to our StillStream Radio using your favorite music player or connecting directly to: https://woodpeckersnest.space:8090/live" + "\n" +
        "Server Status: https://woodpeckersnest.space:8090/status.xsl");
    } else if (message === "!np") {
        zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Now Playing: :PlayMusic: " +  song);
    } else if (message === "!commands") {
        zed.manager._steam.chat.sendChatMessage(groupID, chatID, "!hello" + "\n" + "!help" + "\n" + "!next" + "\n" + "!radio" + "\n" + "!choose - Suggests you a game to play next" + "\n" + "!fortune - A fortune cookie in Italian or English" + 
        "\n" + "!np - Now Playing on StillStream" + "\n" + "!ud <term> - Search Urban Dictionary" + "\n" +
        "!csgo [SteamID64] - Retrieve CS:GO User Stats for yourself or optional given SteamID64" + "\n" 
        + "!tf2 <class> - Retrieve TF2 User Stats for selected Class" + "\n" + "!weather <city> <metric || imperial> - Ask the weatherman for location" + "\n" + 
        "!quote <add text> | <del number> | <info number> | <rand> - Quotes Management");
    } else if (message.startsWith('!ud')) {
        var term = message.substr(3);
        if (term == '') {
            zed.manager._steam.chat.sendChatMessage(groupID, chatID, "You must specify a term to search for");
        } else {
            ud.define(term, (error, results) => {
                if (error) {
                    zed.manager._steam.chat.sendChatMessage(groupID, chatID, error.message);
                    //console.error(`define (callback) error - ${error.message}`);
                    return;
                }

                Object.entries(results[0]).forEach(([key, prop]) => {
                    //console.log(`${key}: ${prop}`);
                    if (key == 'definition') {
                        //console.log(term + " is: " + prop);
                        zed.manager._steam.chat.sendChatMessage(groupID, chatID, term + " is: " + prop);
                    }
                });
            });
        }
    } else if (message == '!fortune') {

            exec('fortune', (err, stdout, stderr) => {
                if (err) {
                    console.log("node couldn't execute the command");
                    return;
                }
                zed.manager._steam.chat.sendChatMessage(groupID, chatID, stdout);
            });

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

    } else if (message === "!choose") {
        chooseGame(groupID, chatID, sender, senderID);

    } else if (message.startsWith('!tf2')) {
        var tf2class = message.substr(5);
        if (tf2class) {
            tf2Stats(tf2class, groupID, chatID, sender, senderID);
        } else { zed.manager._steam.chat.sendChatMessage(groupID, chatID, "You must specify a class."); }
    
    
    } else if (message.startsWith('!csgo')) {
        var str = (message.substr(6));
        var res = str.split(" ");
        var playerID = res[0];


        if (playerID) {

            try {
                let sid = new NodeSteamID(playerID);
                if (sid.universe != NodeSteamID.Universe.PUBLIC || sid.type != NodeSteamID.Type.INDIVIDUAL) {
                    zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Probably that's not a valid SteamID64");
                    return;
                }
                // SteamID is valid
                zed.manager._steam.getPersonas([playerID], function (err, personas) {
                    if (!err) {
                        var player_name = personas[playerID]["player_name"];
                        csgoStats(groupID, chatID, player_name, playerID);
                    } else { zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Cannot get player's name") }
                });
            }
            catch (ex) {
                zed.manager._steam.chat.sendChatMessage(groupID, chatID, "SteamID is not valid");
            }

        } else { csgoStats(groupID, chatID, sender, senderID); }

        

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
                //let senderID64 = senderID.getSteamID64();
                var sequenceID;
                var data;
                try {

                    data = await fs.readFileSync(`${path}/quotes/quotedb`, 'utf8');
                    //console.log("data = " + data);
                    if (!data) {
                        sequenceID = 1;
                        sequenceID = Number(sequenceID);
                        //console.log("1. sequenceID = " + sequenceID)
                    } else {
                        var lines = data.trim().split('\n');
                        var lastLine = lines.slice(-1)[0];

                        var fields = lastLine.split(' ');
                        sequenceID = fields[0];
                        sequenceID = Number(sequenceID) +1;
                        //console.log("2. sequenceID = " + sequenceID);
                    }

                } catch (err) {
                    console.log(err);
                }

                let senderID64 = senderID.getSteamID64();

                await fs.appendFile(`${path}/quotes/quotedb`, sequenceID + " " + senderID64 + " " + "<" + sender + "> " + quote + "\n", function (err) {
                    if (err) {
                        console.log(err);
                        zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Some kind of error occurred. Quote wasn't added :(");
                    } else {
                        zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Quote #" + sequenceID + " added.");
                    }
                });
            }


        } else if (res[0] === 'del') {
            res.shift();
            var quoteNum = res.join(' ');
            quoteNum = Number(quoteNum);

            if (isNaN(quoteNum) || (quoteNum === 0)) {
                zed.manager._steam.chat.sendChatMessage(groupID, chatID, "I need a quote's number, starting from '1'.");
                return;
            }

            let senderID64 = senderID.getSteamID64();
            let ismod = await isMod(senderID, groupID);

            get_line(`${path}/quotes/quotedb`, quoteNum, function (err, line) {
                //console.log('Quote to delete: ' + line);
                if (!(line)) {
                    zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Quote not in DB.")
                    return;
                }
                var result = line.split(" ");
                let author = result[1];

                if ((ismod === 30) || (ismod === 40) || (ismod === 50) || (senderID64 === author) || (senderID64 === zed.config.ownerSteamID64)) {

                    var replacement = quoteNum + " Quote deleted.";
                    if (line != replacement) {
                        //shell(`sed -i "s_${line}_${replacement}_" ${path}/quotes/quotedb`);
                        shell(`sed -i "${quoteNum}s_.*_${replacement}_" ${path}/quotes/quotedb`);
                        zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Quote #" + quoteNum + " deleted.");
                    } else {zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Quote already deleted.")}
                } else {zed.manager._steam.chat.sendChatMessage(groupID, chatID, "You don\'t have permissions to delete that quote.")}
            });
        
        
        } else if (res[0] === 'info'){
            var quoteNum = res[res.length - 1];
            quoteNum = Number(quoteNum);

            if (isNaN(quoteNum) || (quoteNum === 0)) {
                zed.manager._steam.chat.sendChatMessage(groupID, chatID, "I need a quote's number, starting from '1'.");
                return;
            }

            get_line(`${path}/quotes/quotedb`, quoteNum, function (err, line) {
                //console.log('Quote to show: ' + line);
                if (!(line)) {
                    zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Quote not in DB.")
                    return;
                }

                var replacement = quoteNum + " Quote deleted.";
                if (line != replacement) {
                    var result = line.split(" ");
                    result.shift();
                    result.shift();
                    line = result.join(' ');
                    var nickname = line.split('<').pop().split('>')[0];
                    var fullnick = "<" + nickname + ">";
                    line = line.replace(fullnick, '');
                    line = line.trim();

                    zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Quote #" + quoteNum + " from " + fullnick + " is: " + line);
                } else {zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Quote #" + quoteNum + " is deleted.");}
            });
        }


        else if (res[0] === 'rand') {

            fs.readFile(`${path}/quotes/quotedb`, 'utf-8', function(err, data) {
                if (err) throw err;
            
                var lines = data.trim().split('\n');
                var lastLine = lines.slice(-1)[0];
            
                var fields = lastLine.split(' ');
                var lastQuoteNum = fields[0];

                var randomnumber = Math.floor(Math.random() * (lastQuoteNum)) + 1;

                get_line(`${path}/quotes/quotedb`, randomnumber, function (err, line) {
                    if (!(line)) {
                        zed.manager._steam.chat.sendChatMessage(groupID, chatID, "err, couldn't select a random quote..")
                        return;
                    }
    
                    var replacement = randomnumber + " Quote deleted.";
                    
                    if (line != replacement) {
                        var result = line.split(" ");
                        result.shift();
                        result.shift();
                        line = result.join(' ');
                        var nickname = line.split('<').pop().split('>')[0];
                        var fullnick = "<" + nickname + ">";
                        line = line.replace(fullnick, '');
                        line = line.trim();
                        zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Random Quote #" + randomnumber + " from " + fullnick + " is: " + line);
                    } else {zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Random Quote #" + randomnumber + " is deleted.");}
                });
            });
        }

        else if (res[0] === 'search') {
            res.shift();
            var search = res.join(' ');
            if (search === "") {
                zed.manager._steam.chat.sendChatMessage(groupID, chatID, "A search term is needed!");
            }
            else {
                let file = fs.readFileSync(`${path}/quotes/quotedb`, "utf8");
                let arr = file.split(/\r?\n/);
                var idxfull = [];
                arr.forEach((line, idx) => {
                    line = line.toLowerCase();
                    if (line.includes(search)) {
                        //console.log((idx+1)+':'+ line);
                        idxfull.push(idx+1);
                    }
                });
                //console.log(idxfull);
                if (idxfull.length === 0) {
                    zed.manager._steam.chat.sendChatMessage(groupID, chatID, "No match found for " + search);
                } else {zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Found the following quote(s) number: " + idxfull);}
            }
        }
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

async function chooseGame(groupID, chatID, sender, senderID) {
    var apikey = zed.config.steamAPI;

    if (apikey) {

        var player = sender;
        var url = `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apikey}&steamid=${senderID}&include_appinfo=1&format=json`;

        try {
            var response = await axios.get(url);
            var output = response.data;
            //console.log(JSON.stringify(output))
            let gamecount = output.response.game_count;
            var chosen = Math.floor(Math.random() * (gamecount + 1));
            var gamename = output.response.games[chosen].name;
            var appid = output.response.games[chosen].appid;
            var hash = output.response.games[chosen].img_icon_url;

            //console.log(gamecount);
            //console.log(chosen);
            //console.log(gamename);

            zed.manager._steam.chat.sendChatMessage(groupID, chatID, "You own " + gamecount + " games; why don't you try \"" + gamename + "\"?" + "\n" 
            + `http://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${hash}.jpg`);
        } catch (e) {
            //console.error(e);
            if (typeof e.response === 'undefined') {
                zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Your Game Details are not Public.");
                //console.log('Response Data = ' + (JSON.stringify(e.response.data)));
                return;
            } else {
                zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Houston, we have a problem! Check console.");
                //console.log('Response Data = ' + (JSON.stringify(e.response.data)));
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
            if (typeof e.response === 'undefined') {
                zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Your Game Details are not Public or you never played TF2.");
                //console.log('Response Data = ' + (JSON.stringify(e.response.data)));
                return;
            } else {
                zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Houston, we have a problem! Check console.");
                //console.log('Response Data = ' + (JSON.stringify(e.response.data)));
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
        var playerID64 = senderID;
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
            if (typeof e.response === 'undefined') {
                zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Game Details are not Public or you/them never played CSGO.");
                //console.log('Response Data = ' + (JSON.stringify(e.response.data)));
                return;
            } else {
                zed.manager._steam.chat.sendChatMessage(groupID, chatID, "Houston, we have a problem! Check console.");
                //console.log('Response Data = ' + (JSON.stringify(e.response.data)));
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

// Search for quotes
function get_line(filename, line_no, callback) {
    var data = fs.readFileSync(filename, 'utf8');
    var lines = data.split("\n");

    if (line_no >= lines.length) {
        console.log('File end reached without finding line');
        }
    //console.log(lines);
    //console.log(lines[line_no]);
    callback(null, lines[line_no - 1]);
}

var song;
var np = np = fs.readFileSync(`${path}/miscellaneous/songtitle`, 'utf8');

// Title refresh every 10 seconds
setInterval(function () {
    streamTitle({
        url: 'https://woodpeckersnest.space:8090',
        type: 'icecast',
        mount: '/live'
    }).then(function (title) {
        //console.log(title);
        if (title == null || title == '') {
            song = "Not playing right now or no one's listening :("
        } else {
            song = title 
        }
        fs.writeFile(`${path}/miscellaneous/songtitle`, song, function (err) {
            if (err) return console.log(err);
        });

    }).catch(function (err) {
        //console.log(err);
        return;
    });
}, 10 * 1000);


// Send radio title updates to chat - check every 15 seconds
setInterval(function () {
    //console.log(song);
    //console.log(np);

    if (np !== song) {
        if (song == "Not playing right now or no one's listening :(") {
            zed.manager._steam.chat.sendChatMessage('24488495', '87920756', song);
            np = song;
        }
        else {
            zed.manager._steam.chat.sendChatMessage('24488495', '87920756', "Now Playing: :PlayMusic: " + song);
            np = song;
        }
    } else { return; }
}, 15 * 1000);

// Send radio announcement every 90 minutes
setInterval(function () {
    if (np != "Not playing right now or no one's listening :(") {
    zed.manager._steam.chat.sendChatMessage('24488495', '87920756', ":cassette: Listen to our StillStream Radio using your favorite music player or connecting directly to: https://woodpeckersnest.space:8090/live" + "\n" +
    "Server Status: https://woodpeckersnest.space:8090/status.xsl");
    } else {return;}
}, 90 * 60 * 1000);

