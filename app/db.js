'use strict';

const MongoClient = require('mongodb').MongoClient;
const config = require('../config.json');

const helpers = require('./helpers');
const enums = require('./enums');

const chalk = require('chalk');

const _db = {
    db: null,

    client: new MongoClient(config.db.connectionString, { useNewUrlParser: true }),

    connect: async function () {
        try {
            // Use connect method to connect to the Server
            await this.client.connect();
            console.log(chalk.green("Connected successfully to DB Server"));

            this.db = this.client.db('zed');
            return true;
        } catch (err) {
            console.log(err.stack);
            return false;
        }
    },

    disconnect: function () {
        this.client.close();
        console.log('Connection closed');
    },

    //Check if 'counters' collection exists and if not, create it
    checkCollection: async function () {

        var odb = this.db;
        odb.listCollections().toArray(function (err, collInfos) {
            // collInfos is an array of collection info objects that look like:
            // { name: 'test', options: {} }
            //console.log(collInfos);
            var found = false;
            for (var i = 0; i < collInfos.length; i++) {
                if (collInfos[i].name == 'counters') {
                    found = true;
                    break;
                }
            }
            if (!found) {
                var dbItem = {
                    _id: "quoteID",
                    sequence_value: 1
                };
                odb.collection('counters').insertOne(dbItem);
            }
        });
    },    


    checkData: async function () {
        if (await this.db.collection('inventory_items').countDocuments() === 0) {
            await this.initInventoryItems();
        } else {
            if (config.syncInventoryWithDbOnStartup) {
                console.log('syncInventoryWithDbOnStartup is set to true. Inventory will be synced with DB.');
                await this.syncInventoryWithDb();
            }

            if (config.updatePricesOnStartup) {
                console.log('updatePricesOnStartup is set to true. Prices will be updated in background.');
                this.updatePricesInDb();
            }
        }
    },

    initInventoryItems: async function () {
        console.log('Trying to load inventory');
        var inventory = await helpers.loadInventory(config.botSteamID64, 753, 6, true);
        console.log(chalk.green('Inventory loaded: ' + inventory.length + ' item(s)'));

        console.log(chalk.yellow('Updating prices... This might take a while.'));
        if (inventory && inventory.length > 0) {
            //filter items that bot owns and are not up for trading
            let reducedInv = inventory.filter(el => !config.lockedItems.some(x => x === el.name));

            //save tradable items to db
            //There is limit for number of requests so we will update items one by one. Ideally there should be a delay between requests
            for (let el of reducedInv) {
                await this.insertInventoryItem(el);
                await helpers.sleep(2500);
            }
        }
    },

    getInventoryItem: async function (assetId) {
        var items = await this.db.collection('inventory_items').find({ assetId: assetId }).toArray();

        if (items.length === 1) {
            return items[0];
        } else if (items.length > 1) {
            console.log(chalk.red('Something went wrong: assetId must be unique!'));
        }
    },

    insertInventoryItem: async function (item) {
        var dbItem = {
            assetId: item.assetid,
            name: item.name,
            market_hash_name: item.market_hash_name,
            type: helpers.getInventoryItemType(item),
            marketable: item.marketable,
            price: item.marketable ? await helpers.getInventoryItemPrice(item.market_hash_name) : 0
        };
        try {
            await this.db.collection('inventory_items').insertOne(dbItem);
        } catch (e) {
            console.error(e);
        }
    },

    insertReceivedItems: async function (receivedItems) {
        if (receivedItems && receivedItems.length > 0) {
            //Save received items to db
            //There is limit for number of requests so we will update items one by one. Ideally there should be a delay between requests
            //But on the other hand the delay shouldn't be too long because we want't user to wait too long
            for (let item of receivedItems) {
                //Only cards, boosters, backgrounds and emotes are aloowed for lottery so we don't want to save to DB any other items
                //Locked items are also excluded
                if (item.appid === 753 && item.contextid === '6' && helpers.getInventoryItemType(item) !== enums.InventoryItemType.Unknown && !config.lockedItems.some(x => x === item.name)) {
                    await this.insertInventoryItem(item);
                    await helpers.sleep(500);
                }
            }
        }
    },

    updateInventoryItem: async function (assetId, price) {

        try {
            await this.db.collection('inventory_items').updateOne({ assetId: assetId }, { $set: { price: price } });
        } catch (e) {
            console.error(e);
        }
    },

    deleteGivenItems: async function (items) {
        for (let item of items) {
            //DB contains only cards, boosters, backgrounds and emotes
            //Locked items are also excluded
            if (item.appid === 753 && item.contextid === '6' && helpers.getInventoryItemType(item) !== enums.InventoryItemType.Unknown && !config.lockedItems.some(x => x === item.name)) {
                await this.deleteInventoryItem(item.assetid);
            }
        }
    },

    deleteInventoryItem: async function (assetId) {
        try {
            await this.db.collection('inventory_items').deleteOne({ assetId: assetId });
        } catch (e) {
            console.error(e);
        }
    },

    getRandomInventoryItem: async function (itemType, marketable, price) {
        var items = await this.db.collection('inventory_items').aggregate([
            { $match: { $and: [{ type: itemType }, { marketable: marketable }, { price: { $lte: price } }] } }, // filter the results
            { $sample: { size: 1 } } // we want to get 1 item
        ]).toArray();

        if (items.length > 0) {
            return items[0];
        } else {
            console.log(chalk.red('No items of type ' + enums.InventoryItemType.properties[itemType].name + ' and with price lower or equal to ' + price));
        }
    },

    updatePricesInDb: async function () {
        var items = await this.db.collection('inventory_items').find().toArray();

        console.log(chalk.yellow('Updating prices in DB...'));

        //There is limit for number of requests so we will update items one by one. Ideally there should be a delay between requests
        for (let item of items) {
            if (item.marketable) {
                item.price = await helpers.getInventoryItemPrice(item.market_hash_name);
                if (item.price > 0) {
                    await this.updateInventoryItem(item.assetId, item.price);
                }
                await helpers.sleep(5000);
            }
        }

        console.log(chalk.green('Prices in DB were successfully updated!'));
    },

    syncInventoryWithDb: async function () {
        console.log('Trying to load inventory');
        var inventoryItems = await helpers.loadInventory(config.botSteamID64, 753, 6, true);
        console.log(chalk.green('Inventory loaded: ' + inventoryItems.length + ' item(s)'));
        console.log(chalk.green('Item(s) locked by config: ' + config.lockedItems.length));

        console.log(chalk.yellow('Syncing inventory with DB...'));

        var itemsAdded = 0;

        for (let inventoryItem of inventoryItems) {
            if (!config.lockedItems.some(x => x === inventoryItem.name)) {
                if (await this.db.collection('inventory_items').find({ assetId: inventoryItem.assetid }).count() === 0) {
                    await this.insertInventoryItem(inventoryItem);
                    await helpers.sleep(2500);
                    itemsAdded++;
                }
            }
        }

        console.log(chalk.green('Syncing complete. ' + itemsAdded + ' item(s) added.'));
    },


    getNextSequenceValue: async function (sequenceName) {

        var doc = await this.db.collection('counters').findOneAndUpdate ({ "_id": sequenceName }, { $inc:{sequence_value:1} }, {new: true});
        //console.log(doc);
        return doc.value.sequence_value;
    },

    insertQuote: async function(sequenceID, sender, senderID64, quote, seconds, groupID, chatID) {
        var dbItem = {
            _id: sequenceID,
            author: sender,
            SteamID64: senderID64,
            quote: quote,
            time: seconds,
            groupID: groupID,
            chatID: chatID
        };
        try {
            var res = await this.db.collection('quotes').insertOne(dbItem);
            return res.insertedId;
        } catch (e) {
            console.error(e);
        }
    },

    deleteQuote: async function (quoteNum) {
        try {
            var res = await this.db.collection('quotes').deleteOne({ "_id": quoteNum });
            return res.deletedCount;
        } catch (e) {
            console.error(e);
        }
    },

    findQuote: async function (quoteNum) {
        try {
            var res = await this.db.collection('quotes').findOne({ "_id": quoteNum });

            //var d = new Date(0); //The 0 there is the key, which sets the date to the epoch
            //d.setUTCSeconds(res.time); //this returns something like Mon Apr 29 2019 18:13:36 GMT+0200 (GMT+02:00)
            if (res) {
                var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
                var d = new Date(res.time * 1000);
                d = d.toLocaleDateString("en-US", options); //this returns something like Monday, April 29, 2019, 6:13 PM

                return "[" + quoteNum + "] " + "\"" + res.quote + "\"" + " (added by " + res.author + " on " + d + ")";
            } else { return false; }
        } catch (e) {
            console.error(e);
        }
    },

    quoteInfo: async function (quoteNum) {
        try {
            var res = await this.db.collection('quotes').findOne({ "_id": quoteNum});
            return res.SteamID64;
        } catch (e) {
            console.error(e);
        }
    },

    randQuote: async function (match) {
        try {
            if (match) {
                var res = await this.db.collection('quotes').aggregate([
                    { $match: { author: match } },
                    { $sample: { size: 1 } }
                ]).toArray();

                if (res.length > 0) {
                    return "[" + res[0]._id + "] " + "\"" + res[0].quote + "\"" + " (added by " + res[0].author + ")";
                }
            } else {
                var res = await this.db.collection('quotes').aggregate([
                    { $sample: { size: 1 } }
                ]).toArray();
                if (res.length > 0) {
                    return "[" + res[0]._id + "] " + "\"" + res[0].quote + "\"" + " (added by " + res[0].author + ")";
                }
            }
        } catch (e) {
            console.error(e);
        }
    },

    matchQuote: async function (query) {
        try {
            var docs = await this.db.collection('quotes').find({ quote: { $regex: query, $options: "$i" } }).toArray();
            var list = [];

            for (let ì = 0; i < docs.length; i++) {
                list.push("\[" + docs[i]._id + "\]");
            }
            if (typeof list !== 'undefined' && list.length > 0) {
                // the array is defined and has at least one element
                let res = list.join(' ');
                res = "Matching Quote(s): " + res;
                return res;
            } else {
                return "No Match.";
            }

        } catch (e) {
            console.error(e);
        }
    },


    lastQuote: async function (match) {
        try {
            if (match) {
                let res = await this.db.collection('quotes').find({"author": match}).limit(1).sort({$natural:-1}).toArray();
                if (typeof res !== 'undefined' && res.length > 0) {
                    // the array is defined and has at least one element 
                    var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                    var d = new Date(res[0].time * 1000);
                    d = d.toLocaleDateString("en-US", options); //this returns something like Monday, April 29, 2019, 6:13 PM
                    return "\["+ res[0]._id + "\] " + "\"" + res[0].quote + "\"" + " stored on " + d;
                } else {return false;}
            } else {
                let res = await this.db.collection('quotes').find().limit(1).sort({$natural:-1}).toArray();
                if (typeof res !== 'undefined' && res.length > 0) {
                    // the array is defined and has at least one element 
                    var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                    var d = new Date(res[0].time * 1000);
                    d = d.toLocaleDateString("en-US", options); //this returns something like Monday, April 29, 2019, 6:13 PM
                    return "\["+ res[0]._id + "\] " + "\"" + res[0].quote + "\"" + " stored on " + d;
                } else {return false;}
            }
        } catch (e) {
            console.error(e);
        }
    }

};

module.exports = _db;
