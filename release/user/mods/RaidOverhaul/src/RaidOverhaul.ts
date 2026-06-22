import { inject, injectable } from "tsyringe";
//Spt Classes
import type { IRagfairConfig } from "@spt/models/spt/config/IRagfairConfig";
import type { DatabaseService } from "@spt/services/DatabaseService";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";
import type { ConfigServer } from "@spt/servers/ConfigServer";
import { ConfigTypes } from "@spt/models/enums/ConfigTypes";
import { Traders } from "@spt/models/enums/Traders";
//Custom Classes
import type { LegionControllerGlobal } from "./controllers/LegionControllerGlobal";
import type { ROWeatherController } from "./controllers/WeatherController";
import type { ROHealthController } from "./controllers/HealthController";
import type { ClothingGenerator } from "./generators/ClothingGenerator";
import type { LegionController } from "./controllers/LegionController";
import type { RaidController } from "./controllers/RaidController";
import type { ItemController } from "./controllers/ItemController";
import type { DynamicRouters } from "./routers/DynamicRouterHooks";
import type { StaticRouters } from "./routers/StaticRouterHooks";
import type { ItemGenerator } from "./generators/ItemGenerator";
import type { SlotGenerator } from "./generators/SlotGenerator";
import type { ConfigManager } from "./managers/ConfigManager";
import type { TraderManager } from "./managers/TraderManager";
import type { TraderUtils } from "./utils/TraderUtils";
import type { ROLogger } from "./utils/Logger";
import type { Utils } from "./utils/Utils";
//Json Imports
//const legionClothes = require("../db/ItemGen/Clothes/LegionClothing.json");
import * as baseJson from "../db/base.json";
//Modules
import fs from "node:fs";

@injectable()
export class RaidOverhaul {
    constructor(
        @inject("Utils") protected utils: Utils,
        @inject("ROLogger") protected logger: ROLogger,
        @inject("TraderUtils") protected traderUtils: TraderUtils,
        @inject("TraderManager") protected traderManager: TraderManager,
        @inject("ConfigManager") protected configManager: ConfigManager,
        @inject("SlotGenerator") protected slotGenerator: SlotGenerator,
        @inject("ItemGenerator") protected itemGenerator: ItemGenerator,
        @inject("StaticRouters") protected staticRouters: StaticRouters,
        @inject("DynamicRouters") protected dynamicRouters: DynamicRouters,
        @inject("ItemController") protected itemController: ItemController,
        @inject("RaidController") protected raidController: RaidController,
        @inject("LegionController") protected legionController: LegionController,
        @inject("ClothingGenerator") protected clothingGenerator: ClothingGenerator,
        @inject("ROHealthController") protected roHealthController: ROHealthController,
        @inject("ROWeatherController") protected weatherController: ROWeatherController,
        @inject("LegionControllerGlobal") protected legionControllerGlobal: LegionControllerGlobal,
        @inject("ConfigServer") protected configServer: ConfigServer,
        @inject("DatabaseService") protected databaseService: DatabaseService,
    ) {}

    public async preSptLoadAsync(): Promise<void> {
        const swagKey = "SWAG";
        const moarKey = "DewardianDev-MOAR";
        const ragfair = this.configServer.getConfig<IRagfairConfig>(ConfigTypes.RAGFAIR);

        if (this.configManager.modConfig().RemoveFromSwag) {
            return;
        }
        if (this.configManager.debugConfig().debugMode) {
            this.logger.debugModeWarning();
        }
        if (this.configManager.modConfig().EnableRequisitionOffice) {
            this.traderUtils.registerProfileImage();
            this.traderUtils.setupTraderUpdateTime("66f0eaa93f6cc015bc1f3acb");

            Traders["66f0eaa93f6cc015bc1f3acb"] = "66f0eaa93f6cc015bc1f3acb";
            ragfair.traders[baseJson._id] = true;
        }

        //Register router hooks
        this.staticRouters.registerHooks();
        this.dynamicRouters.registerHooks();

        //Load Boss features
        if (this.utils.checkForMod(swagKey)) {
            this.logger.log("SWAG detected, modifying Legion patterns.", LogTextColor.MAGENTA);
        }
        if (this.utils.checkForMod(moarKey)) {
            this.logger.log("MOAR detected, modifying Legion patterns.", LogTextColor.MAGENTA);
        }
        if (!this.fikaInstalled() && !this.configManager.modConfig().UseLegionGlobalSpawnChance) {
            this.legionController.legionPreSptPatch();
        } else {
            const globalSpawnChance = this.configManager.modConfig().GlobalSpawnChance;

            this.legionControllerGlobal.legionPreSptPatch();
            this.logger.log(
                `Using global legion configuration due to Fika detection or enabling global spawn chance in the config. \nSpawn chance set to ${globalSpawnChance}`,
                LogTextColor.CYAN,
            );
        }
    }

    public async postDBLoadAsync(): Promise<void> {
        //Random message on server on startup
        const messageArray = [
            "The hamsters can take a break now",
            "Time to get wrecked by Birdeye LOL",
            "Back to looking for cat pics",
            "I made sure to crank up your heart attack event chances",
            "If there's a bunch of red text it's 100% not my fault",
            "We are legion, for we are many",
            "All Hail the Cult of Cj",
            "Good luck out there",
        ];
        const randomMessage = messageArray[Math.floor(Math.random() * messageArray.length)];

        //Remove boss from SWAG
        if (this.configManager.modConfig().RemoveFromSwag) {
            this.legionController.removeLegionPatch();
            this.logger.logError("Removing Legion from Swag config. Ready to uninstall.");
            return;
        }

        //Check for proper install
        if (!this.fikaInstalled()) {
            const pluginRO = "raidoverhaul.dll";
            const prePatchRO = "legionprepatch.dll";
            const pluginPath = fs.readdirSync("./BepInEx/plugins/RaidOverhaul").map((plugin) => plugin.toLowerCase());
            const patcherPath = fs.readdirSync("./BepInEx/patchers").map((patcher) => patcher.toLowerCase());

            if (!this.utils.checkDependancies(pluginPath, pluginRO)) {
                this.logger.logError(
                    "Error, client portion of Raid Overhaul is missing from BepInEx/plugins folder.\nPlease install correctly.",
                );
                return;
            }
            if (!this.utils.checkDependancies(patcherPath, prePatchRO)) {
                this.logger.logError(
                    "Error, Legion Boss PrePatch is missing from BepInEx/patchers folder.\nPlease install correctly.",
                );
                return;
            }
        }

        this.loadCustomItems();
        if (this.configManager.modConfig().EnableRequisitionOffice) {
            this.loadTraderData();
        }
        if (!this.configManager.modConfig().EnableRequisitionOffice) {
            this.traderManager.buildPkAssort();
        }
        if (this.configManager.modConfig().EnableCustomBoss) {
            this.pushBossData();
        }
        if (this.configManager.debugConfig().debugMode && this.configManager.debugConfig().dumpData) {
            this.utils.generateFluidAssortData();
            this.utils.generateAmmoTypeData();
            this.utils.generatePresetData();
            //this.utils.writePresetKeys();
        }
        this.pushModFeatures();

        this.logger.log(`has finished modifying your raids. ${randomMessage}.`, LogTextColor.CYAN);
    }

    private loadCustomItems(): void {
        const tables = this.databaseService.getTables();
        const realismKey = "SPT-Realism";
        //Load all custom items
        this.itemGenerator.createCustomItems("../../db/ItemGen/Currency");
        this.itemGenerator.createCustomItems("../../db/ItemGen/ConstItems");
        this.itemGenerator.createCustomItems("../../db/ItemGen/CustomKeys");
        this.itemGenerator.createCustomItems("../../db/ItemGen/Cases");
        if (this.configManager.modConfig().EnableCustomItems) {
            if (this.utils.checkForMod(realismKey)) {
                this.itemGenerator.createCustomItems("../../db/ItemGen/Ammo Realism");
                this.logger.log("Realism detected, modifying custom ammunition.", LogTextColor.MAGENTA);
            } else if (!this.utils.checkForMod(realismKey)) {
                this.itemGenerator.createCustomItems("../../db/ItemGen/Ammo");
            }
            this.itemGenerator.createCustomItems("../../db/ItemGen/Weapons");
            this.itemGenerator.createCustomItems("../../db/ItemGen/Gear");
            this.slotGenerator.buildSlots();
        }
        tables.locations.laboratory.base.AccessKeys.push(...["66a2fc9886fbd5d38c5ca2a6"]);
    }

    private loadTraderData(): void {
        // Load Trader Data
        if (this.configManager.modConfig().EnableCustomBoss) {
            this.traderManager.pushExports();
            this.traderManager.buildReqAssort();
        } else if (!this.configManager.modConfig().EnableCustomBoss) {
            this.traderManager.pushExports2();
            this.traderManager.buildReqAssort();
        }
        return;
    }

    private pushModFeatures(): void {
        //Push all the mods base features
        this.raidController.raidChanges();
        this.itemController.itemChanges();
        this.raidController.lootChanges();
        this.itemController.stackChanges();
        this.raidController.weightChanges();
        this.raidController.traderTweaks();
        if (this.configManager.modConfig().Raid.ModifyEnemyBotHealth) {
            this.roHealthController.modifyEnemyHealth();
        }
        if (
            this.configManager.modConfig().Seasons.EnableWeatherOptions &&
            this.configManager.modConfig().Seasons.WinterWonderland
        ) {
            this.weatherController.weatherChangesWinterWonderland();
        }
    }

    private pushBossData(): void {
        // Load custom boss data
        this.legionController.addBossToDb();
        //this.clothingGenerator.createClothingTop(legionClothes.Shirt);
        //this.clothingGenerator.createClothingBottom(legionClothes.Pants);
    }

    private fikaInstalled(): boolean {
        const pluginPath = fs.readdirSync("./BepInEx/plugins").map((plugin) => plugin.toLowerCase());
        const fika = "fika.core.dll";
        const dediClient = "fika.dedicated.dll";

        if (!this.utils.checkDependancies(pluginPath, fika) && !this.utils.checkDependancies(pluginPath, dediClient)) {
            return false;
        } else {
            return true;
        }
    }
}
