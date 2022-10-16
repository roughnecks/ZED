'use strict';

const axios = require('axios');
const enums = require('./enums');

const CEconItem = require('../node_modules/steamcommunity/classes/CEconItem.js');

const chalk = require('chalk');

const utils = {
    getInventoryItemType: function (item) {
        let tag = item.getTag('item_class');

        if (typeof tag === undefined) {
            if (item.type === 'Gift') {
                return enums.InventoryItemType.Gift;
            }
            return enums.InventoryItemType.Unknown;
        }

        try {
            if (tag.internal_name === 'item_class_2') {
                return enums.InventoryItemType.Card;
            } else if (tag.internal_name === 'item_class_3') {
                return enums.InventoryItemType.Background;
            } else if (tag.internal_name === 'item_class_4') {
                return enums.InventoryItemType.Emote;
            } else if (tag.internal_name === 'item_class_7') {
                return enums.InventoryItemType.Gems;
            } else {
                return enums.InventoryItemType.Unknown;
            }
        } catch {
            return enums.InventoryItemType.Unknown;
        }
    },

    getCardBorderType: function (item) {
        let tag = item.getTag('cardborder');
 
        if (typeof tag === undefined) {
            return enums.CardBorderType.Unknown;
        }
 
        try {
            if (tag.internal_name === 'cardborder_0') {
                return enums.CardBorderType.Normal;
            } else if (tag.internal_name === 'cardborder_1') {
                return enums.CardBorderType.Foil;
            } else {
                return enums.CardBorderType.Unknown;
            }
        } catch {
            return enums.CardBorderType.Unknown;
        }   
    },

    loadInventory: async function (userId64, appId, contextId, tradableOnly) {
        var pos = 1;
        var start = '';
        var inventory = [];

        do {
            console.log(chalk.yellow('Loading Inventory - Sending request...'));
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
                        console.log(chalk.red('Malformed response'));
                    } else {
                        console.log(chalk.red('Malformed response'));
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
                console.log(chalk.red('Failed to load inventory.'));
                return [];
            }
        }
        while (start !== '');

        return inventory;
    },

    sleep: function (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

module.exports = utils;