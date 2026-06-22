import { inject, injectable } from "tsyringe";
//Spt Classes
import type { StaticRouterModService } from "@spt/services/mod/staticRouter/StaticRouterModService";
import type { IBossLocationSpawn } from "@spt/models/eft/common/ILocationBase";
import type { DatabaseService } from "@spt/services/DatabaseService";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";
import type { RandomUtil } from "@spt/utils/RandomUtil";
//Custom Classes
import type { SwagLegionConfig, SwagCustomBossConfig } from "../models/Interfaces";
import type { ConfigManager } from "../managers/ConfigManager";
import type { ReqsController } from "./ReqsController";
import type { PkController } from "./PkController";
import type { ROLogger } from "../utils/Logger";
import type { Utils } from "../utils/Utils";
//Json Imports
const botSettings = require("../utils/data/botInfo.json");
//Modules
import path from "node:path";
import fs from "node:fs";

@injectable()
export class LegionControllerGlobal {
    constructor(
        @inject("Utils") protected utils: Utils,
        @inject("ROLogger") protected logger: ROLogger,
        @inject("ConfigManager") protected configManager: ConfigManager,
        @inject("PkController") protected pkController: PkController,
        @inject("ReqsController") protected traderController: ReqsController,
        @inject("StaticRouterModService") protected staticRouter: StaticRouterModService,
        @inject("RandomUtil") protected randomUtil: RandomUtil,
        @inject("DatabaseService") protected databaseService: DatabaseService,
    ) {}

    private routerPrefix = "[Raid Overhaul] ";

    private loadBossLocationData(): void {
        let bossLegionChance = 15;

        const tables = this.databaseService.getTables();
        const escortAmount = this.randomUtil.randInt(1, 4).toString();
        //const diffType = this.utils.drawRandom(botSettings.difficulties);
        const bossDifficulty = "normal";
        const escortDifficulty = "normal";
        const escortType = this.utils.drawRandom(botSettings.followers);
        const spawnChance = this.configManager.modConfig().GlobalSpawnChance;
        bossLegionChance = spawnChance ?? 15;

        if (this.configManager.debugConfig().debugMode) {
            this.logger.log(`Current spawn chance for Legion is [${bossLegionChance}]`, LogTextColor.BLUE);
            this.logger.log(`Current Boss Difficulty is [${bossDifficulty}]`, LogTextColor.BLUE);
            this.logger.log(`Current Escort Difficulty is [${escortDifficulty}]`, LogTextColor.BLUE);
            this.logger.log(`Current Escort type is [${escortType}]`, LogTextColor.BLUE);
            this.logger.log(`Current number of Escorts is [${escortAmount}]`, LogTextColor.BLUE);
        }

        let bossLegionSpawn: IBossLocationSpawn = {
            BossChance: bossLegionChance,
            BossDifficult: bossDifficulty,
            BossEscortAmount: escortAmount,
            BossEscortDifficult: escortDifficulty,
            BossEscortType: escortType,
            BossName: "bosslegion",
            BossPlayer: false,
            BossZone: "?",
            RandomTimeSpawn: false,
            Time: -1,
            TriggerId: "",
            TriggerName: "",
            SpawnMode: ["regular", "pve"],
        };

        for (const location of Object.values(tables.locations)) {
            if (location.base) {
                const zonesString =
                    location.base.Id === "factory4_night"
                        ? tables.locations.factory4_day.base.OpenZones
                        : location.base.OpenZones;
                if (!zonesString) {
                    continue;
                }

                const foundOpenZones = zonesString
                    .split(",")
                    .map((zone) => zone.trim())
                    .filter((zone) => zone && !zone.includes("Snipe"));

                if (foundOpenZones.length === 0) {
                    continue;
                }

                const randomIndex = Math.floor(Math.random() * foundOpenZones.length);
                const randomZone = foundOpenZones[randomIndex];

                bossLegionSpawn = {
                    ...bossLegionSpawn,
                    BossZone: randomZone,
                };
                location.base.BossLocationSpawn.push(bossLegionSpawn);
            }
        }
    }

    private removeBossSpawns(): void {
        const removedLocations = [];
        const tables = this.databaseService.getTables();

        for (const location of Object.values(tables.locations)) {
            if (location.base) {
                const removedSpawns = location.base.BossLocationSpawn.filter(
                    (spawn) => spawn.BossName === "bosslegion",
                );
                location.base.BossLocationSpawn = location.base.BossLocationSpawn.filter(
                    (spawn) => spawn.BossName !== "bosslegion",
                );

                if (removedSpawns.length > 0) {
                    removedLocations.push({
                        map: location.base.Id,
                        zones: removedSpawns.map((spawn) => spawn.BossZone),
                    });
                }
            }
        }
    }

    private swagPatch(): void {
        let bossLegionChance = 15;

        const spawnChance = this.configManager.modConfig().GlobalSpawnChance;
        bossLegionChance = spawnChance ?? 15;

        try {
            const swagBossConfigPath = path.join(__dirname, "../../../SWAG/config/bossConfig.json");
            const swagLegionPath = path.join(__dirname, "../../../SWAG/config/custom/legion.json");
            const swagBossConfig = JSON.parse(fs.readFileSync(swagBossConfigPath, "utf-8")) as SwagCustomBossConfig;
            const swagLegionConfig = JSON.parse(fs.readFileSync(swagLegionPath, "utf-8")) as SwagLegionConfig;

            if (!swagBossConfig.CustomBosses.legion.enabled) {
                swagBossConfig.CustomBosses.legion.enabled = true;
            }

            if (swagBossConfig.CustomBosses.legion.useProgressSpawnChance) {
                swagBossConfig.CustomBosses.legion.useProgressSpawnChance = false;
                swagBossConfig.CustomBosses.legion.customs = bossLegionChance;
                swagBossConfig.CustomBosses.legion.factory = bossLegionChance;
                swagBossConfig.CustomBosses.legion.factory_night = bossLegionChance;
                swagBossConfig.CustomBosses.legion.groundzero = bossLegionChance;
                swagBossConfig.CustomBosses.legion.groundzero_high = bossLegionChance;
                swagBossConfig.CustomBosses.legion.interchange = bossLegionChance;
                swagBossConfig.CustomBosses.legion.laboratory = bossLegionChance;
                swagBossConfig.CustomBosses.legion.lighthouse = bossLegionChance;
                swagBossConfig.CustomBosses.legion.reserve = bossLegionChance;
                swagBossConfig.CustomBosses.legion.shoreline = bossLegionChance;
                swagBossConfig.CustomBosses.legion.streets = bossLegionChance;
                swagBossConfig.CustomBosses.legion.woods = bossLegionChance;
                swagLegionConfig.customs[0].BossChance = bossLegionChance;
                swagLegionConfig.factory[0].BossChance = bossLegionChance;
                swagLegionConfig.factory_night[0].BossChance = bossLegionChance;
                swagLegionConfig.groundzero[0].BossChance = bossLegionChance;
                swagLegionConfig.groundzero_high[0].BossChance = bossLegionChance;
                swagLegionConfig.interchange[0].BossChance = bossLegionChance;
                swagLegionConfig.laboratory[0].BossChance = bossLegionChance;
                swagLegionConfig.lighthouse[0].BossChance = bossLegionChance;
                swagLegionConfig.reserve[0].BossChance = bossLegionChance;
                swagLegionConfig.shoreline[0].BossChance = bossLegionChance;
                swagLegionConfig.streets[0].BossChance = bossLegionChance;
                swagLegionConfig.woods[0].BossChance = bossLegionChance;
            } else {
                swagBossConfig.CustomBosses.legion.customs = bossLegionChance;
                swagBossConfig.CustomBosses.legion.factory = bossLegionChance;
                swagBossConfig.CustomBosses.legion.factory_night = bossLegionChance;
                swagBossConfig.CustomBosses.legion.groundzero = bossLegionChance;
                swagBossConfig.CustomBosses.legion.groundzero_high = bossLegionChance;
                swagBossConfig.CustomBosses.legion.interchange = bossLegionChance;
                swagBossConfig.CustomBosses.legion.laboratory = bossLegionChance;
                swagBossConfig.CustomBosses.legion.lighthouse = bossLegionChance;
                swagBossConfig.CustomBosses.legion.reserve = bossLegionChance;
                swagBossConfig.CustomBosses.legion.shoreline = bossLegionChance;
                swagBossConfig.CustomBosses.legion.streets = bossLegionChance;
                swagBossConfig.CustomBosses.legion.woods = bossLegionChance;
                swagLegionConfig.customs[0].BossChance = bossLegionChance;
                swagLegionConfig.factory[0].BossChance = bossLegionChance;
                swagLegionConfig.factory_night[0].BossChance = bossLegionChance;
                swagLegionConfig.groundzero[0].BossChance = bossLegionChance;
                swagLegionConfig.groundzero_high[0].BossChance = bossLegionChance;
                swagLegionConfig.interchange[0].BossChance = bossLegionChance;
                swagLegionConfig.laboratory[0].BossChance = bossLegionChance;
                swagLegionConfig.lighthouse[0].BossChance = bossLegionChance;
                swagLegionConfig.reserve[0].BossChance = bossLegionChance;
                swagLegionConfig.shoreline[0].BossChance = bossLegionChance;
                swagLegionConfig.streets[0].BossChance = bossLegionChance;
                swagLegionConfig.woods[0].BossChance = bossLegionChance;
            }

            swagBossConfig;

            fs.writeFileSync(swagBossConfigPath, JSON.stringify(swagBossConfig, null, 2), "utf-8");
            fs.writeFileSync(swagLegionPath, JSON.stringify(swagLegionConfig, null, 2), "utf-8");
        } catch (error) {
            this.logger.logError(`Error adding Legion to SWAG: ${error}`);
        }
    }

    private moarLocationDataPatch(): void {
        let bossLegionChance = 15;

        const tables = this.databaseService.getTables();
        const escortAmount = this.randomUtil.randInt(1, 4).toString();
        const bossDifficulty = "normal";
        const escortDifficulty = "normal";
        const escortType = this.utils.drawRandom(botSettings.followers);
        const spawnChance = this.configManager.modConfig().GlobalSpawnChance;
        bossLegionChance = spawnChance ?? 15;

        const bossLegionSpawn: IBossLocationSpawn = {
            BossChance: bossLegionChance,
            BossDifficult: bossDifficulty,
            BossEscortAmount: escortAmount,
            BossEscortDifficult: escortDifficulty,
            BossEscortType: escortType,
            BossName: "bosslegion",
            BossPlayer: false,
            BossZone: "",
            RandomTimeSpawn: false,
            Time: -1,
            TriggerId: "",
            TriggerName: "",
            SpawnMode: ["regular", "pve"],
        };

        for (const location of Object.values(tables.locations)) {
            if (location.base) {
                location.base.BossLocationSpawn.push(bossLegionSpawn);
            }
        }
    }

    public legionPreSptPatch(): void {
        this.staticRouter.registerStaticRouter(
            `${this.routerPrefix}-ProfileSelected`,
            [
                {
                    url: "/client/game/profile/select",
                    action: async (url, info, sessionId, output) => {
                        if (this.configManager.modConfig().EnableCustomBoss) {
                            this.pushLocationData();
                        }

                        return Promise.resolve(output);
                    },
                },
            ],
            "spt",
        );

        //Modify trader rep and legion chance post raid
        this.staticRouter.registerStaticRouter(
            `${this.routerPrefix}-RaidSaved`,
            [
                {
                    url: "/client/match/local/end",
                    action: async (url, info, sessionId, output) => {
                        if (this.configManager.modConfig().EnableRequisitionOffice) {
                            this.traderController.traderRepLogic(info, sessionId);
                            if (this.configManager.modConfig().EnableCustomBoss) {
                                this.traderController.legionRepLogic(info, sessionId);
                                this.pushLocationData();
                            } else {
                                this.traderController.noBossRepLogic(info, sessionId);
                            }
                        } else {
                            if (this.configManager.modConfig().EnableCustomBoss) {
                                this.pkController.legionRepLogicReqDisabled(info, sessionId);
                                this.pushLocationData();
                            } else {
                                this.pkController.noBossRepLogicReqDisabled(info, sessionId);
                            }
                        }

                        return Promise.resolve(output);
                    },
                },
            ],
            "spt",
        );
    }

    private pushLocationData(): void {
        const swagKey = "SWAG";
        const moarKey = "DewardianDev-MOAR";

        if (this.utils.checkForMod(swagKey)) {
            this.swagPatch();
        } else if (this.utils.checkForMod(moarKey)) {
            this.moarLocationDataPatch();
        } else {
            this.removeBossSpawns();
            this.loadBossLocationData();
        }
    }
}
