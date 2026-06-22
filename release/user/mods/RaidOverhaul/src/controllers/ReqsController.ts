import { inject, injectable } from "tsyringe";
//Spt Classes
import type { ProbabilityHelper } from "@spt/helpers/ProbabilityHelper";
import type { DatabaseService } from "@spt/services/DatabaseService";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";
import type { IPmcData } from "@spt/models/eft/common/IPmcData";
import type { TraderHelper } from "@spt/helpers/TraderHelper";
import type { RandomUtil } from "@spt/utils/RandomUtil";
//Custom Classes
import type { ConfigManager } from "../managers/ConfigManager";
import type { AssortUtils } from "../utils/AssortUtils";
import type { ROLogger } from "../utils/Logger";
import type { Utils } from "../utils/Utils";
import { Currency } from "../models/Enums";
//Json Imports
const customPresetArray = require("../utils/data/customPresets.json");
const items = require("../utils/data/shopArrays.json");

@injectable()
export class ReqsController {
    constructor(
        @inject("Utils") protected utils: Utils,
        @inject("ROLogger") protected logger: ROLogger,
        @inject("AssortUtils") protected assortUtils: AssortUtils,
        @inject("ConfigManager") protected configManager: ConfigManager,
        @inject("RandomUtil") protected randomUtil: RandomUtil,
        @inject("TraderHelper") protected traderHelper: TraderHelper,
        @inject("ProbabilityHelper") protected probHelper: ProbabilityHelper,
        @inject("DatabaseService") protected databaseService: DatabaseService,
    ) {}

    //#region Plates
    public createPlateFluidAssort(): void {
        let count = 0;

        for (const item of items.plates) {
            if (this.probHelper.rollChance(13, 100)) {
                this.assortUtils.buildBaseAssort(
                    item,
                    this.utils.genRandomCount(0, 10),
                    this.utils.genRandomCount(1, 4),
                );
                count++;
            }
        }

        if (this.configManager.debugConfig().debugMode) {
            this.logger.log(`${count} total plates have been added`, LogTextColor.GREEN);
        }
    }

    //#endregion
    //
    //
    //
    //#region Meds

    public createMedsFluidAssort(): void {
        let count = 0;

        for (const item of items.meds) {
            if (this.probHelper.rollChance(20, 100)) {
                this.assortUtils.buildBaseAssort(
                    item,
                    this.utils.genRandomCount(0, 10),
                    this.utils.genRandomCount(1, 4),
                );
                count++;
            }
        }

        if (this.configManager.debugConfig().debugMode) {
            this.logger.log(`${count} total meds have been added`, LogTextColor.GREEN);
        }
    }

    //#endregion
    //
    //
    //
    //#region Gear

    public createGearFluidAssort(): void {
        let count = 0;

        for (const item of items.gear) {
            if (this.probHelper.rollChance(10, 100)) {
                this.assortUtils.buildBaseAssort(
                    item,
                    this.utils.genRandomCount(0, 10),
                    this.utils.genRandomCount(1, 4),
                );
                count++;
            }
        }

        if (this.configManager.debugConfig().debugMode) {
            this.logger.log(`${count} total pieces of gear have been added`, LogTextColor.GREEN);
        }
    }

    //#endregion
    //
    //
    //
    //#region Mods

    public createModsFluidAssort(): void {
        let count = 0;

        for (const item of items.mods) {
            if (this.probHelper.rollChance(5, 100)) {
                this.assortUtils.buildBaseAssort(
                    item,
                    this.utils.genRandomCount(0, 10),
                    this.utils.genRandomCount(1, 4),
                );
                count++;
            }
        }

        if (this.configManager.debugConfig().debugMode) {
            this.logger.log(`${count} total weapon mods have been added`, LogTextColor.GREEN);
        }
    }

    //#endregion
    //
    //
    //
    //#region Ammo

    public createAmmoFluidAssort(): void {
        let count = 0;

        for (const item of items.ammo) {
            if (this.probHelper.rollChance(9, 100)) {
                this.assortUtils.createSingleItemOffer(
                    item,
                    this.utils.genRandomCount(50, 300),
                    this.utils.genRandomCount(1, 4),
                    this.utils.getFormCost(item),
                    Currency.ReqCoins,
                );
                count++;
            }
        }

        if (this.configManager.debugConfig().debugMode) {
            this.logger.log(`${count} total types of ammo have been added`, LogTextColor.GREEN);
        }
    }

    //#endregion
    //
    //
    //
    //#region Items

    public createItemsFluidAssort(): void {
        let count = 0;

        for (const item of items.items) {
            if (this.probHelper.rollChance(11, 100)) {
                this.assortUtils.buildBaseAssort(
                    item,
                    this.utils.genRandomCount(0, 10),
                    this.utils.genRandomCount(1, 4),
                );
                count++;
            }
        }

        if (this.configManager.debugConfig().debugMode) {
            this.logger.log(`${count} total items have been added`, LogTextColor.GREEN);
        }
    }

    //#endregion
    //
    //
    //
    //#region Weapon Bases

    public createWeaponFluidAssort(): void {
        let count = 0;

        for (const item of items.weaponBase) {
            if (this.probHelper.rollChance(7, 100)) {
                this.assortUtils.buildBaseAssort(
                    item,
                    this.utils.genRandomCount(0, 10),
                    this.utils.genRandomCount(1, 4),
                );
                count++;
            }
        }

        if (this.configManager.debugConfig().debugMode) {
            this.logger.log(`${count} total weapons have been added`, LogTextColor.GREEN);
        }
    }

    //#endregion
    //
    //
    //
    //#region Special Items

    public createSpecFluidAssort(): void {
        let count = 0;

        for (const item of items.special) {
            if (this.probHelper.rollChance(8, 100)) {
                count++;

                try {
                    this.assortUtils.createSingleItemOffer(
                        item,
                        this.utils.genRandomCount(0, 1),
                        this.utils.genRandomCount(1, 4),
                        this.utils.getReqCost(item),
                        Currency.ReqSlips,
                    );
                } catch (error) {
                    this.logger.logError(`Error loading Special Items from Fluid Assort Trader Generator: ${error}`);
                }
            }
        }

        if (this.configManager.debugConfig().debugMode) {
            this.logger.log(`${count} total special items have been added`, LogTextColor.GREEN);
        }
    }

    //#endregion
    //
    //
    //
    //#region Static Items

    public addStaticItems(): void {
        let count = 0;

        for (const item of items.staticItems) {
            if (this.probHelper.rollChance(13, 100)) {
                this.assortUtils.createSingleItemOffer(
                    item,
                    this.utils.genRandomCount(0, 7),
                    this.utils.genRandomCount(1, 4),
                    this.utils.getReqCost(item),
                    Currency.ReqSlips,
                );
                count++;
            }
        }

        if (this.configManager.debugConfig().debugMode) {
            this.logger.log(`${count} total static items have been added`, LogTextColor.GREEN);
        }
    }

    //#endregion
    //
    //
    //
    //#region Keys

    public addBaseKeys(): void {
        let count = 0;

        for (const item of items.keys) {
            if (this.probHelper.rollChance(3, 100)) {
                this.assortUtils.buildBaseAssort(
                    item,
                    this.utils.genRandomCount(0, 3),
                    this.utils.genRandomCount(1, 4),
                );
                count++;
            }
        }

        if (this.configManager.debugConfig().debugMode) {
            this.logger.log(`${count} total keys have been added`, LogTextColor.GREEN);
        }
    }

    //#endregion
    //
    //
    //
    //#region Req Slips

    public addReqSlips(): void {
        const formCost = Math.round(53999 / 175);

        this.assortUtils.createSingleItemOffer(
            Currency.ReqSlips,
            this.utils.genRandomCount(1, 20),
            1,
            this.utils.genRandomCount(formCost * 0.75, formCost * 1.25),
            Currency.ReqCoins,
        );
        this.assortUtils.createSingleItemOffer(
            Currency.ReqSlips,
            this.utils.genRandomCount(1, 20),
            1,
            this.utils.genRandomCount(1, 5),
            Currency.GPCoins,
        );
    }

    //#endregion
    //
    //
    //
    //#region Req Forms

    public addReqCoins(): void {
        this.assortUtils.createSingleItemOffer(
            Currency.ReqCoins,
            this.utils.genRandomCount(100, 7000),
            1,
            this.utils.genRandomCount(175 * 0.75, 175 * 1.25),
            Currency.Roubles,
        );
    }

    //#endregion
    //
    //
    //
    //#region Special Reqs

    public addSpecialReqs(): void {
        this.assortUtils.createSingleItemOffer(
            Currency.SpecialReqs,
            this.utils.genRandomCount(100, 7000),
            1,
            50,
            Currency.ReqSlips,
        );
    }

    //#endregion
    //
    //
    //
    //#region Custom Keys

    public addNewKeys(): void {
        if (this.probHelper.rollChance(10, 100)) {
            this.assortUtils.createSingleItemOffer("66a2fc926af26cc365283f23", 1, 1, 10, Currency.SpecialReqs);
        }

        if (this.probHelper.rollChance(10, 100)) {
            this.assortUtils.createSingleItemOffer("66a2fc9886fbd5d38c5ca2a6", 1, 1, 10, Currency.SpecialReqs);
        }
    }

    //#endregion
    //
    //
    //
    //#region Flares

    public addFlares(): void {
        this.assortUtils.createSingleItemOffer(
            "67cde31eea2d15e888fa7dee",
            this.utils.genRandomCount(1, 3),
            1,
            this.utils.genRandomCount(2, 6),
            Currency.ReqSlips,
        );
        this.assortUtils.createSingleItemOffer(
            "67cda57f8f59300db5c0ec5b",
            this.utils.genRandomCount(1, 3),
            1,
            this.utils.genRandomCount(15, 25),
            Currency.ReqSlips,
        );
    }

    //#endregion
    //
    //
    //
    //#region Containers

    public addContainers(): void {
        this.assortUtils.createSingleItemOffer("67c957ce411e6263333a1c38", 1, 4, 1, Currency.SpecialReqs);
        this.assortUtils.createSingleItemOffer("666361eff60f4ea5a464eb70", 1, 4, 3, Currency.SpecialReqs);
        this.assortUtils.createSingleItemOffer("664a55d84a90fc2c8a6305c9", 1, 1, 1, Currency.SpecialReqs);
        this.assortUtils.createSingleItemOffer("67222453e6aee984bcfcf9d1", 1, 2, 5, Currency.ReqSlips);
        this.assortUtils.createSingleItemOffer("6722254fd847a7aafccfbb54", 1, 1, 10, Currency.ReqSlips);
        this.assortUtils.createSingleItemOffer("6722252e82ca09a7e62c4d84", 1, 3, 20, Currency.ReqSlips);
        this.assortUtils.createSingleItemOffer("67d4373526a3cfb1ff5338bb", 1, 2, 15, Currency.ReqSlips);
        this.assortUtils.createSingleItemOffer("67fefea22cc2bce48d31e21f", 1, 2, 5, Currency.ReqSlips);
        this.assortUtils.createSingleItemOffer("67fefe885041d8c121e93bf8", 1, 2, 20, Currency.ReqSlips);
    }

    //#endregion
    //
    //
    //
    //#region Custom Ammo

    public addAmmo(): void {
        this.assortUtils.createSingleItemOffer(
            "66280a30d3b6f288cb6b9653",
            this.randomUtil.randInt(50, 300),
            1,
            this.utils.getFormCost("66280a30d3b6f288cb6b9653"),
            Currency.ReqCoins,
        );
        this.assortUtils.createSingleItemOffer(
            "662809f445b5ff428e21ac0a",
            this.randomUtil.randInt(50, 300),
            1,
            this.utils.getFormCost("662809f445b5ff428e21ac0a"),
            Currency.ReqCoins,
        );
        this.assortUtils.createSingleItemOffer(
            "662808ec26a8e83120bb25fe",
            this.randomUtil.randInt(50, 300),
            1,
            this.utils.getFormCost("662808ec26a8e83120bb25fe"),
            Currency.ReqCoins,
        );

        this.assortUtils.createSingleItemOffer(
            "6628185208dd86f969db7e03",
            this.randomUtil.randInt(50, 300),
            1,
            this.utils.getFormCost("6628185208dd86f969db7e03"),
            Currency.ReqCoins,
        );
        this.assortUtils.createSingleItemOffer(
            "662818a23a552da6aef8fada",
            this.randomUtil.randInt(50, 300),
            1,
            this.utils.getFormCost("662818a23a552da6aef8fada"),
            Currency.ReqCoins,
        );

        this.assortUtils.createSingleItemOffer(
            "66281ab7fca966e5021f81b5",
            this.randomUtil.randInt(10, 50),
            1,
            this.utils.getFormCost("66281ab7fca966e5021f81b5"),
            Currency.ReqCoins,
        );
        this.assortUtils.createSingleItemOffer(
            "66281ac038f9aebf6f914138",
            this.randomUtil.randInt(5, 30),
            1,
            this.utils.getFormCost("66281ac038f9aebf6f914138"),
            Currency.ReqCoins,
        );
    }

    //#endregion
    //
    //
    //
    //#region Weapon Presets

    public addWeaponPresets(): void {
        let count = 0;
        const tables = this.databaseService.getTables();
        const globalsPresets = tables.globals.ItemPresets;

        for (const key of items.weaponPresetKeys) {
            if (this.probHelper.rollChance(6, 100)) {
                try {
                    this.assortUtils.buildPresetAssort(
                        globalsPresets[key]._items,
                        this.utils.genRandomCount(1, 3),
                        this.utils.genRandomCount(1, 4),
                        globalsPresets[key]._name,
                    );

                    if (this.configManager.debugConfig().debugMode) {
                        this.logger.log(
                            `${globalsPresets[key]._name} has been added to the Req Shop`,
                            LogTextColor.GREEN,
                        );
                    }
                    count++;
                } catch (error) {
                    this.logger.log(`Error loading weapon preset => ${error}, skipping.`, LogTextColor.RED);
                }
            }
        }

        if (this.configManager.debugConfig().debugMode) {
            this.logger.log(`${count} total weapon presets have been added`, LogTextColor.GREEN);
        }
    }

    //#endregion
    //
    //
    //
    //#region Gear Presets

    public addGearPresets(): void {
        let count = 0;
        const tables = this.databaseService.getTables();
        const globalsPresets = tables.globals.ItemPresets;

        for (const key of items.gearPresetKeys) {
            if (this.probHelper.rollChance(9, 100)) {
                try {
                    this.assortUtils.buildPresetAssort(
                        globalsPresets[key]._items,
                        this.utils.genRandomCount(1, 3),
                        this.utils.genRandomCount(1, 4),
                        globalsPresets[key]._name,
                    );

                    if (this.configManager.debugConfig().debugMode) {
                        this.logger.log(
                            `${globalsPresets[key]._name} has been added to the Req Shop`,
                            LogTextColor.GREEN,
                        );
                    }
                    count++;
                } catch (error) {
                    this.logger.log(`Error loading gear preset => ${error}, skipping.`, LogTextColor.RED);
                }
            }
        }

        if (this.configManager.debugConfig().debugMode) {
            this.logger.log(`${count} total gear presets have been added`, LogTextColor.GREEN);
        }
    }

    //#endregion
    //
    //
    //
    //#region Custom Presets

    public addCustomPresets(): void {
        let count = 0;

        for (const key of items.customPresetKeys) {
            if (this.probHelper.rollChance(13, 100)) {
                try {
                    this.assortUtils.buildPresetAssort(
                        customPresetArray[key]._items,
                        this.utils.genRandomCount(1, 3),
                        this.utils.genRandomCount(1, 4),
                        customPresetArray[key]._name,
                    );

                    if (this.configManager.debugConfig().debugMode) {
                        this.logger.log(
                            `${customPresetArray[key]._name} has been added to the Req Shop`,
                            LogTextColor.GREEN,
                        );
                    }
                    count++;
                } catch (error) {
                    this.logger.log(`Error loading custom preset => ${error}, skipping.`, LogTextColor.RED);
                }
            }
        }

        if (this.configManager.debugConfig().debugMode) {
            this.logger.log(`${count} total custom presets have been added`, LogTextColor.GREEN);
        }
    }

    //#endregion
    //
    //
    //
    //#region Reputation Change Logic

    public traderRepLogic(info: any, sessionId: string): void {
        try {
            if (info.results.result === "Left") {
                return;
            } else if (info.results.result === "Killed") {
                return;
            } else if (info.results.result === "Runner") {
                return;
            } else if (info.results.result === "Survived") {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.03);
                if (this.configManager.debugConfig().debugMode) {
                    this.logger.log("Raid survived. Increasing Req Shop Rep by 0.03", LogTextColor.CYAN);
                }
                return;
            }
        } catch (error) {
            this.logger.logError(`Error modifying Trader Rep on Successful Raid Exfil: ${error}`);
        }
    }

    public legionRepLogic(info: any, sessionId: string): void {
        try {
            const pmcData: IPmcData = info.results.profile;
            const victimRole = pmcData.Stats.Eft.Victims?.map((victim) => victim.Role.toLowerCase());

            if (victimRole?.includes("bosslegion")) {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.15);
                return;
            } else if (victimRole?.includes("bossboar")) {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.15);
                return;
            } else if (victimRole?.includes("bossbully")) {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.15);
                return;
            } else if (victimRole?.includes("bossgluhar")) {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.15);
                return;
            } else if (victimRole?.includes("bosskilla")) {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.15);
                return;
            } else if (victimRole?.includes("bossknight")) {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.15);
                return;
            } else if (victimRole?.includes("bosskojaniy")) {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.15);
                return;
            } else if (victimRole?.includes("bosskolontay")) {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.15);
                return;
            } else if (victimRole?.includes("bosssanitar")) {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.15);
                return;
            } else if (victimRole?.includes("bosstagilla")) {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.15);
                return;
            } else if (victimRole?.includes("bosszryachiy")) {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.15);
                return;
            } else if (victimRole?.includes("followerbigpipe")) {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.15);
                return;
            } else if (victimRole?.includes("followerbirdeye")) {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.15);
                return;
            } else {
                return;
            }
        } catch (error) {
            this.logger.logError(`Error modifying Trader Rep on killing Legion: ${error}`);
        }
    }

    public noBossRepLogic(info: any, sessionId: string): void {
        try {
            const pmcData: IPmcData = info.results.profile;
            const victimRole = pmcData.Stats.Eft.Victims?.map((victim) => victim.Role.toLowerCase());

            if (victimRole?.includes("bossboar")) {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.15);
                return;
            } else if (victimRole?.includes("bossbully")) {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.15);
                return;
            } else if (victimRole?.includes("bossgluhar")) {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.15);
                return;
            } else if (victimRole?.includes("bosskilla")) {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.15);
                return;
            } else if (victimRole?.includes("bossknight")) {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.15);
                return;
            } else if (victimRole?.includes("bosskojaniy")) {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.15);
                return;
            } else if (victimRole?.includes("bosskolontay")) {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.15);
                return;
            } else if (victimRole?.includes("bosssanitar")) {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.15);
                return;
            } else if (victimRole?.includes("bosstagilla")) {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.15);
                return;
            } else if (victimRole?.includes("bosszryachiy")) {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.15);
                return;
            } else if (victimRole?.includes("followerbigpipe")) {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.15);
                return;
            } else if (victimRole?.includes("followerbirdeye")) {
                this.traderHelper.addStandingToTrader(sessionId, "66f0eaa93f6cc015bc1f3acb", 0.15);
                return;
            } else {
                return;
            }
        } catch (error) {
            this.logger.logError(`Error modifying Trader Rep on killing Legion: ${error}`);
        }
    }
    //#endregion
}
