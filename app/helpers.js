'use strict';

const enums = require('./enums');

const utils = {
    getInventoryItemType: function (item) {
        if (item.type === 'Gift') {
            return enums.InventoryItemType.Gift;
        }
        else if (item.type === 'Coupon') {
            return enums.InventoryItemType.Coupon;
        }
        else if (item.type === 'Booster Pack') {
            return enums.InventoryItemType.Booster;
        }
        
        let tag = item.getTag('item_class');

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