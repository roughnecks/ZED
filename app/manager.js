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
const { CannotUseOldPassword } = require('steam-tradeoffer-manager/resources/EResult');

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
            if (them.escrowDays > 0) {
                offer.decline(err => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(chalk.red('Offer declined, ' + them.personaName + ' is in escrow.'));
                        manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'Offer declined; you are in Escrow (trade hold) :steamsad:');
                        console.log(chalk.cyan("=========================="));
                    }
                });
                return;
            } else {
                processOffer(offer, them);
            }
        } else {
            console.log('getuserdetails: ' + err);
        }
    });

    //console.log(offer);
    var timestamp = (new Date()).getTime();
    manager._steam.chat.ackFriendMessage(offer.partner.getSteamID64(), timestamp);

});

//Functions
async function postComment(donator, donationnum, donatorID3) {

    if (donationnum < 50) {
        manager._community.postUserComment(config.botSteamID3, 'Thanks ' + donator + ' for your kind contribution of ' + donationnum + ' Items! :steamhappy:');
        console.log(chalk.green('Comment Posted on Bot\'s Profile'));

        manager._community.postUserComment(donatorID3, 'Thanks ' + donator + ' for your kind contribution of ' + donationnum + ' Items! :steamhappy:');
        console.log(chalk.green('Comment Posted on Donator\'s Profile'));

        console.log(chalk.cyan("=========================="));
    } else {
        manager._community.postUserComment(config.botSteamID3, 'Thanks ' + donator + ' for your massive contribution of ' + donationnum + ' Items! :awesome:');
        console.log(chalk.green('Comment Posted on Bot\'s Profile'));

        manager._community.postUserComment(donatorID3, 'Thanks ' + donator + ' for your massive contribution of ' + donationnum + ' Items! :awesome:');
        console.log(chalk.green('Comment Posted on Donator\'s Profile'));

        console.log(chalk.cyan("=========================="));
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
    //console.log("offer hash = " + offer.itemsToReceive[0].market_hash_name);

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
                                console.log(chalk.cyan("=========================="));
                            } else {
                                console.log(chalk.green("Offer " + offer.id + ": Confirmed!"));
                                console.log(chalk.cyan("=========================="));
                            }
                        });
                    }, 2000);
                } else {
                    console.log(chalk.green('No confirmation needed (donation)'));
                    console.log(chalk.cyan("=========================="));
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
                console.log(chalk.cyan("=========================="));
                manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'Thanks for your generous donation! :pleased:');

                if (offer.itemsToReceive.length > 4) {
                    let couponsQty = 0;
                    for (let i = 0; i < offer.itemsToReceive.length; i++) {
                        if (helpers.getInventoryItemType(offer.itemsToReceive[i]) == enums.InventoryItemType.Coupon) {
                            couponsQty++;
                        }
                    }
                    if (couponsQty === offer.itemsToReceive.length) {
                        //all coupons
                        return;
                    } else {
                        postComment(them.personaName, offer.itemsToReceive.length, offer.partner.getSteam3RenderedID());
                    }
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
        data = fs.readFileSync(`${path}/cooldown/${offer.partner.getSteamID64()}`, 'utf8');
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
                console.log(chalk.cyan("=========================="));
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
                console.log(chalk.cyan("=========================="));
            }
        });
        return;
    }

    if (offer.itemsToGive.length === 1 && offer.itemsToReceive.length < 1) {
        if (itemToGiveType === enums.InventoryItemType.Coupon) {
            acceptOffer(offer, them, goodtogo, path);
            return;
        } else {
            offer.decline(err => {
                if (err) {
                    console.log(err);
                } else {
                    console.log(chalk.red('Offer declined, ' + them.personaName + ' didn\'t offer any item.'));
                    manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'Offer declined: you didn\'t offer any item :steamsad: (Coupons are always free)');
                    console.log(chalk.cyan("=========================="));

                }
            });
            return;
        }
    }


    if (itemToGiveType === enums.InventoryItemType.Gems) {
        offer.decline(err => {
            if (err) {
                console.log(err);
            } else {
                console.log(chalk.red('Offer declined, ' + them.personaName + ' asked for gems.'));
                manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'Offer declined because you asked for :Gems:, which I don\'t currently trade :steamsad:');
                console.log(chalk.cyan("=========================="));
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
                manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'Offer declined because you asked for locked items in our Inventory: read my profile to know which they are..');
                console.log(chalk.cyan("=========================="));
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
                console.log(chalk.cyan("=========================="));
            }
        });
        return;
    }
    

    if (offer.itemsToGive[0].appid === 753 && offer.itemsToReceive[0].appid === 753 && offer.itemsToReceive.length > 1 && offer.itemsToGive.length === 1) {

        if (offer.itemsToReceive.length > 1) {
            let itemsQty = 0;
            for (let i = 0; i < offer.itemsToReceive.length; i++) {
                if (helpers.getInventoryItemType(offer.itemsToReceive[i]) == helpers.getInventoryItemType(offer.itemsToGive[0])) {
                    itemsQty++;
                }
            }
            if (itemsQty === offer.itemsToReceive.length) {
                // all of the same items type
                acceptOffer(offer, them, goodtogo, path);
                return;
            } else {
                console.log(chalk.red('Offer in review, ' + them.personaName + ' offered multiple items but mismatched, like emote for card, etc..'));
                manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'Offer in review because you sent multiple items but asked for mismatched ones, like emote for card, etc.. Give my owner up to 10hrs to accept or decline.');
                manager._steam.chatMessage(config.ownerSteamID3, 'Offer in progress, needs manual review!');
                console.log(chalk.cyan("=========================="));
                return;
            }
        }
    }


    if (offer.itemsToGive.length === 1 && offer.itemsToReceive.length === 1) {
        if (offer.itemsToGive[0].appid !== offer.itemsToReceive[0].appid) {
            offer.decline(err => {
                if (err) {
                    console.log(err);
                } else {
                    console.log(chalk.red('Offer declined, ' + them.personaName + ' asked for items from different inventories.'));
                    manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'Offer declined because you asked to trade items from different Inventories :steamsad:');
                    console.log(chalk.cyan("=========================="));
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
                    manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'Offer declined because you asked for :tradingcard: with different border type, like Foil for Normal :steamsad:');
                    console.log(chalk.cyan("=========================="));
                }
            });
            return;
        }

        if (offer.itemsToReceive.length === 1 && offer.itemsToGive.length === 1 && cardBorderTypeToReceive === cardBorderTypeToGive) {


            if ((offer.itemsToGive[0].market_fee_app == 2243720) && (offer.itemsToReceive[0].market_fee_app != 2243720)) {
                offer.decline(err => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(chalk.red('Offer Declined, '+ them.personaName + ' asked for Holiday cards in return for other cards'));
                        manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'Offer declined because you asked for Holiday cards in return for other cards');
                        console.log(chalk.cyan("=========================="));
                    }
                });
                return;
            }


            manager._community.getUserInventoryContents(config.botSteamID3, 753, 6, true, (err, inventory) => {
                if (err) {
                    console.log(chalk.red('An error occurred while getting my Inventory'));
                    manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'An error occurred while getting my Inventory, please try again later');
                    //throw err;
                    return;
                }







                if ((offer.itemsToGive[0].market_fee_app == 2243720) && (offer.itemsToReceive[0].market_fee_app == 2243720)) {
                    var winterCards = [];
                    for (let i = 0; i < inventory.length; i++) {
                        if (inventory[i].market_hash_name === offer.itemsToGive[0].market_hash_name) {
                            winterCards.push(i);
                            //console.log("inventory hash = " + inventory[i].market_hash_name);
                        }
                    }
                    
                    if (winterCards.length == 1) {
                        offer.decline(err => {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log(chalk.red('Offer declined, ' + them.personaName + ' wanted to trade a winter card for which we only have one copy.'));
                                manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'Offer declined because we only have 1 copy left of that winter card :steamsad:');
                                console.log(chalk.cyan("=========================="));
                            }
                        });
                        return;
                    }
                }









                var items = [];
                for (let i = 0; i < inventory.length; i++) {
                    if (inventory[i].market_hash_name === offer.itemsToReceive[0].market_hash_name) {
                        items.push(i);
                        //console.log("inventory hash = " + inventory[i].market_hash_name);
                    }
                }
                if (items.length >= 5) {
                    offer.decline(err => {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log(chalk.red('Offer declined, ' + them.personaName + ' wanted to trade a card which we have in a number greater or equal than 5.'));
                            manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'Offer declined because you offered :tradingcard: which we already have in a number greater or equal to 5 :steamsad:');
                            console.log(chalk.cyan("=========================="));
                        }
                    });
                    return;
                }

                acceptOffer(offer, them, goodtogo, path);

            });
            return;
        }
    }

    if ((itemToReceiveType === itemToGiveType) && ((itemToReceiveType === enums.InventoryItemType.Emote) || (itemToReceiveType === enums.InventoryItemType.Background))) {
        manager._community.getUserInventoryContents(config.botSteamID3, 753, 6, true, (err, inventory) => {
            if (err) {
                console.log(chalk.red('An error occurred while getting my Inventory'));
                manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'An error occurred while getting my Inventory, please try again later');
                //throw err;
                return;
            }
            var items = [];
            for (let i = 0; i < inventory.length; i++) {
                if (inventory[i].market_hash_name === offer.itemsToReceive[0].market_hash_name) {
                    items.push(i);
                    //console.log("inventory hash = " + inventory[i].market_hash_name);
                }
            }

            if (items.length >= 2) {
                offer.decline(err => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(chalk.red('Offer declined, ' + them.personaName + ' wanted to trade a background/emote which we have in a number greater or equal than 2.'));
                        manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'Offer declined because you offered an emothe/BG which we already have in a number greater or equal to 2 :steamsad:' + "\n" + 'Use steamtradematcher to swap duplicates instead..');
                        console.log(chalk.cyan("=========================="));
                    }
                });
                return;
            }

            acceptOffer(offer, them, goodtogo, path);

        });
        return;
    }

    acceptOffer(offer, them, goodtogo, path);

}

async function acceptOffer(offer, them, goodtogo, path) {

    offer.accept(async (err, status) => {

        if (err) {
            console.log(err);
        } else {
            console.log(chalk.yellow(`Accepted offer ${offer.id} from ${them.personaName}. Status: ${status}.`));

            // Count how many trade a user has successfully created

            if (goodtogo === 0) {
                fs.writeFile(`${path}/cooldown/${offer.partner.getSteamID64()}`, '1', function (err) {
                    console.log("goodtogo for " + them.personaName + " = 1/5");
                    if (err) return console.log(err);
                });

            } else {
                goodtogo = Number(goodtogo) + 1;
                console.log("goodtogo for " + them.personaName + " = " + goodtogo + "/5");
                fs.writeFile(`${path}/cooldown/${offer.partner.getSteamID64()}`, `${goodtogo}`, function (err) {
                    if (err) return console.log(err);
                });
            }

            // Confirm offer

            setTimeout(() => {
                manager._community.acceptConfirmationForObject(config.identitySecret, offer.id, function (err) {
                    if (err) {
                        console.log(chalk.red("Confirmation Failed for  " + offer.id + ": " + err));
                        console.log(chalk.cyan("=========================="));
                    } else {
                        console.log(chalk.green("Offer " + offer.id + ": Confirmed!"));
                        console.log(chalk.cyan("=========================="));
                    }
                });
            }, 2000);
        }
    });
}


module.exports = manager;