'use strict';

class CSGOStats {
    constructor() {
        // create properties with default values
        this.totkills = '-';
        this.totdeaths = '-';
        this.totplbombs = '-';
        this.totdefbombs = '-';
        this.totwins = '-';
        this.totdamdone = '-';
        this.totmoney = '-';
        this.totreshost = '-';
        this.totdom = '-';
        this.totdomover = '-';
        this.totreven = '-';
        this.totshothit = '-';
        this.totshotfired = '-';
        this.totrounds = '-';
        this.lmwins = '-';
        this.lmkills = '-';
        this.lmdeaths = '-';
        this.lmdam = '-';
        this.lmdom = '-';
        this.lmreven = '-';
    }

    setStatsValues(stats) {
        for (let stat of stats) {
            // assign values
            if (stat.name === 'total_time_played') {
                var totTime = stat.value;
                this.totHours = Math.round(totTime * 100 / 3600) / 100;
            } else {
                this[propsMappings[stat.name]] = stat.value;
            }
        }
    }


    getStatSummary(player) {
        if (this.totHours == null) {
            this.totHours = 0;
        }
           let result = ":csgob: CS:GO Stats for Player " + "\"" + player + "\":" + "\n" + "\n"
            + "Total Playtime: " + `${this.totHours}hrs` + "\n"
            + "Total Kills: " + this.totkills + "\n"
            + "Total Deaths: " + this.totdeaths + "\n"
            + "Total Planted Bombs: " + this.totplbombs + "\n"
            + "Total Defused Bombs: " + this.totdefbombs + "\n"
            + "Total Wins: " + this.totwins + "\n"
            + "Total Damage Done: " + this.totdamdone + "\n"
            + "Total Money Earned: " + this.totmoney + "\n"
            + "Total Rescued Hostages: " + this.totreshost + "\n"
            + "Total Dominations: " + this.totdom + "\n"
            + "Total Dominations Overkills: " + this.totdomover + "\n"
            + "Total Revenges: " + this.totreven + "\n"
            + "Total Shots Hit: " + this.totshothit + "\n"
            + "Total Shots Fired: " + this.totshotfired + "\n"
            + "Total Rounds Played: " + this.totrounds + "\n" + "\n"
            + "Last Match Stats:" + "\n"
            + "L.M. Wins: " + this.lmwins + "\n"
            + "L.M. Kills: " + this.lmkills + "\n"
            + "L.M. Deaths: " + this.lmdeaths + "\n"
            + "L.M. Damage: " + this.lmdam + "\n"
            + "L.M. Dominations: " + this.lmdom + "\n"
            + "L.M. Revenges: " + this.lmreven + "\n";

        return result;
    }
}


    const propsMappings = {
        'total_kills': 'totkills',
        'total_deaths': 'totdeaths',
        'total_planted_bombs': 'totplbombs',
        'total_defused_bombs': 'totdefbombs',
        'total_wins': 'totwins',
        'total_damage_done': 'totdamdone',
        'total_money_earned': 'totmoney',
        'total_rescued_hostages': 'totreshost',
        'total_dominations': 'totdom',
        'total_domination_overkills': 'totdomover',
        'total_revenges': 'totreven',
        'total_shots_hit': 'totshothit',
        'total_shots_fired': 'totshotfired',
        'total_rounds_played': 'totrounds',
        'last_match_wins': 'lmwins',
        'last_match_kills': 'lmkills',
        'last_match_deaths': 'lmdeaths',
        'last_match_damage': 'lmdam',
        'last_match_dominations': 'lmdom',
        'last_match_revenges': 'lmreven'
    };
    
    module.exports = CSGOStats;