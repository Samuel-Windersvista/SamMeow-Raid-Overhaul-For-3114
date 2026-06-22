import { inject, injectable } from "tsyringe";
//Custom Classes
import type { ReqsController } from "../controllers/ReqsController";
import type { PkController } from "../controllers/PkController";
import type { TraderUtils } from "../utils/TraderUtils";
import type { ConfigManager } from "./ConfigManager";
import type { Utils } from "../utils/Utils";
//Json Imports
import * as baseJson2 from "../../db/baseNoBoss.json";
import * as baseJson from "../../db/base.json";

@injectable()
export class TraderManager {
    constructor(
        @inject("Utils") protected utils: Utils,
        @inject("TraderUtils") protected traderUtils: TraderUtils,
        @inject("ConfigManager") protected configManager: ConfigManager,
        @inject("PkController") protected pkController: PkController,
        @inject("ReqsController") protected reqsController: ReqsController,
    ) {}

    public pushExports(): void {
        //Add Req Shop to the game
        this.traderUtils.pushTrader(baseJson);

        //Add Req Shop to Locales
        this.traderUtils.addTraderToLocales(
            "Requisitions Office",
            "A collection of Ex-PMC's and rogue Scavs who formed a group to aid others in Tarkov. They routinely scour the battlefield for any leftover supplies and aren't afraid to fight their old comrades for it. They may not be the most trustworthy but they do have some much needed provisions in stock.",
            baseJson,
        );

        //Add custom quests
        this.utils.addQuests();
    }

    public pushExports2(): void {
        //Add Req Shop to the game
        this.traderUtils.pushTrader(baseJson2);

        //Add Req Shop to Locales
        this.traderUtils.addTraderToLocales(
            "Requisitions Office",
            "A collection of Ex-PMC's and rogue Scavs who formed a group to aid others in Tarkov. They routinely scour the battlefield for any leftover supplies and aren't afraid to fight their old comrades for it. They may not be the most trustworthy but they do have some much needed provisions in stock.",
            baseJson2,
        );

        //Add custom quests
        this.utils.addQuests2();
    }

    public buildReqAssort(): void {
        //Push each type of item to the assort
        this.reqsController.createWeaponFluidAssort();
        this.reqsController.createItemsFluidAssort();
        this.reqsController.createPlateFluidAssort();
        this.reqsController.createGearFluidAssort();
        this.reqsController.createMedsFluidAssort();
        this.reqsController.createSpecFluidAssort();
        this.reqsController.createModsFluidAssort();
        this.reqsController.createAmmoFluidAssort();
        this.reqsController.addContainers();
        this.reqsController.addReqSlips();
        this.reqsController.addReqCoins();
        this.reqsController.addSpecialReqs();
        this.reqsController.addWeaponPresets();
        this.reqsController.addGearPresets();
        this.reqsController.addBaseKeys();
        this.reqsController.addNewKeys();
        this.reqsController.addFlares();
        //Push custom items to the assort if they're enabled
        if (this.configManager.modConfig().EnableCustomItems) {
            this.reqsController.addCustomPresets();
            this.reqsController.addStaticItems();
            this.reqsController.addAmmo();
        }
    }

    public buildPkAssort(): void {
        //Push each type of item to the assort
        this.pkController.addContainers();
        this.pkController.addReqSlips();
        this.pkController.addReqCoins();
        this.pkController.addSpecialReqs();
        this.pkController.addNewKeys();
        this.pkController.addFlares();
        //Push custom items to the assort if they're enabled
        if (this.configManager.modConfig().EnableCustomItems) {
            this.pkController.addCustomPresets();
            this.pkController.addStaticItems();
            this.pkController.addAmmo();
        }
    }
}
