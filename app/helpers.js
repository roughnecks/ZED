'use strict';

const axios = require('axios');
const enums = require('./enums');

const CEconItem = require('../node_modules/steamcommunity/classes/CEconItem.js');

const utils = {
    getInventoryItemType: function (item) {
        let tag = item.getTag('item_class');

        if (typeof tag === undefined) {
            return enums.InventoryItemType.Unknown;
        }

        try {
            if (tag.internal_name === 'item_class_2') {
                return enums.InventoryItemType.Card;
            } else if (tag.internal_name === 'item_class_3') {
                return enums.InventoryItemType.Background;
            } else if (tag.internal_name === 'item_class_4') {
                return enums.InventoryItemType.Emote;
            } else if (tag.internal_name === 'item_class_5') {
                return enums.InventoryItemType.Booster;
            } else {
                return enums.InventoryItemType.Unknown;
            }
        } catch {
            return enums.InventoryItemType.Unknown;
        }
    },

    loadInventory: async function (userId64, appId, contextId, tradableOnly) {
        var pos = 1;
        var start = '';
        var inventory = [];

        do {
            console.log('Loading Inventory - Sending request...');
            try {
                var response = await axios.get('https://steamcommunity.com/inventory/' + userId64 + '/' + appId + '/' + contextId + '?l=english&count=5000&start_assetid=' + start, {
                    method: 'get',
                    headers: {
                        'Referer': 'https://steamcommunity.com/profiles/' + userId64 + '/inventory'
                    }
                });

                var data = response.data;

                if (data && data.success && data.total_inventory_count === 0) {
                    // Empty inventory
                    return [];
                }

                if (!data || !data.success || !data.assets || !data.descriptions) {
                    if (data) {
                        // Dunno if the error/Error property even exists on this new endpoint
                        console.log('Malformed response');
                    } else {
                        console.log('Malformed response');
                    }

                    return [];
                }

                for (var i = 0; i < data.assets.length; i++) {
                    var description = this.getDescription(data.descriptions, data.assets[i].classid, data.assets[i].instanceid);

                    if (!tradableOnly || (description && description.tradable)) {
                        data.assets[i].pos = pos++;
                        if (!data.assets[i].currencyid) {
                            inventory.push(new CEconItem(data.assets[i], description, contextId));
                        }
                    }
                }

                if (data.more_items === 1) {
                    start = data.last_assetid;
                }
                else {
                    start = '';
                }
            }
            catch (error) {
                //console.log(error);
                console.log('Failed to load inventiry.');
                return [];
            }
        }
        while (start !== '');

        return inventory;
    },

    // A bit of optimization; objects are hash tables so it's more efficient to look up by key than to iterate an array
    quickDescriptionLookup: {},

    getDescription: function (descriptions, classID, instanceID) {
        var key = classID + '_' + (instanceID || '0'); // instanceID can be undefined, in which case it's 0.

        if (this.quickDescriptionLookup[key]) {
            return this.quickDescriptionLookup[key];
        }

        for (var i = 0; i < descriptions.length; i++) {
            this.quickDescriptionLookup[descriptions[i].classid + '_' + (descriptions[i].instanceid || '0')] = descriptions[i];
        }

        return this.quickDescriptionLookup[key];
    },

    getInventoryItemPrice: async function (market_hash_name) {
        //euro
        //https://steamcommunity.com/market/priceoverview/?appid=753&country=IT&currency=3&market_hash_name=312790-Yumil
        //{"success":true,"lowest_price":"0,08\u20ac","volume":"1","median_price":"0,07\u20ac"}

        //usd
        //https://steamcommunity.com/market/priceoverview/?appid=753&country=IT&currency=1&market_hash_name=312790-Yumil
        //{"success":true,"lowest_price":"$0.09 USD","volume":"1","median_price":"$0.07 USD"}

        var url = 'https://steamcommunity.com/market/priceoverview/?appid=753&country=IT&currency=1&market_hash_name=' + market_hash_name;

        try {
            var response = await axios.get(url);
            var data = response.data;

            return parseFloat(data.lowest_price.replace('$', '').replace(' USD', ''));
        }
        catch (error) {
            //console.log(error);
            return 0;
        }
    },

    sleep: function (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

module.exports = utils;