'use strict';

const enums = {
    InventoryItemType:
    {
        Card: 2,
        Background: 3,
        Emote: 4,
        Booster: 5,
        Gems: 7,
        Unknown: 99999999,
        properties:
        {
            2: { name: 'Card', value: 2 },
            3: { name: 'Background', value: 3 },
            4: { name: 'Emote', value: 4 },
            5: { name: 'Booster', value: 5 },
            99999999: { name: 'Unknown', value: 99999999 }
        }
    }
}

if (Object.freeze) {
    Object.freeze(enums);
}

module.exports = enums;