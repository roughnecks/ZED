# ZED - Donation Only BoT

**_Steam Trading BoT | Handles Trade Offers and Friends Invites_**

The following is a list of functions that ZED provides at the moment:

* Accept any offer from owner.
* Accept donations from everyone (no items loss).
* Accept Friendship Invitations from everyone.
* Simple interaction via chat and signing friends profiles upon request.
* Post a comment on its own profile with a "Thank You" message to donors (Donation must contain >4 Items).
* New items check (logs to console when our inventory has new items).
* Chat messages check (logs to console when bot receives a chat message).
* Notifications check (logs to console if any new comment is available).

## Required software

* Node.js (Recommended: Latest LTS Version: 10.15.1 (includes npm 6.4.1))

## Required npm modules (dependencies)

* axios
* chalk
* console-stamp
* steam-totp
* steam-tradeoffer-manager
* steam-user
* steamcommunity

Run `npm install` inside BoT's directory to install all dependencies.

## Configuration

### Edit "config.json"

`username`: bot's Steam Account Name

`password`: bot's Steam Account Password

`sharedSecret`: You might be wondering where to find the shared/identity secret and there are actually many tutorials depending on your device [1]

`identitySecret`: Same as above.

`ownerSteamID64`: You can get all needed Steam IDs here: https://steamdb.info/calculator/

`ownerSteamID3`: See Above

`botSteamID64`: See Above

`botSteamID3`: See Above

`customGame`: This is Non-Steam Game Played by the BoT - Something like "Trash BoT - Accepting Junk" or whatever you want.

`familyViewPin`: If your account has Family View enabled, you need to supply your PIN here.

[1] Shared/Identity secrets must be extracted from your Two Factor Authenticator App, so it's always a different process depending on which device
you're actually using: iPhone - Android - 3rd Party Desktop App like WinAuth etc...

## Starting the BoT

`npm start`