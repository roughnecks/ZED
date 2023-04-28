'use strict';

const enums = {
    InventoryItemType:
    {
        Card: 2,
        Background: 3,
        Emote: 4,
        Gems: 7,
        Gift: 888,
        Coupon: 1616,
        Booster: 3232,
        Unknown: 99999999,
        properties:
        {
            2: { name: 'Card', value: 2 },
            3: { name: 'Background', value: 3 },
            4: { name: 'Emote', value: 4 },
            7: { name: 'Gems', value: 7 },
            888: { name: 'Gift', value: 888 },
            1616: { name: 'Coupon', value: 1616 },
            3232: { name: 'Booster', value: 3232 },
            99999999: { name: 'Unknown', value: 99999999 }
        }
    },

    CardBorderType:
        {
            Normal: 0,
            Foil: 1,
            Unknown: 99999999,
            properties:
        {
            1: { name: 'Normal', value: 0 },
            2: { name: 'Foil', value: 1 },
            99999999: { name: 'Unknown', value: 99999999 }
        }
    }
}

if (Object.freeze) {
    Object.freeze(enums);
}

module.exports = enums;