/*

BOT'S INFO: ZED

Author:			roughnecks | http://steamcommunity.com/id/starshiptrooper/
Description:	SteamBot | Handles Trade Offers and Friends Invites
Date:			11 Jan. 2019
Version:		1.3

--------------------------------------------------------------------------

*/

//BOT START


require('console-stamp')(console, 'HH:MM');
//var cron = require('node-cron');


//Inizializing -- VARS


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

const ownerSteamID3 = config.ownerSteamID3;
const botSteamID3 = config.botSteamID3;

success = 0;
donator = 0;
donationnum = 0;


//Logging ON


client.logOn(logOnOptions);

client.on('loggedOn', function (details) {
	if (details.eresult == SteamUser.EResult.OK) {
		client.getPersonas([client.steamID], function (personas) {
			console.log("== Logged in =============")
			console.log('== Name: ' + personas[client.steamID]["player_name"]);
			console.log('== ID64: ' + client.steamID);
			console.log("==========================");
			console.log("");
		});
		client.setPersona(5); //"5": "LookingToTrade" -- https://github.com/DoctorMcKay/node-steam-user/blob/master/enums/EPersonaState.js
		client.gamesPlayed('Accepting Junk and Making Friends!');
	} else {
		console.log(details);
		//Do whatever u want to handle the error...
	}
});


//Session


client.on('webSession', (sessionid, cookies) => {
	manager.setCookies(cookies);
	community.setCookies(cookies);
	community.startConfirmationChecker(10000, config.identitySecret);

	//Checking for offline friend requests
	for (let i = 0; i < Object.keys(client.myFriends).length; i++) {
        if (client.myFriends[Object.keys(client.myFriends)[i]] == 2) {
			console.log('"for loop" inside websession executed.');
			client.addFriend(Object.keys(client.myFriends)[i]);
			console.log('Offline Friend Request Accepted.');
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



//Session refresh every 30 minutes


//cron.schedule('*/30 * * * *', () => {
//	if (client.steamID) {
//		console.log('Already logged in: ' + client.steamID);
//		client.webLogOn();
//	} else {
//		client.logOn(logOnOptions);
//		console.log('Logged in again using cron');
//	}
//});



//EVENTS


//Comments Check

//This will fire when we receive a comment
client.on('newComments', function(count, myItems, discussions) {
	if (count != 0) {
	console.log('New comment(s): ' + count);
	}
});


//Chat Messages Check

//This will fire when we receive a chat message from ANY friend
//client.on('friendMessage', function(steamID, message) {
//	client.getPersonas([steamID], function (personas) {
//		console.log('Friend message from ' + personas[steamID]["player_name"] + ': '  + message);
//	});
//});


//New Items Check

//This will fire when we receive any Items in our Inventory
//To reset its value we need to load Inventory while logged in
client.on('newItems', function(count) {
	if (count != 0) {
		client.chatMessage(ownerSteamID3, 'New Items in my Inventory - Check them out!'); 
		console.log('New Items in Inventory: ' + count);
	}
});


//Offer Incoming


manager.on('newOffer', offer => {

	if (offer.partner.getSteamID64() === '76561198061492959') {
		offer.accept((err, status) => {
			if (err) {
				console.log(err);
			} else {
				console.log(`Accepted offer from owner. Status: ${status}.`);
			}
		});
	} else {

		if (offer.itemsToGive.length === 0) {

			offer.getUserDetails((err, me, them) => {
				if (typeof (them) !== 'undefined') {
					donator = them.personaName;
					//console.log(`donator is: ${donator}`);
				} else { console.log('getuserdetails' + err); }
			});

			offer.accept((err, status) => {

				offer.getReceivedItems((err, items) => {
					if (typeof (items) !== 'undefined') {
						donationnum = items.length;
						//console.log(`donationnum is: ${donationnum}`);
					} else { console.log('getreceiveditems' + err); }
				});

				if (err) {
					console.log(err);
				} else {
					console.log(`Donation accepted. Status: ${status}.`);
					success = 1;
				}
			});

			setTimeout(postComment, 3000);

		} else {
			offer.decline(err => {
				if (err) {
					console.log(err);
				} else {
					console.log('Offer declined (wanted our items).');
				}
			});
		}
	}
});



//Accept friend requests


client.on('friendRelationship', (steamID, relationship) => {
	if (relationship === 2) {
		client.getPersonas([steamID], function (personas) {
			console.log('Adding New Friend: ' + personas[steamID]["player_name"]);
		});
		client.addFriend(steamID);
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


function postComment () {

	//console.log(`Before Commenting: success = ${success}; donator = ${donator}; donationnum = ${donationnum}`);
	if ((success == 1) && (donator) && (donationnum)) {
		community.postUserComment(botSteamID3, 'Thanks ' + donator + ' for your kind contribution of ' + donationnum + ' Item(s)! :steamhappy:');
		console.log('Comment Posted on Bot\'s Profile');
		
		success = 0;
		donator = 0;
		donationnum = 0;
		//console.log(`After Commenting: success = ${success}; donator = ${donator}; donationnum = ${donationnum}`);
	} else {console.log('Commenting on bot\'s profile failed: This is a known bug when bot receives its first offer after startup.')}

}