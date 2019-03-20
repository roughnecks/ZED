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

    } else if (offer.message === 'lottery') {

        await processLottery(offer, them);

    } else {

        console.log('Not a lottery; continue checking if it\'s a donation');

        if (offer.itemsToGive.length === 0) {

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

            manager._steam.chatMessage(config.ownerSteamID3, 'New Trade Offer asking for our Items');
        }
    }
}

async function processLottery(offer, them) {
    if (!them || typeof them.escrowDays === 'undefined') {

        manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'Something went wrong, could not check Escrow');
        return console.log(chalk.red('Something went wrong, could not check Escrow (null)'));

    } else if (them.escrowDays > 0) {

        manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'You\'re in Escrow - Cannot Participate in Lottery :(');
        return console.log(chalk.red('User in Escrow - Aborting Lottery: escrow = ' + them.escrowDays));

    } else {

        if (offer.itemsToGive.length === 0 &&
            offer.itemsToReceive.length === 1 &&
            offer.itemsToReceive[0].appid === 753 &&
            offer.itemsToReceive[0].contextid === '6' &&
            offer.itemsToReceive[0].amount === 1 &&
            offer.itemsToReceive[0].type !== 'Steam Gems') {

            var itemType = helpers.getInventoryItemType(offer.itemsToReceive[0]);

            if (itemType !== enums.InventoryItemType.Unknown) {

                //console.log('itemtype= ' + itemType);
                
                console.log(chalk.green('Lottery is good to go'));

                offer.accept((err, status) => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(chalk.green(`Lottery accepted. Status: ${status}.`));
                    }

                });

                var inventory = await helpers.loadInventory(config.botSteamID64, 753, 6, true);
                //console.log(inventory);
                //return;

                const reducedInv = inventory.filter(function (element) {

                    for (var i in config.lockedItems) {
                        return (element.name != config.lockedItems[i]);
                    }
    
                });

                //create new array with just 1 type of items (cards - bgs - emotes -boosters)
                var filteredInv = new Array();
                reducedInv.forEach(element => {
                    if (itemType == 2) {
                        let tag;
                        if ((tag = element.getTag('item_class')) && tag.internal_name == 'item_class_2') {
                            //console.log(tag) 
                            filteredInv.push(element);
                        }
                    } else if (itemType == 3) {
                        let tag;
                        if ((tag = element.getTag('item_class')) && tag.internal_name == 'item_class_3') {
                            //console.log(tag) 
                            filteredInv.push(element);
                        }
                    } else if (itemType == 4) {
                        let tag;
                        if ((tag = element.getTag('item_class')) && tag.internal_name == 'item_class_4') {
                            //console.log(tag) 
                            filteredInv.push(element);
                        }
                    } else if (itemType == 5) {
                        let tag;
                        if ((tag = element.getTag('item_class')) && tag.internal_name == 'item_class_5') {
                            //console.log(tag) 
                            filteredInv.push(element);
                        }
                    }
                });

                const itemToGive = filteredInv[Math.floor(Math.random() * filteredInv.length - 1)];
                //console.log(itemToGive);

                lotterySend(offer.partner, itemToGive, itemType);

            } else {
                offer.decline(err => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(chalk.red('Offer declined (Bad Item Type or Number).'));
                        manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'You sent more than 1 item, asked for any of my items or sent an item which is not supported by lottery; valid types are "Cards-BGs-Emotes-Boosters"');
                    }
                });
            }
        }
    }
}

async function lotterySend(partner, itemToGive, itemType) {
    //await helpers.sleep(5000);

    console.log('Lottery Item is: ' + enums.InventoryItemType.properties[itemType].name);

    manager._steam.chatMessage(partner.getSteam3RenderedID(),
        'I just received 1 ' + enums.InventoryItemType.properties[itemType].name + ' item for the lottery; sending a random ' + enums.InventoryItemType.properties[itemType].name + ' back now!');

    const offer = manager.createOffer(partner.getSteam3RenderedID());

    offer.addMyItem(itemToGive);
    offer.setMessage(`Lucky you! You get a ${itemToGive.name}!`);
    offer.send((err, status) => {
        if (err) {
            console.log(err);
        } else {
            console.log(chalk.yellow(`Sent offer. Status: ${status}.`));
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