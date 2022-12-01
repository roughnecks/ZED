# ZED

## Branches explained

* master: always current.
* development: new code which will hopefully end up in master.
* nodb: this bot instance doesn't use Mongo DB so it doesn't do price checking for lotteries.
* donation-only: this bot instance only accepts all donations and all kind of offers from bot's owner (doesn't use Mongo DB and doesn't do lotteries).
* donation-only-without-2FA: this bot instance only accepts donations (no item loss) and doesn't use Mobile Auth (doesn't use Mongo DB and doesn't do lotteries).
* 1to1: Heavily Customized BoT - Do not use unless you know what you're doing.

***

**_Steam Trading/CHAT BoT | Handles Trade Offers, Friends Invites and Group CHATs_**

The following is a list of functions that ZED provides at the moment:

* Accept any offer from owner.
* Accept donations from everyone (no items loss).
* Accept Friendship Invitations from everyone.
* Simple interaction via chat and signing friends profiles upon request.
* Post a comment on its own profile with a "Thank You" message to donors (Donation must contain >4 Items).
* New items check (logs to console when our inventory has new items).
* Chat messages check (logs to console when bot receives a chat message).
* Notifications check (logs to console if any new comment is available).
* Lottery: Send any 1 Trading Card, Background, Emoticon or Booster Pack to the BoT and it will send you back a random Item of the same type (card for card, emote for emote etc...).
* Group CHAT: Join the BoT to any Group CHAT manually or via config file and start using commands (WIP).


## Required software

* Node.js (Recommended: Latest LTS Version: 10.15.1 (includes npm 6.4.1))
* MongoDB Server (https://www.mongodb.com/download-center/community)

## Required npm modules (dependencies)

* axios
* chalk
* console-stamp
* mongodb
* steam-totp
* steam-tradeoffer-manager
* steam-user
* steamcommunity

Run `npm install` inside BoT's directory to install all dependencies.

## Configuration

### Edit "config.json"

`username`: bot's Steam Account Name

`password`: bot's Steam Account Password

`sharedSecret`: You might be wondering where to find the shared/identity secret and there are actually many tutorials depending on your device. [1]

`identitySecret`: Same as above.

`ownerSteamID64`: You can get all needed Steam IDs here: https://steamdb.info/calculator/

`ownerSteamID3`: See Above

`botSteamID64`: See Above

`botSteamID3`: See Above

`ClanChatGroupID`: Your Group's ID64 to have the BoT automatically join it. [2]

`customGame`: This is Non-Steam Game Played by the BoT - Something like "Trash BoT - Accepting Junk" or whatever you want.

`lockedItems`: This is an array of Items you don't want to be traded by the BoT (maybe you're using them in your profile, like a background).

`familyViewPin`: If your account has Family View enabled, you need to supply your PIN here.

`updatePricesOnStartup`: If you want the bot to update prices for all the Items in its Steam Inventory at startup, set this to true.

`syncInventoryWithDbOnStartup`: Update DB entries syncing them with bot's Inventory (you can also sync manually with Admin-Only "!sync" command).

`openweathermapAPI`: Not mandatory but "!weather" command won't work without it. If you want to get one for free, visit: "https://openweathermap.org/api".

`steamAPI`: Not mandatory but "!tf2" command won't work without it. You can get yours for free by visiting "https://steamcommunity.com/dev/apikey".

`db "connectionString"`: This depends on your MongoDB Configuration - Something like this should work: "mongodb://localhost:27017/zed".


[1] Shared/Identity secrets must be extracted from your Two Factor Authenticator App, so it's always a different process depending on which device
you're actually using: iPhone - Android - 3rd Party Desktop App like WinAuth etc...
[2] You can check steamID of your group by navigating to its page, then adding /memberslistxml?xml=1 to the end of the link, so the link will look like this: "https://steamcommunity.com/groups/wrongditch/memberslistxml?xml=1". Then you can get steamID of your group from the result, it's in <groupID64> tag.

## Starting the BoT

`npm start`

## Commands

### Public

`!help`: You'll get a list of all public commands.

### Admin-Only

`!sync`: Sync DB and Inventory Items manually.

## Group CHAT Commands

`!help` || `!commands`: You'll get a list of all commands.

### Featured Commands

`!weather <city> <unit of measure>`: Query "openweathermaps" to get weather info for chosen city in Metric or Imperial units.

`!tf2 <class>`: Get personal Team Fortress 2 Stats for chosen class.

`!quote ...`: Manages CHAT Group quotes - Read in-line command help.

`!csgo`: Get personal CS:GO Stats.
