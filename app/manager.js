'use strict';

const TradeOfferManager = require('steam-tradeoffer-manager');
const SteamUser = require('steam-user');
const SteamCommunity = require('steamcommunity');

//console colors
const chalk = require('chalk');

const helpers = require('./helpers');
const enums = require('./enums');
const config = require('../config.json');

const manager = new TradeOfferManager({
    steam: new SteamUser(),
    community: new SteamCommunity(),
    language: 'en'
});

//EVENTS

//Offer Incoming
manager.on('newOffer', offer => {

    offer.getUserDetails((err, me, them) => {
        if (typeof them !== 'undefined') {
            processOffer(offer, them);
        }
        else {
            console.log('getuserdetails: ' + err);
        }
    });

});

//Functions
async function postComment(donator, donationnum) {

    manager._community.postUserComment(config.botSteamID3, 'Thanks ' + donator + ' for your kind contribution of ' + donationnum + ' Item(s)! :steamhappy:');
    console.log(chalk.green('Comment Posted on Bot\'s Profile'));

}

async function processOffer(offer, them) {

    var itemToReceiveType = typeof (undefined);
    var itemToGiveType = typeof (undefined);
    if (offer.itemsToReceive.length === 1) {
        itemToReceiveType = helpers.getInventoryItemType(offer.itemsToReceive[0]);
    }
    //console.log(itemToReceiveType);
    if (offer.itemsToGive.length === 1) {
        itemToGiveType = helpers.getInventoryItemType(offer.itemsToGive[0]);
    }
    //console.log(itemToGiveType);

    if (offer.itemsToGive.length === 0) {
        // donation
        offer.accept((err, status) => {
            if (err) {
                console.log(err);
            } else {
                console.log(chalk.green(`Donation accepted. Status: ${status}.`));
                manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'Thanks for your generous donation!');

                if (offer.itemsToReceive.length > 4) {
                    postComment(them.personaName, offer.itemsToReceive.length);
                }
            }
        });
        return;
    }

    if (offer.partner.getSteamID64() === config.ownerSteamID64) {

        offer.accept(async (err, status) => {
            if (err) {
                console.log(err);
            } else {
                console.log(chalk.green(`Accepted offer ${offer.id} from owner. Status: ${status}.`));
                if (offer.itemsToGive.length > 0) {
                    setTimeout(() => {
                        manager._community.acceptConfirmationForObject(config.identitySecret, offer.id, function (err) {
                            if (err) {
                                console.log(chalk.red("Confirmation Failed for  " + offer.id + ": " + err));
                            } else {
                                console.log(chalk.green("Offer " + offer.id + ": Confirmed!"));
                            }
                        });
                    }, 2000);
                } else { console.log(chalk.yellow('No confirmation needed (donation)')); }
            }
        });
        return;
    }

    if (offer.itemsToReceive.length === 1 && itemToReceiveType !== itemToGiveType) {
        offer.decline(err => {
            if (err) {
                console.log(err);
            } else {
                console.log(chalk.red('Offer declined, ' + them.personaName + ' asked for mismatched items, like emote for card etc...'));
            }
        });
        return;
    }

    var cardBorderTypeToReceive = typeof (undefined);
    var cardBorderTypeToGive = typeof (undefined);
    if (itemToReceiveType === enums.InventoryItemType.Card) {
        
        cardBorderTypeToReceive = helpers.getCardBorderType(offer.itemsToReceive[0]);
        console.log(cardBorderTypeToReceive);
        cardBorderTypeToGive = helpers.getCardBorderType(offer.itemsToGive[0]);
        console.log(cardBorderTypeToGive);

        if (offer.itemsToReceive.length === 1 && cardBorderTypeToReceive !== cardBorderTypeToGive) {
            offer.decline(err => {
                if (err) {
                    console.log(err);
                } else {
                    console.log(chalk.red('Offer declined, ' + them.personaName + ' asked for cards with different border.'));
                }
            });
            return;
        }
    }

    if (offer.itemsToGive.length === 1 && offer.itemsToReceive.length === 1) {
        if (offer.itemsToGive[0].appId !== offer.itemsToReceive[0].appId) {
            offer.decline(err => {
                if (err) {
                    console.log(err);
                } else {
                    console.log(chalk.red('Offer declined, ' + them.personaName + ' asked for items from different appID.'));
                }
            });
            return;
        }
    }

    if (offer.itemsToGive.length > 1) {
        offer.decline(err => {
            if (err) {
                console.log(err);
            } else {
                console.log(chalk.red('Offer declined, ' + them.personaName + ' asked for more than 1 item.'));
            }
        });
        return;
    }

    if (offer.itemsToGive.length === 1 && offer.itemsToReceive.length < 1) {
        offer.decline(err => {
            if (err) {
                console.log(err);
            } else {
                console.log(chalk.red('Offer declined, ' + them.personaName + ' didn\'t offer any item.'));
            }
        });
        return;
    }


    offer.accept(async (err, status) => {

        if (err) {
            console.log(err);
        } else {
            console.log(chalk.green(`Accepted offer ${offer.id} from ${them.personaName}. Status: ${status}.`));

            setTimeout(() => {
                manager._community.acceptConfirmationForObject(config.identitySecret, offer.id, function (err) {
                    if (err) {
                        console.log(chalk.red("Confirmation Failed for  " + offer.id + ": " + err));
                    } else {
                        console.log(chalk.green("Offer " + offer.id + ": Confirmed!"));
                    }
                });
            }, 2000);
        }
    });
}



module.exports = manager;