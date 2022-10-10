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

    var itemToReceiveType = typeof(undefined);
        if (offer.itemsToReceive.length == 1) {
            itemToReceiveType = helpers.getInventoryItemType(offer.itemsToReceive[0]);
        }
    
    var itemToGiveType = typeof(undefined);
        if (offer.itemsToGive.length == 1) {
            itemToGiveType = helpers.getInventoryItemType(offer.itemsToGive[0]);
        }
    

    if (itemToReceiveType === 2 && itemToGiveType === 2) {
        var cardBorderTypeToReceive = typeof(undefined);
        if (offer.itemsToReceive.length == 1) {
            cardBorderTypeToReceive = helpers.getCardBorderType(offer.itemToReceiveType[0]);
        }
        var cardBorderTypeToGive = typeof(undefined);
        if (offer.itemsToGive.length == 1) {
            cardBorderTypeToGive = helpers.getCardBorderType(offer.itemToGiveType[0]);
        }
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

    } else if (offer.itemsToGive.length === 0) {
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


    } else if (offer.itemsToGive.length === 1 && offer.itemsToReceive.length === 1) {
        if (offer.itemsToGive[0].appId !== offer.itemsToReceive[0].appId) {
            offer.decline(err => {
                if (err) {
                    console.log(err);
                } else {
                    console.log(chalk.red('Offer declined, ' + them.personaName + ' asked for items from different appID.'));
                }
            });

        } else {

            if (itemToReceiveType !== enums.InventoryItemType.Unknown && itemToReceiveType === itemToGiveType) {

                if (itemToReceiveType === 2 && itemToGiveType === 2 && cardBorderTypeToGive !== cardBorderTypeToReceive) {


                    offer.decline(err => {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log(chalk.red('Offer declined, ' + them.personaName + ' asked for cards with different borders (normal-foil).'));
                        }
                    });

                } else {

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

            } else {

                offer.decline(err => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(chalk.red('Offer declined, ' + them.personaName + ' asked for mismatched type of items.'));
                    }
                });
            }
        }
    }
}


module.exports = manager;