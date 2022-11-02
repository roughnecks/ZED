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

    sleep: function (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

module.exports = utils;