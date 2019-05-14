'use strict';

class Tf2Stats {
    constructor() {
        // create properties with default values
        this.accumBuild = '-';
        this.maxBuild = '-';
        this.accumDam = '-';
        this.maxDam = '-';
        this.accumDom = '-';
        this.maxDom = '-';
        this.accumKAss = '-';
        this.maxKAss = '-';
        this.accumKills = '-';
        this.maxKills = '-';
        this.accHours = '-';
        this.maxMins = '-';
        this.maxSecs = '-';
        this.accumCap = '-';
        this.maxCap = '-';
        this.accumDef = '-';
        this.maxDef = '-';
        this.accumPoints = '-';
        this.maxPoints = '-';
        this.accumRev = '-';
        this.maxRev = '-';
        this.accumBack = '-';
        this.maxBack = '-';
        this.accumLeach = '-';
        this.maxLeach = '-';
        this.accumBuilt = '-';
        this.maxBuilt = '-';
        this.accumTel = '-';
        this.maxTel = '-';
        this.maxSentry = '-';
        this.accumHeadS = '-';
        this.maxHeadS = '-';
        this.accumHeal = '-';
        this.maxHeal = '-';
        this.accumInvul = '-';
        this.maxInvul = '-';
    }

    setStatsValues(tf2classCapitalized, stats) {
        for (let stat of stats) {
            // remove class prefix
            var statName = stat.name.replace(tf2classCapitalized, '');

            // assign values
            if (statName === '.accum.iPlayTime') {
                var accumTime = stat.value;
                this.accHours = Math.round(accumTime * 100 / 3600) / 100;
            } else if (statName === '.max.iPlayTime') {
                var maxTime = stat.value;
                this.maxMins = Math.floor(maxTime / 60);
                this.maxSecs = maxTime - this.maxMins * 60;
            } else {
                this[propsMappings[statName]] = stat.value;
            }
        }
    }

    // returns summary stats chat message
    getStatSummary(tf2classCapitalized, player) {
        let result = ":sticky: " + `${tf2classCapitalized} Stats for Player "${player}":` + "\n" + "\n"
            + "Total Playtime / Longest Life: " + `${this.accHours}hrs` + " / " + `${this.maxMins}:${this.maxSecs}mins` + "\n"
            + "Total / Most Points: " + this.accumPoints + " / " + this.maxPoints + "\n"
            + "Total / Most Kills: " + this.accumKills + " / " + this.maxKills + "\n"
            + "Total / Most Damage Dealt: " + this.accumDam + " / " + this.maxDam + "\n"
            + "Total / Most Kill Assists: " + this.accumKAss + " / " + this.maxKAss + "\n"
            + "Total / Most Dominations: " + this.accumDom + " / " + this.maxDom + "\n"
            + "Total / Most Revenges: " + this.accumRev + " / " + this.maxRev + "\n"
            + "Total / Most Buildings Destroyed: " + this.accumBuild + " / " + this.maxBuild + "\n"
            + "Total / Most Captures: " + this.accumCap + " / " + this.maxCap + "\n"
            + "Total / Most Defenses: " + this.accumDef + " / " + this.maxDef;


        if (tf2classCapitalized === 'Demoman' || tf2classCapitalized === 'Soldier' || tf2classCapitalized === 'Pyro' || tf2classCapitalized === 'Heavy' || tf2classCapitalized === 'Scout') {
            return result;
        } else if (tf2classCapitalized === 'Medic') {
            return result + "\n"
                + "Total / Most Points Healed: " + this.accumHeal + " / " + this.maxHeal + "\n"
                + "Total / Most ÜberCharges: " + this.accumInvul + " / " + this.maxInvul;
        } else if (tf2classCapitalized === 'Engineer') {
            return result + "\n"
                + "Total / Most Buildings Built: " + this.accumBuilt + " / " + this.maxBuilt + "\n"
                + "Total / Most Teleports: " + this.accumTel + " / " + this.maxTel + "\n"
                + "Most Kills By Sentry: " + this.maxSentry;
        } else if (tf2classCapitalized === 'Spy') {
            return result + "\n"
                + "Total / Most Backstabs: " + this.accumBack + " / " + this.maxBack + "\n"
                + "Total / Most Health Points Leached: " + this.accumLeach + " / " + this.maxLeach;
        } else if (tf2classCapitalized === 'Sniper') {
            return result + "\n"
                + "Total / Most Headshots: " + this.accumHeadS + " / " + this.maxHeadS;
        } else {
            return "Invalid class, moron!";
        }
    }
}

// mapping stat names from response to properties of our class
// special cases like '.accum.iPlayTime' and '.max.iPlayTime' are not included here
const propsMappings = {
    '.accum.iBuildingsDestroyed': 'accumBuild',
    '.max.iBuildingsDestroyed': 'maxBuild',
    '.accum.iDamageDealt': 'accumDam',
    '.max.iDamageDealt': 'maxDam',
    '.accum.iDominations': 'accumDom',
    '.max.iDominations': 'maxDom',
    '.accum.iKillAssists': 'accumKAss',
    '.max.iKillAssists': 'maxKAss',
    '.accum.iNumberOfKills': 'accumKills',
    '.max.iNumberOfKills': 'maxKills',
    '.accum.iPointCaptures': 'accumCap',
    '.max.iPointCaptures': 'maxCap',
    '.accum.iPointDefenses': 'accumDef',
    '.max.iPointDefenses': 'maxDef',
    '.accum.iPointsScored': 'accumPoints',
    '.max.iPointsScored': 'maxPoints',
    '.accum.iRevenge': 'accumRev',
    '.max.iRevenge': 'maxRev',
    '.accum.iBackstabs': 'accumBack',
    '.max.iBackstabs': 'maxBack',
    '.accum.iHealthPointsLeached': 'accumLeach',
    '.max.iHealthPointsLeached': 'maxLeach',
    '.accum.iBuildingsBuilt': 'accumBuilt',
    '.max.iBuildingsBuilt': 'maxBuilt',
    '.accum.iNumTeleports': 'accumTel',
    '.max.iNumTeleports': 'maxTel',
    '.max.iSentryKills': 'maxSentry',
    '.accum.iHeadshots': 'accumHeadS',
    '.max.iHeadshots': 'maxHeadS',
    '.accum.iHealthPointsHealed': 'accumHeal',
    '.max.iHealthPointsHealed': 'maxHeal',
    '.accum.iNumInvulnerable': 'accumInvul',
    '.max.iNumInvulnerable': 'maxInvul'
};

module.exports = Tf2Stats;