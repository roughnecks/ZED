/*

BOT'S INFO: ZED

Author:         roughnecks | http://steamcommunity.com/id/starshiptrooper/
Description:    SteamBot | Handles Trade Offers and Friends Invites
Date:           11 Jan. 2019

--------------------------------------------------------------------------

*/

//BOT START


require('console-stamp')(console, 'HH:MM:ss');


//Inizializing -- VARS

//BoT version
const version = 'v1.3.2';

//console colors
const chalk = require('chalk');

const config = require('./config.json');
const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');

const client = new SteamUser();
const community = new SteamCommunity();
const manager = new TradeOfferManager({
	steam: client,
	community: community,
	language: 'en'
});


const logOnOptions = {
	accountName: config.username,
	password: config.password,
	twoFactorCode: SteamTotp.generateAuthCode(config.sharedSecret),
};

const identitySecret = config.identitySecret;
const ownerSteamID3 = config.ownerSteamID3;
const botSteamID3 = config.botSteamID3;
const game = config.customGame;

var success = 0;
var donator = 0;
var donationnum = 0;


//Logging ON

console.log("");
console.log(chalk.yellow('ZED version: ' + version));
console.log(chalk.yellow('node.js version: ' + process.version));

client.logOn(logOnOptions);

client.on('loggedOn', function (details) {
	if (details.eresult == SteamUser.EResult.OK) {
		client.getPersonas([client.steamID], function (personas) {
			console.log("");
			console.log("== Logged in =============")
			console.log('== Name: ' + personas[client.steamID]["player_name"]);
			console.log('== ID64: ' + client.steamID);
			console.log("==========================");
			console.log("");
		});
		client.setPersona(5); //"5": "LookingToTrade" -- https://github.com/DoctorMcKay/node-steam-user/blob/master/enums/EPersonaState.js
		client.gamesPlayed(game);
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


community.on('sessionExpired', function(err) {
	if (err) {
		console.log('Session Expired: ' + err);
	}
	
	if (client.steamID) {
		client.webLogOn();
		console.log('called weblogon: ' + client.steamID);
	} else {
		client.logOn(logOnOptions);
		console.log('called logon');
	}
});



//EVENTS


//Comments Check

//This will fire when we receive a comment
client.on('newComments', function(count, myItems, discussions) {
	if (count !== 0) {
	console.log('New comment(s): ' + count);
	}
});


//Chat Messages Check

//This will fire when we receive a chat message from ANY friend
client.on('friendMessage', function(steamID, message) {
	client.getPersonas([steamID], function (personas) {
		console.log('Friend message from ' + personas[steamID]["player_name"] + ': '  + message);
	});
});


//New Items Check

//This will fire when we receive any Items in our Inventory
//To reset its value we need to load Inventory while logged in
client.on('newItems', function(count) {
	if (count !== 0) {
		//client.chatMessage(ownerSteamID3, 'New Item(s) in my Inventory - Check them out!'); 
		console.log('New Item(s) in Inventory: ' + count);
	}
});


//Offer Incoming


manager.on('newOffer', offer => {

	if (offer.partner.getSteamID64() === '76561198061492959') {
		offer.accept((err, status) => {
			if (err) {
				console.log(err);
			} else {
				console.log(chalk.green(`Accepted offer ${offer.id} from owner. Status: ${status}.`));
				if (offer.itemsToGive.length > 0) {
					community.acceptConfirmationForObject(identitySecret, offer.id, function (err) {
						if (err) {
							console.log(chalk.red("Confirmation Failed for  " + offer.id + ": " + err));
						} else {
							console.log(chalk.green("Offer " + offer.id + ": Confirmed!"));
						}
					});
				} else { console.log(chalk.yellow('No confirmation needed (donation)')) }
			}
		});
		
	} else {

		if (offer.itemsToGive.length === 0) {

			offer.getUserDetails((err, me, them) => {
				if (typeof (them) !== 'undefined') {
					donator = them.personaName;
					//console.log(`donator is: ${donator}`);

					offer.accept((err, status) => {
						if (err) {
							console.log(err);
						} else {
							offer.getReceivedItems((err, items) => {
								if (typeof (items) !== 'undefined') {
									donationnum = items.length;
									//console.log(`donationnum is: ${donationnum}`);
								} else { console.log('getreceiveditems: ' + err); }
							});
							console.log(chalk.green(`Donation accepted. Status: ${status}.`));
							success = 1;
						}
					});
				} else { console.log('getuserdetails: ' + err); }
			});

			if (offer.itemsToReceive.length > 4) {
				postComment();
			}
			

		} else {
			offer.decline(err => {
				if (err) {
					console.log(err);
				} else {
					console.log(chalk.red('Offer declined (wanted our items).'));
				}
			});
		}
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
		client.chatMessage(steamID, 'Hello, if you want me to sign your profile, type "!sign" without the quotes. Have a nice day!');
	}
	else if (message == "!sign") {
		community.postUserComment(steamID, 'ZED was here. :steamhappy:');
		client.chatMessage(steamID, 'Done! Check your profile\'s comments.');
		client.getPersonas([steamID], function (personas) {
			console.log('Signed ' + personas[steamID]["player_name"] + '\'s profile.');
		});
	}
	else {
		client.chatMessage(steamID, 'I don\'t understand any other command but "!help" and "!sign" (so far).');
	}
});


//Functions


function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function postComment () {

	//console.log('Taking a break...');
	await sleep(10000);
	//console.log('Ten seconds later');

	//console.log(`Before Commenting: success = ${success}; donator = ${donator}; donationnum = ${donationnum}`);
	if ((success == 1) && (donator) && (donationnum)) {
		community.postUserComment(botSteamID3, 'Thanks ' + donator + ' for your kind contribution of ' + donationnum + ' Item(s)! :steamhappy:');
		console.log(chalk.green('Comment Posted on Bot\'s Profile'));
		
		success = 0;
		donator = 0;
		donationnum = 0;
	} else {console.log(chalk.red('Commenting on bot\'s profile failed.'))}

}



