import { inject, injectable } from "tsyringe";
//Spt Classes
import type { StaticRouterModService } from "@spt/services/mod/staticRouter/StaticRouterModService";
import type { IBossLocationSpawn } from "@spt/models/eft/common/ILocationBase";
import type { DatabaseService } from "@spt/services/DatabaseService";
import type { IBotConfig } from "@spt/models/spt/config/IBotConfig";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";
import type { IPmcData } from "@spt/models/eft/common/IPmcData";
import type { ConfigServer } from "@spt/servers/ConfigServer";
import { ConfigTypes } from "@spt/models/enums/ConfigTypes";
import type { RandomUtil } from "@spt/utils/RandomUtil";
import type { JsonUtil } from "@spt/utils/JsonUtil";
//Custom Classes
import type { legionProgression, SwagLegionConfig, SwagCustomBossConfig } from "../models/Interfaces";
import type { ConfigManager } from "../managers/ConfigManager";
import type { ReqsController } from "./ReqsController";
import type { PkController } from "./PkController";
import type { ROLogger } from "../utils/Logger";
import type { Utils } from "../utils/Utils";
//Json Imports
const botSettings = require("../utils/data/botInfo.json");
const bosslegion = require("../../db/RaidBoss/bosslegion.json");
const bosslegion2 = require("../../db/RaidBoss/bosslegionNoCustomItems.json");
//Modules
import path from "node:path";
import fs from "node:fs";

@injectable()
export class LegionController {
    constructor(
        @inject("Utils") protected utils: Utils,
        @inject("ROLogger") protected logger: ROLogger,
        @inject("ConfigManager") protected configManager: ConfigManager,
        @inject("PkController") protected pkController: PkController,
        @inject("ReqsController") protected traderController: ReqsController,
        @inject("StaticRouterModService") protected staticRouter: StaticRouterModService,
        @inject("JsonUtil") protected jsonUtil: JsonUtil,
        @inject("RandomUtil") protected randomUtil: RandomUtil,
        @inject("ConfigServer") protected configServer: ConfigServer,
        @inject("DatabaseService") protected databaseService: DatabaseService,
    ) {}

    private routerPrefix = "[Raid Overhaul] ";
    public static modLoc = path.join(__dirname, "..", "..");
    public static legionFileChance: number;
    public static profileId: string;
    public static progressFile: {
        legionChance: number;
    };
    public static setupRan = false;

    public addBossToDb(): void {
        const tables = this.databaseService.getTables();
        const botConfig = this.configServer.getConfig<IBotConfig>(ConfigTypes.BOT);
        const preset: any = botConfig.presetBatch;

        preset.bosslegion = 1;
        botConfig.equipment["bosslegion"] = botSettings.equipmentSettings;
        botConfig.itemSpawnLimits["bosslegion"] = {};
        botConfig.walletLoot["bosslegion"] = botConfig.walletLoot["bossgluhar"];
        botConfig.bosses.push("bosslegion");

        if (this.configManager.modConfig().EnableCustomItems) {
            try {
                tables.bots.types["bosslegion"] = this.jsonUtil.deserialize(this.jsonUtil.serialize(bosslegion));
            } catch (error) {
                this.logger.logError(`Error loading default Legion files: ${error}`);
            }
        }

        if (!this.configManager.modConfig().EnableCustomItems) {
            try {
                tables.bots.types["bosslegion"] = this.jsonUtil.deserialize(this.jsonUtil.serialize(bosslegion2));
            } catch (error) {
                this.logger.logError(`Error loading default Legion files: ${error}`);
            }
        }
    }

    private loadBossLocationData(): void {
        let bossLegionChance = 15;

        const tables = this.databaseService.getTables();
        const escortAmount = this.randomUtil.randInt(1, 4).toString();
        //const diffType = this.utils.drawRandom(botSettings.difficulties);
        const bossDifficulty = "normal";
        const escortDifficulty = "normal";
        const escortType = this.utils.drawRandom(botSettings.followers);
        const legionSpawnPath = `${LegionController.modLoc}/config/profiles/${LegionController.profileId}/LegionChance.json`;

        if (fs.existsSync(legionSpawnPath)) {
            try {
                const spawnChance = JSON.parse(fs.readFileSync(legionSpawnPath, "utf8")) as legionProgression;
                bossLegionChance = spawnChance?.legionChance ?? 15;
            } catch (error) {
                console.log("Can't find Legion spawn chance file. Make sure you have it in your config folder.");
            }

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
        } else {
            this.logger.logWarning("No progress file exists for this profile, this is normal. Creating...");
            this.createLegionProgressFile();
            this.logger.log(`Progression file for ${LegionController.profileId} created.`, LogTextColor.MAGENTA);
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

        const legionSpawnPath = `${LegionController.modLoc}/config/profiles/${LegionController.profileId}/LegionChance.json`;
        const spawnChance = JSON.parse(fs.readFileSync(legionSpawnPath, "utf8")) as legionProgression;
        bossLegionChance = spawnChance?.legionChance ?? 15;

        try {
            const swagBossConfigPath = path.join(__dirname, "../../../SWAG/config/bossConfig.json");
            const swagLegionPath = path.join(__dirname, "../../../SWAG/config/custom/legion.json");

            // Verify file existence before reading
            if (!fs.existsSync(swagBossConfigPath) || !fs.existsSync(swagLegionPath)) {
                this.logger.logWarning("SWAG config files not found, skipping swagPatch");
                return;
            }

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

            // Write with error handling
            try {
                fs.writeFileSync(swagBossConfigPath, JSON.stringify(swagBossConfig, null, 2), "utf-8");
                fs.writeFileSync(swagLegionPath, JSON.stringify(swagLegionConfig, null, 2), "utf-8");
            } catch (writeError) {
                this.logger.logError(`Error writing SWAG config: ${writeError}. Files may be locked by another process.`);
            }
        } catch (error) {
            this.logger.logError(`Error adding Legion to SWAG: ${error}`);
        }
    }

    private modifySpawnChance(info: any, output: any): void {
        let bossLegionChance = 15;

        const legionSpawnPath = `${LegionController.modLoc}/config/profiles/${LegionController.profileId}/LegionChance.json`;
        const spawnChance = JSON.parse(fs.readFileSync(legionSpawnPath, "utf8")) as legionProgression;
        const pmcData: IPmcData = info.results.profile;
        const victimRoles = pmcData.Stats.Eft.Victims?.map((victim) => victim.Role.toLowerCase());
        bossLegionChance = spawnChance?.legionChance ?? 15;

        if (victimRoles?.includes("bosslegion")) {
            bossLegionChance = 10;

            this.logger.log("Legion eliminated", LogTextColor.MAGENTA);
        }

        if (info.results.result === "Survived") {
            bossLegionChance += 1.5;
            if (this.configManager.debugConfig().debugMode) {
                this.logger.log("Survived raid. Increasing Legion chance by 1.5", LogTextColor.CYAN);
            }
        }

        if (info.results.result === "Runner") {
            bossLegionChance += 3;
            if (this.configManager.debugConfig().debugMode) {
                this.logger.log("Left raid early. Increasing Legion chance by 3", LogTextColor.CYAN);
            }
        }

        if (info.results.result === "Left") {
            bossLegionChance += 0.5;
            if (this.configManager.debugConfig().debugMode) {
                this.logger.log("Left raid. Increasing Legion chance by 0.5", LogTextColor.CYAN);
            }
        }

        if (info.results.result === "Killed") {
            bossLegionChance += 1;
            if (this.configManager.debugConfig().debugMode) {
                this.logger.log("Died in raid. Increasing Legion chance by 1", LogTextColor.CYAN);
            }
        }

        if (bossLegionChance > 100) {
            bossLegionChance = 100;
        }

        if (bossLegionChance < 1) {
            bossLegionChance = 1;
        }

        spawnChance.legionChance = bossLegionChance;

        try {
            fs.writeFileSync(legionSpawnPath, JSON.stringify(spawnChance, null, 4), "utf-8");
        } catch (error) {
            this.logger.logError(`Error writing Legion progress file: ${error}`);
        }

        return output;
    }

    private handleReputationLogic(info: any, sessionId: string, isLowLevel: boolean, useReqShop: boolean, useBoss: boolean): void {
        if (useReqShop) {
            this.traderController.traderRepLogic(info, sessionId);
            if (useBoss) {
                this.traderController.legionRepLogic(info, sessionId);
            } else {
                this.traderController.noBossRepLogic(info, sessionId);
            }
        } else {
            if (useBoss) {
                this.pkController.legionRepLogicReqDisabled(info, sessionId);
            } else {
                this.pkController.noBossRepLogicReqDisabled(info, sessionId);
            }
        }
    }

    private handleBossSpawnLogic(info: any, output: any, isLowLevel: boolean, useBoss: boolean): void {
        if (!useBoss) return;

        if (isLowLevel) {
            LegionController.legionFileChance = 0;

            const legionSpawnPath = `${LegionController.modLoc}/config/profiles/${LegionController.profileId}/LegionChance.json`;
            const spawnChance = JSON.parse(fs.readFileSync(legionSpawnPath, "utf8")) as legionProgression;
            spawnChance.legionChance = LegionController.legionFileChance;
            fs.writeFileSync(legionSpawnPath, JSON.stringify(spawnChance, null, 2), "utf-8");

            this.logger.log(
                `Profile is under minimum spawn level for Legion, setting spawn chance to 0. \nHe'll be on the hunt after hitting level 10`,
                LogTextColor.MAGENTA,
            );
        } else {
            this.modifySpawnChance(info, output);
            this.pushLocationData();
        }
    }

    private moarLocationDataPatch(): void {
        let bossLegionChance = 15;

        const tables = this.databaseService.getTables();
        const escortAmount = this.randomUtil.randInt(1, 4).toString();
        const bossDifficulty = "normal";
        const escortDifficulty = "normal";
        const escortType = this.utils.drawRandom(botSettings.followers);
        const legionSpawnPath = `${LegionController.modLoc}/config/profiles/${LegionController.profileId}/LegionChance.json`;

        if (fs.existsSync(legionSpawnPath)) {
            try {
                const spawnChance = JSON.parse(fs.readFileSync(legionSpawnPath, "utf8")) as legionProgression;
                bossLegionChance = spawnChance?.legionChance ?? 15;
            } catch (error) {
                console.log("Can't find Legion spawn chance file. Make sure you have it in your config folder.");
            }
        }

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
                        LegionController.profileId = info.uid;

                        if (this.configManager.modConfig().EnableCustomBoss) {
                            const legionSpawnPath = `${LegionController.modLoc}/config/profiles/${LegionController.profileId}/LegionChance.json`;

                            if (!fs.existsSync(legionSpawnPath)) {
                                this.logger.logWarning(
                                    "No Legion progress file exists for this profile, this is normal. Creating...",
                                );
                                this.createLegionProgressFile();
                                this.logger.log(
                                    `Legion progression file for ${LegionController.profileId} created.`,
                                    LogTextColor.MAGENTA,
                                );
                            }

                            if (!LegionController.setupRan) {
                                const profileLevel = this.utils.checkProfileLevel(LegionController.profileId);
                                if (profileLevel != null && profileLevel < 10) {
                                    this.logger.log(
                                        `Profile is under minimum spawn level for Legion, setting spawn chance to 0. \nHe'll be on the hunt after level 10`,
                                        LogTextColor.MAGENTA,
                                    );
                                    LegionController.legionFileChance = 0;

                                    const spawnChance = JSON.parse(
                                        fs.readFileSync(legionSpawnPath, "utf8"),
                                    ) as legionProgression;
                                    spawnChance.legionChance = LegionController.legionFileChance;
                                    fs.writeFileSync(legionSpawnPath, JSON.stringify(spawnChance, null, 2), "utf-8");

                                    this.pushLocationData();
                                } else {
                                    this.pushLocationData();
                                }
                                LegionController.setupRan = true;
                            }
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
                        if (this.configManager.debugConfig().debugMode && this.configManager.debugConfig().dumpData) {
                            this.createEndpointDataFile(info);
                        }

                        const pmcProfileExists = this.utils.checkProfileExists(LegionController.profileId);
                        if (!pmcProfileExists) {
                            if (this.configManager.debugConfig().debugMode) {
                                this.logger.logWarning("No profile detected. Not pushing Legion to maps");
                            }
                            this.removeBossSpawns();
                            return Promise.resolve(output);
                        }

                        const profileLevel = this.utils.checkProfileLevel(LegionController.profileId);
                        const isLowLevel = profileLevel != null && profileLevel < 10;
                        const useReqShop = this.configManager.modConfig().EnableRequisitionOffice;
                        const useBoss = this.configManager.modConfig().EnableCustomBoss;

                        this.handleReputationLogic(info, sessionId, isLowLevel, useReqShop, useBoss);
                        this.handleBossSpawnLogic(info, output, isLowLevel, useBoss);

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

    public removeLegionPatch(): void {
        const swagFolder = path.join(__dirname, "../../../SWAG");

        if (fs.existsSync(swagFolder)) {
            const swagBossConfigPath = path.join(__dirname, "../../../SWAG/config/bossConfig.json");
            const swagBossConfig = JSON.parse(fs.readFileSync(swagBossConfigPath, "utf-8"));
            swagBossConfig.CustomBosses.legion.enabled = false;

            fs.writeFileSync(swagBossConfigPath, JSON.stringify(swagBossConfig, null, 2), "utf-8");
        } else {
            this.logger.logDebug("SWAG not detected. Skipping RemoveLegionPatch.");
        }
    }

    private createLegionProgressFile(): void {
        const legionProgressActual = this.configManager.debugConfig().baseLegionChance;
        const progressFileLegion = (LegionController.progressFile = {
            legionChance: legionProgressActual,
        });

        const progressLocFolder = `${LegionController.modLoc}/config/profiles/${LegionController.profileId}`;
        const progressLoc = `${progressLocFolder}/LegionChance.json`;
        if (!fs.existsSync(progressLocFolder)) {
            fs.mkdirSync(progressLocFolder, { recursive: true });
        }

        try {
            fs.writeFileSync(progressLoc, JSON.stringify(progressFileLegion, null, 4));
        } catch (error) {
            this.logger.logError(`Error writing Legion progress file: ${error}`);
        }
    }

    private createEndpointDataFile(data: any): void {
        const dataLocFolder = `${LegionController.modLoc}/ROData/Endpoints`;
        const dataLoc = `${dataLocFolder}/endpointData.json`;
        if (!fs.existsSync(dataLocFolder)) {
            fs.mkdirSync(dataLocFolder, { recursive: true });
        }

        try {
            fs.writeFileSync(dataLoc, JSON.stringify(data, null, 4));
        } catch (error) {
            this.logger.logError(`Error writing endpoint data file: ${error}`);
        }
    }
}
