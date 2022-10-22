'use strict';

const TradeOfferManager = require('steam-tradeoffer-manager');
const SteamUser = require('steam-user');
const SteamCommunity = require('steamcommunity');
const fs = require('fs');

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

    //console.log(offer);
    var timestamp = (new Date()).getTime();
    manager._steam.chat.ackFriendMessage(offer.partner.getSteamID64(), timestamp);

});

//Functions
async function postComment(donator, donationnum) {

    if (donationnum < 50) {
        manager._community.postUserComment(config.botSteamID3, 'Thanks ' + donator + ' for your kind contribution of ' + donationnum + ' Items! :steamhappy:');
        console.log(chalk.green('Comment Posted on Bot\'s Profile'));
    } else {
        manager._community.postUserComment(config.botSteamID3, 'Thanks ' + donator + ' for your massive contribution of ' + donationnum + ' Items! :steamthumbsup: :csgoa:');
        console.log(chalk.green('Comment Posted on Bot\'s Profile'));
    }
}

async function processOffer(offer, them) {

    var itemToReceiveType = typeof (undefined);
    var itemToGiveType = typeof (undefined);
    if (offer.itemsToReceive.length === 1) {
        itemToReceiveType = helpers.getInventoryItemType(offer.itemsToReceive[0]);
    }
    //console.log(itemToReceiveType);
    //console.log(offer.itemsToReceive.length);

    if (offer.itemsToGive.length === 1) {
        itemToGiveType = helpers.getInventoryItemType(offer.itemsToGive[0]);
    }
    //console.log(itemToGiveType);
    //console.log(offer.itemsToGive.length);

    //console.log(offer.itemsToGive[0]);
    //console.log(offer.itemsToReceive[0]);

    //console.log(offer.itemsToGive[0].market_fee_app);
    //console.log(offer.itemsToReceive[0].market_fee_app);


    if (offer.partner.getSteamID64() === config.ownerSteamID64) {
        // Accept everything from bot's owner
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
                                console.log(chalk.magenta("=========================="));
                            } else {
                                console.log(chalk.green("Offer " + offer.id + ": Confirmed!"));
                                console.log(chalk.magenta("=========================="));
                            }
                        });
                    }, 2000);
                } else {
                    console.log(chalk.yellow('No confirmation needed (donation)'));
                    console.log(chalk.magenta("=========================="));
                }
            }
        });
        return;
    }


    if (offer.itemsToGive.length === 0) {
        // donation
        offer.accept((err, status) => {
            if (err) {
                console.log(err);
            } else {
                console.log(chalk.green(`Donation accepted from ${them.personaName}: ${offer.itemsToReceive.length} Item(s). Status: ${status}.`));
                console.log(chalk.magenta("=========================="));
                manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'Thanks for your generous donation! :pleased:');

                if (offer.itemsToReceive.length > 4) {
                    postComment(them.personaName, offer.itemsToReceive.length);
                }
            }
        });
        return;
    }


    // Check how many offers we got from a single user

    const path = __dirname;
    var goodtogo = 0;
    var data = 0;

    try {
        data = await fs.readFileSync(`${path}/cooldown/${offer.partner.getSteamID64()}`, 'utf8');
        if (data == null) {
            goodtogo = 0;
        } else {
            goodtogo = data;
            goodtogo = Number(goodtogo);
        }

    } catch (err) {
        console.log("No cooldown file found for " + them.personaName);
    }


    if (goodtogo === 5) {
        offer.decline(err => {
            if (err) {
                console.log(err);
            } else {
                console.log(chalk.red('Offer declined, ' + them.personaName + ' wanted to trade more than 5 times in a day.'));
                manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'Offer declined; you can only trade 5 times per day. Resets at 00:00 CET. Thanks for trading :deal_done:');
            }
        });
        return;
    }

    // Do other checks on Offers

    if (offer.itemsToGive.length > 1) {
        offer.decline(err => {
            if (err) {
                console.log(err);
            } else {
                console.log(chalk.red('Offer declined, ' + them.personaName + ' asked for more than 1 item.'));
                manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'Offer declined; we\'re only trading 1 item at time :steamsad:');
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
                manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'Offer declined: you didn\'t offer any item :steamsad:');

            }
        });
        return;
    }


    if (itemToGiveType === enums.InventoryItemType.Gems) {
        offer.decline(err => {
            if (err) {
                console.log(err);
            } else {
                console.log(chalk.red('Offer declined, ' + them.personaName + ' asked for gems.'));
                manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'Offer declined because you asked for Gems, which I don\'t currently trade :steamsad:');
            }
        });
        return;
    }


    if (config.lockedItems.some(x => x === offer.itemsToGive[0].name)) {
        offer.decline(err => {
            if (err) {
                console.log(err);
            } else {
                console.log(chalk.red('Offer declined, ' + them.personaName + ' asked for locked items in our Inventory.'));
                manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'Offer declined because you asked for locked items in our Inventory :steamsad:');
            }
        });
        return;
    }


    if (offer.itemsToGive[0].appid === 753 && offer.itemsToReceive[0].appid === 753 && offer.itemsToReceive.length === 1 && offer.itemsToGive.length === 1 && itemToReceiveType !== itemToGiveType) {
        offer.decline(err => {
            if (err) {
                console.log(err);
            } else {
                console.log(chalk.red('Offer declined, ' + them.personaName + ' asked for mismatched items, like emote for card, etc..'));
                manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'Offer declined because you asked for mismatched items, like emote for card, etc.. :steamsad:');
            }
        });
        return;
    }
    

    if (offer.itemsToGive[0].appid === 753 && offer.itemsToReceive[0].appid === 753 && offer.itemsToReceive.length > 1 && offer.itemsToGive.length === 1 && itemToReceiveType !== itemToGiveType) {
 
                console.log(chalk.red('Offer in review, ' + them.personaName + ' offered multiple items but mismatched, like emote for card, etc..'));
                manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'Offer in review because you sent multiple items but asked for mismatched ones, like emote for card, etc.. Give my owner up to 10hrs to accept or decline.');
                manager._steam.chatMessage(config.ownerSteamID3, 'Offer in progress, needs manual review!');
                return;
    }


    if (offer.itemsToGive.length === 1 && offer.itemsToReceive.length === 1) {
        if (offer.itemsToGive[0].appid !== offer.itemsToReceive[0].appid) {
            offer.decline(err => {
                if (err) {
                    console.log(err);
                } else {
                    console.log(chalk.red('Offer declined, ' + them.personaName + ' asked for items from different inventories.'));
                    manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'Offer declined because you asked to trade items from different Inventories :steamsad:');
                }
            });
            return;
        }
    }


    var cardBorderTypeToReceive = typeof (undefined);
    var cardBorderTypeToGive = typeof (undefined);

    if (itemToReceiveType === enums.InventoryItemType.Card && itemToGiveType === enums.InventoryItemType.Card) {

        cardBorderTypeToReceive = helpers.getCardBorderType(offer.itemsToReceive[0]);
        //console.log(cardBorderTypeToReceive);
        cardBorderTypeToGive = helpers.getCardBorderType(offer.itemsToGive[0]);
        //console.log(cardBorderTypeToGive);

        if (offer.itemsToReceive.length === 1 && offer.itemsToGive.length === 1 && cardBorderTypeToReceive != 1 && cardBorderTypeToGive == 1) {
            offer.decline(err => {
                if (err) {
                    console.log(err);
                } else {
                    console.log(chalk.red('Offer declined, ' + them.personaName + ' asked for cards with different border.'));
                    manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'Offer declined because you asked for cards with different border type, like Foil for Normal :steamsad:');
                }
            });
            return;
        }
    }


    offer.accept(async (err, status) => {

        if (err) {
            console.log(err);
        } else {
            console.log(chalk.green(`Accepted offer ${offer.id} from ${them.personaName}. Status: ${status}.`));

            // Count how many trade a user has successfully created

            if (goodtogo === 0) {
                fs.writeFile(`${path}/cooldown/${offer.partner.getSteamID64()}`, '1', function (err) {
                    console.log("goodtogo for " + them.personaName + " = 1");
                    if (err) return console.log(err);
                });
        
            } else {
                goodtogo = Number(goodtogo) + 1;
                console.log("goodtogo for " + them.personaName + " = " + goodtogo);
                fs.writeFile(`${path}/cooldown/${offer.partner.getSteamID64()}`, `${goodtogo}`, function (err) {
                    if (err) return console.log(err);
                });
            }

            // Confirm offer

            setTimeout(() => {
                manager._community.acceptConfirmationForObject(config.identitySecret, offer.id, function (err) {
                    if (err) {
                        console.log(chalk.red("Confirmation Failed for  " + offer.id + ": " + err));
                        console.log(chalk.magenta("=========================="));
                    } else {
                        console.log(chalk.green("Offer " + offer.id + ": Confirmed!"));
                        console.log(chalk.magenta("=========================="));
                    }
                });
            }, 2000);
        }
    });
}



module.exports = manager;