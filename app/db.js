'use strict';

const MongoClient = require('mongodb').MongoClient;
const config = require('../config.json');

const helpers = require('./helpers');
const enums = require('./enums');

const chalk = require('chalk');

//const InventoryItem = require('./models');

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

    checkData: async function () {
        if (await this.db.collection('inventory_items').countDocuments() === 0) {
            await this.initInventoryItems();
        } else if (config.updatePricesOnStartup) {
            console.log('updatePricesOnStartup is set to true. Prices will be updated in background.');
            this.updatePricesInDb();
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
                await this.insertInventoryItem({
                    assetId: el.assetid,
                    name: el.name,
                    market_hash_name: el.market_hash_name,
                    type: helpers.getInventoryItemType(el),
                    marketable: el.marketable,
                    price: el.marketable ? await helpers.getInventoryItemPrice(el.market_hash_name) : 0
                });
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
        await this.db.collection('inventory_items').insertOne(item);
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
                    await this.insertInventoryItem({
                        assetId: item.assetid,
                        name: item.name,
                        market_hash_name: item.market_hash_name,
                        type: helpers.getInventoryItemType(item),
                        marketable: item.marketable,
                        price: item.marketable ? await helpers.getInventoryItemPrice(item.market_hash_name) : 0
                    });
                    await helpers.sleep(500);
                }
            }
        }
    },

    updateInventoryItem: async function (assetId, price) {
        await this.db.collection('inventory_items').updateOne({ assetId: assetId }, { $set: { price: price } });
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
        await this.db.collection('inventory_items').deleteOne({ assetId: assetId });
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
    }
};

module.exports = _db;