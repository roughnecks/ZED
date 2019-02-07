/*

BOT'S INFO: ZED

Author:         roughnecks | http://steamcommunity.com/id/starshiptrooper/
Description:    SteamBot | Handles Trade Offers and Friends Invites
Date:           11 Jan. 2019

--------------------------------------------------------------------------

*/

//BOT START


require('console-stamp')(console, 'HH:MM:ss');
var cron = require('node-cron');


//Inizializing -- VARS

//BoT version
const version = 'v1.4.0';

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
const ownerSteamID64 = config.ownerSteamID64;
const ownerSteamID3 = config.ownerSteamID3;
const botSteamID3 = config.botSteamID3;
const game = config.customGame;

var success = 0;
var donator = 0;
var donationnum = 0;
var lottery = 0;
var tradeOfferObject;
var themEscrow = null;
var cooldown = {};

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
			console.log(chalk.bgBlue(game));
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


community.on('sessionExpired', function (err) {
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


//Session refresh every 30 minutes


cron.schedule('*/30 * * * *', () => {
	if (client.steamID) {
		//console.log('Already logged in: ' + client.steamID);
		client.webLogOn();
		//console.log('Called weblogon from cron');
	} else {
		client.logOn(logOnOptions);
		console.log('Logged in again using cron');
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


//Offer Incoming


manager.on('newOffer', offer => {

	tradeOfferObject = offer;

	offer.getUserDetails((err, me, them) => {
		if (typeof (them) !== 'undefined') {
			themEscrow = them.escrowDays;
		}
	});

	if (offer.partner.getSteamID64() === ownerSteamID64) {
		offer.accept((err, status) => {
			if (err) {
				console.log(err);
			} else {
				console.log(chalk.green(`Accepted offer ${offer.id} from owner. Status: ${status}.`));
				if (offer.itemsToGive.length > 0) {
					setTimeout(() => {
						community.acceptConfirmationForObject(identitySecret, offer.id, function (err) {
							if (err) {
								console.log(chalk.red("Confirmation Failed for  " + offer.id + ": " + err));
							} else {
								console.log(chalk.green("Offer " + offer.id + ": Confirmed!"));
							}
						});
					}, 2000);
				} else { console.log(chalk.yellow('No confirmation needed (donation)')) }
			}
		});

	} else if (offer.message == 'lottery') {

		setTimeout(() => {

			if (themEscrow > 0) {

				client.chatMessage(offer.partner.getSteam3RenderedID(), 'You\'re in Escrow - Cannot Participate in Lottery :(');
				return console.log(chalk.red('User in Escrow - Aborting Lottery: escrow = ' + themEscrow));

			} else if (themEscrow === null) {

				client.chatMessage(offer.partner.getSteam3RenderedID(), 'Something went wrong, could not check Escrow');
				return console.log(chalk.red('Something went wrong, could not check Escrow (null)'));

			} else {

				if (lottery == 0) {

					if ((offer.itemsToGive.length === 0) && (offer.itemsToReceive.length === 1) && (offer.itemsToReceive[0].appid == 753) && (offer.itemsToReceive[0].contextid == 6)
						&& (offer.itemsToReceive[0].amount == 1) && (offer.itemsToReceive[0].type !== 'Steam Gems')) {
						console.log(chalk.green('Lottery is good to go'));

						offer.accept((err, status) => {
							if (err) {
								console.log(err);
							} else {
								console.log(chalk.green(`Lottery accepted. Status: ${status}.`));
							}
						});

						//Save partner info and timestamp to implement a cooldown

						

						offer.itemsToReceive[0].tags.forEach(element => {
							//console.log(element);
							if (element.internal_name.includes('item_class_2')) {
								lottery = 'card';
								lotterySend();
							} else if (element.internal_name.includes('item_class_3')) {
								lottery = 'background';
								lotterySend();
							} else if (element.internal_name.includes('item_class_4')) {
								lottery = 'emote';
								lotterySend();
							} else if (element.internal_name.includes('item_class_5')) {
								lottery = 'booster';
								lotterySend();
							}
						});

					} else {
						offer.decline(err => {
							if (err) {
								console.log(err);
							} else {
								console.log(chalk.red('Offer declined (Bad Item Type or Number).'));
								client.chatMessage(offer.partner.getSteam3RenderedID(), 'You sent more than 1 item, asked for any of my items or sent an item which is not supported by lottery; valid types are "Cards-BGs-Emotes-Boosters"');
							}
						});
					}
				} else {
					offer.decline(err => {
						if (err) {
							console.log(err);
						} else {
							console.log(chalk.red('Lottery declined - Already in Progress.'));
							client.chatMessage(offer.partner.getSteam3RenderedID(), 'One Lottery is already in progress, please wait a few seconds and try again. Thanks');
						}
					});
				}

			}
		}, 5000);

	} else {

		console.log('Not a lottery; continue checking if it\'s a donation');

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
									//console.log(items);
									console.log('Items Amount: ' + donationnum);
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

			/*
			offer.decline(err => {
				if (err) {
					console.log(err);
				} else {
					console.log(chalk.red('Offer declined (wanted our items).'));
				}
			});
			*/

			client.chatMessage(ownerSteamID3, 'New Trade Offer asking for our Items');
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
		client.chatMessage(steamID, 'Lottery RULES:' + "\n" + '1) Send any 1 "Trading Card - Background - Emoticon - Booster Pack" to me and write "lottery" (without the quotes) in the comment section of the trading offer window. I\'ll send back a random item of the same type.' + "\n" + '2) You have to be friend with me.' + "\n" +'3) You must not be in Trading Escrow.');	
	}
	else {
		client.chatMessage(steamID, 'I don\'t understand any other command but "!help", "!sign" and "!lottery" (so far).');
	}
});


//Functions


function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function postComment() {

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
	} else { console.log(chalk.red('Commenting on bot\'s profile failed.')) }

}


async function lotterySend() {

	await sleep(5000);

	console.log('Lottery Item is: ' + lottery);
	var filteredInv = new Array();

	client.chatMessage(tradeOfferObject.partner.getSteam3RenderedID(), 'I just received 1 ' + lottery + ' item for the lottery; sending a random ' + lottery + ' back now!');

	manager.loadInventory(753, 6, true, (err, inventory) => {

		if (err) {
			console.log(err);
		} else {

			const offer = manager.createOffer(tradeOfferObject.partner.getSteam3RenderedID());

			//filter items bot owns and are not up for trading
			const reducedInv = inventory.filter(function (element) {
				return ((element.name != ':meltdownzed:') && (element.name != ':tradingcard:') && (element.name != ':PrisDrone:') && (element.name != ':goldfeatherduster:') &&
					(element.name != ':dustpan:') && (element.name != ':deal_done:') && (element.name != ':ChipWink:') && (element.name != 'Zed Background'));
			});

			//create new array with just 1 type of items (cards - bgs - emotes -boosters)
			reducedInv.forEach(element => {
				if (lottery == 'card') {
					let tag;
					if ((tag = element.getTag('item_class')) && tag.internal_name == 'item_class_2') {
						//console.log(tag) 
						filteredInv.push(element);
					}
				} else if (lottery == 'background') {
					let tag;
					if ((tag = element.getTag('item_class')) && tag.internal_name == 'item_class_3') {
						//console.log(tag) 
						filteredInv.push(element);
					}
				} else if (lottery == 'emote') {
					let tag;
					if ((tag = element.getTag('item_class')) && tag.internal_name == 'item_class_4') {
						//console.log(tag) 
						filteredInv.push(element);
					}
				} else if (lottery == 'booster') {
					let tag;
					if ((tag = element.getTag('item_class')) && tag.internal_name == 'item_class_5') {
						//console.log(tag) 
						filteredInv.push(element);
					}
				}
			});


			const item = filteredInv[Math.floor(Math.random() * filteredInv.length - 1)];

			offer.addMyItem(item);
			offer.setMessage(`Lucky you! You get a ${item.name}!`);
			offer.send((err, status) => {
				if (err) {
					console.log(err);
				} else {
					console.log(`Sent offer. Status: ${status}.`);
					setTimeout(() => {
						community.acceptConfirmationForObject(identitySecret, offer.id, function (err) {
							if (err) {
								console.log(chalk.red("Confirmation Failed for  " + offer.id + ": " + err));
							} else {
								console.log(chalk.green("Offer " + offer.id + ": Confirmed!"));
							}
						});
					}, 2000);
					lottery = 0;
					themEscrow = null;
				}
			});
		}
	});
}


