'use strict';

const TradeOfferManager = require('steam-tradeoffer-manager');
const SteamUser = require('steam-user');
const SteamCommunity = require('steamcommunity');

//console colors
const chalk = require('chalk');

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

    if (offer.itemsToGive.length === 0) {

        offer.accept((err, status) => {
            if (err) {
                console.log(err);
            } else {
                console.log(chalk.green('Donation accepted from' + offer.partner.getSteam3RenderedID() ));
                manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'Thanks for your generous donation!');

                if (offer.itemsToReceive.length > 4) {
                    postComment(them.personaName, offer.itemsToReceive.length);
                }
            }
        });

    } else {

        offer.decline(err => {
            if (err) {
                console.log(err);
            } else {
                console.log(chalk.red('Offer declined (wanted our items).'));
                manager._steam.chatMessage(offer.partner.getSteam3RenderedID(), 'I\'m only accepting donations. Sorry');
            }
        });
    }
}




module.exports = manager;
