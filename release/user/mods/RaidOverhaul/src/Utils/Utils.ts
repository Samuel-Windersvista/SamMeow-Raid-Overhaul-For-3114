import { inject, injectable } from "tsyringe";
//Spt Classes
import type { RagfairPriceService } from "@spt/services/RagfairPriceService";
import type { ISptProfile } from "@spt/models/eft/profile/ISptProfile";
import type { DatabaseService } from "@spt/services/DatabaseService";
import type { PreSptModLoader } from "@spt/loaders/PreSptModLoader";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";
import type { FileSystemSync } from "@spt/utils/FileSystemSync";
import type { IPmcData } from "@spt/models/eft/common/IPmcData";
import type { ProfileHelper } from "@spt/helpers/ProfileHelper";
import { BaseClasses } from "@spt/models/enums/BaseClasses";
import type { ImageRouter } from "@spt/routers/ImageRouter";
import type { RandomUtil } from "@spt/utils/RandomUtil";
import type { HashUtil } from "@spt/utils/HashUtil";
//Custom Classes
import type { ConfigManager } from "../managers/ConfigManager";
import type { ROLogger } from "./Logger";
//Modules
//import weaponPresets from "../utils/data/weaponPresets.json";
//import gearPresets from "../utils/data/gearPresets.json";
import path, { resolve } from "node:path";
import fs from "node:fs";

@injectable()
export class Utils {
    constructor(
        @inject("ROLogger") protected logger: ROLogger,
        @inject("ConfigManager") protected configManager: ConfigManager,
        @inject("FileSystemSync") protected sptFs: FileSystemSync,
        @inject("HashUtil") protected hashUtil: HashUtil,
        @inject("RandomUtil") protected randomUtil: RandomUtil,
        @inject("ImageRouter") protected imageRouter: ImageRouter,
        @inject("ProfileHelper") protected profileHelper: ProfileHelper,
        @inject("PreSptModLoader") protected preSptModLoader: PreSptModLoader,
        @inject("DatabaseService") protected databaseService: DatabaseService,
        @inject("RagfairPriceService") protected ragfairPriceService: RagfairPriceService,
    ) {}
    public static modLoc = path.join(__dirname, "..", "..");

    //#region Base Utils
    public loadFiles(dirPath, extName, cb): void {
        if (!fs.existsSync(dirPath)) return;
        const dir = fs.readdirSync(dirPath, { withFileTypes: true });
        dir.forEach((item) => {
            const itemPath = path.normalize(`${dirPath}/${item.name}`);
            if (item.isDirectory()) this.loadFiles(itemPath, extName, cb);
            else if (extName.includes(path.extname(item.name))) cb(itemPath);
        });
    }

    public addQuests(): void {
        const modPath = `${path.resolve(__dirname.toString()).split(path.sep).join("/")}/`;
        const tables = this.databaseService.getTables();
        let questCount = 0;
        let imageCount = 0;

        this.loadFiles(`${modPath}../../db/questFilesWithBoss/quests/`, [".json"], (filepath) => {
            const keys = require(filepath);
            for (const i in keys) {
                tables.templates.quests[i] = keys[i];
                questCount++;
            }
        });

        this.loadFiles(`${modPath}../../db/questFilesWithBoss/locales/`, [".json"], (localepath) => {
            const Locales = require(localepath);
            for (const i in Locales) {
                for (const localeID in tables.locales.global) {
                    tables.locales.global[localeID][i] = Locales[i];
                }
            }
        });

        this.loadFiles(`${modPath}../../db/questFilesWithBoss/pics/`, [".png", ".jpg"], (filepath) => {
            this.imageRouter.addRoute(`/files/quest/icon/${path.basename(filepath, path.extname(filepath))}`, filepath);
            imageCount++;
        });

        if (this.configManager.debugConfig().debugMode) {
            this.logger.log(`Loaded ${imageCount} custom images and ${questCount} custom quests.`, LogTextColor.CYAN);
        }
    }

    public addQuests2(): void {
        const modPath = `${path.resolve(__dirname.toString()).split(path.sep).join("/")}/`;
        const tables = this.databaseService.getTables();
        let questCount = 0;
        let imageCount = 0;

        this.loadFiles(`${modPath}../../db/questFilesNoBoss/quests/`, [".json"], (filepath) => {
            const keys = require(filepath);
            for (const i in keys) {
                tables.templates.quests[i] = keys[i];
                questCount++;
            }
        });

        this.loadFiles(`${modPath}../../db/questFilesNoBoss/locales/`, [".json"], (localepath) => {
            const Locales = require(localepath);
            for (const i in Locales) {
                for (const localeID in tables.locales.global) {
                    tables.locales.global[localeID][i] = Locales[i];
                }
            }
        });

        this.loadFiles(`${modPath}../../db/questFilesNoBoss/pics/`, [".png", ".jpg"], (filepath) => {
            this.imageRouter.addRoute(`/files/quest/icon/${path.basename(filepath, path.extname(filepath))}`, filepath);
            imageCount++;
        });

        if (this.configManager.debugConfig().debugMode) {
            this.logger.log(`Loaded ${imageCount} custom images and ${questCount} custom quests.`, LogTextColor.CYAN);
        }
    }

    /**
     * Checks the mods directory to see if another mod is installed.
     *
     * @param modName - Folder name of the mod to check for.
     * @returns True if the mod is installed, else return false.
     */
    public checkForMod(modName: string): boolean {
        return this.preSptModLoader.getImportedModsNames().includes(modName);
    }

    /**
     * Sorts and shuffles the specified array.
     *
     * @param array - Array to shuffle.
     * @returns The shuffled array.
     */
    public shuffle(array: string[]): string[] {
        return array.sort(() => Math.random() - 0.5);
    }

    /**
     * Generates a random string to be used as an instance Id.
     * Gens a new ID each time it runs so not suitable for tpls and such unless you cache the Id.
     *
     * @returns Valid instance Id.
     */
    public genId(): string {
        return this.hashUtil.generate();
    }

    /**
     * Generates a random number in the supplied range.
     *
     * @returns Random integer in the given range.
     */
    public genRandomCount(min: number, max: number): number {
        return this.randomUtil.randInt(min, max);
    }

    /**
     * Pulls a random item from the specified array.
     *
     * @param list - The array to pull from.
     * @param count - Optional param. The number of items to return from the array. Returns 1 if left unused
     * @returns The pulled item as a string.
     */
    public drawRandom(list: string[], count?: number): string {
        return this.randomUtil.drawRandomFromList(list, count ?? 1, false).toString();
    }

    /**
     * Checks for dependancies in the specified path.
     *
     * @param path - The path to your dependancy. This is the containing folder. Ie BepInEx/plugins
     * @param dependancy - The dependancy you are checking for. Ie raidoverhaul.dll
     * @returns True if the dependancy exists and false if it doesn't.
     */
    public checkDependancies(path: string[], dependancy: string): boolean {
        try {
            return path.includes(dependancy);
        } catch {
            return false;
        }
    }

    /**
     * Backs up your profile. Stores max of 3 profiles daily while deleting the oldest.
     * Folders inside of the profile folder are named based on the year-month-date timestamp with actual backups having an hour-minute-second timestamp.
     * More info in the ReadMe in the profileBackup folder.
     *
     * @param sessionID - Session Id for your selected profile
     * @param profile - Interface for profile data
     */
    public profileBackup(sessionID: string, profile: ISptProfile): void {
        const date = new Date();
        const [year, month, day, hour, minute, second] = [
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate(),
            date.getHours(),
            date.getMinutes(),
            date.getSeconds(),
        ].map((num) => num.toString());
        const backupPath = `${Utils.modLoc}/profileBackup/${sessionID}/${year}-${month}-${day}/`;
        const profileData = JSON.stringify(profile, null, 4);
        const backupFile = `${backupPath + sessionID}_${hour}-${minute}-${second}.json`;
        const maxBackups = 3;

        if (!fs.existsSync(backupPath)) {
            fs.mkdirSync(backupPath, { recursive: true });
            if (this.configManager.debugConfig().debugMode) {
                this.logger.logWarning(
                    `No backup path exist for this profile. \nProfile backup path at "${backupPath}" has been created`,
                );
            }
        }

        const profileCount = this.getFilesOfType(backupPath, "json").sort(
            (a, b) => fs.statSync(a).ctimeMs - fs.statSync(b).ctimeMs,
        );

        if (profileCount.length >= maxBackups) {
            const lastProfile = profileCount[0];
            this.sptFs.remove(lastProfile);
            profileCount.splice(0, 1);
        }

        try {
            fs.writeFileSync(backupFile, profileData);
            if (this.configManager.debugConfig().debugMode) {
                this.logger.log("Profile backup successful.", LogTextColor.MAGENTA);
            }
        } catch (error) {
            this.logger.logError(`Error writing profile backup: ${error}`);
        }
    }

    /**
     * Fetches the level of your Pmc profile.
     *
     * @param profileId - Id of the currently selected profile.
     * @returns The Pmc profile level.
     */
    public checkProfileLevel(profileId): number {
        const pmcProfile: IPmcData = this.profileHelper.getProfileByPmcId(profileId);
        const profileLevel = pmcProfile.Info.Level;

        return profileLevel;
    }

    /**
     * Checks to see if the pmc profile exists.
     *
     * @param profileId - Id of the currently selected profile.
     * @returns True if pmc profile exists, else returns false (ie. for scav runs).
     */
    public checkProfileExists(profileId): boolean {
        const pmcProfile: IPmcData = this.profileHelper.getProfileByPmcId(profileId);

        if (!pmcProfile) {
            return false;
        } else {
            return true;
        }
    }

    /**
     * Fetches the handbook info for an item.
     *
     * @param itemID - Id of the item you want to get handbook info for.
     * @returns The handbook price of the item.
     */
    public getItemInHandbook(itemID: string): number {
        const tables = this.databaseService.getTables();
        try {
            const hbItem = tables.templates.handbook.Items.find((i) => i.Id === itemID);
            return Math.round(hbItem.Price);
        } catch (error) {
            if (this.configManager.debugConfig().debugMode) {
                this.logger.logWarning(`\nError getting Handbook ID for ${itemID}`);
            }
        }
    }

    /**
     * Fetches the flea market info for an item.
     *
     * @param itemID - Id of the item you want to get flea market info for.
     * @returns The flea market price of the item.
     */
    public getFleaPrice(itemID: string): number {
        const tables = this.databaseService.getTables();
        if (typeof tables.templates.prices[itemID] !== "undefined") {
            return Math.round(tables.templates.prices[itemID]);
        } else {
            return this.getItemInHandbook(itemID);
        }
    }

    /**
     * Fetches the cost of an item in requisition forms.
     *
     * @param itemID - Id of the item you want to get the price for.
     * @returns The items flea price divided by the requisition forms flea price.
     */
    public getFormCost(itemID: string): number {
        const cost = Math.round(this.getFleaPrice(itemID) / 175);
        if (cost >= 1) {
            return cost;
        } else {
            return 1;
        }
    }

    /**
     * Fetches the cost of an item in requisition slips.
     *
     * @param itemID - Id of the item you want to get the price for.
     * @returns The items flea price divided by the requisition slips flea price.
     */
    public getReqCost(itemID: string): number {
        const cost = Math.round(this.getFleaPrice(itemID) / 53999);
        if (cost >= 1) {
            return cost;
        } else {
            return 1;
        }
    }

    /**
     * Pushes an item to the filters of the specified cases.
     *
     * @param casesToAdd - Ids of the cases you want to push your items to.
     * @param itemToAdd - Id of the item you want to push.
     */
    public addToCases(casesToAdd: string[], itemToAdd: string): void {
        const tables = this.databaseService.getTables();
        const items = tables.templates.items;

        for (const cases of casesToAdd) {
            for (const item in items) {
                if (items[item]._id === cases) {
                    if (
                        items[item]._props?.Grids[0]._props.filters[0].Filter === undefined ||
                        items[item]._props?.Grids[0]._props.filters[0].Filter === null
                    ) {
                        this.stopHurtingMeSVM(cases);
                    }

                    if (items[item]._props?.Grids[0]._props.filters[0].Filter !== undefined) {
                        items[item]._props?.Grids[0]._props.filters[0].Filter.push(itemToAdd);
                    }
                }
            }
        }
    }

    /**
     * Attempts to fix incompatabilities with SVM and other destructive mods that remove filters completely.
     * This just adds minimal filters back to hopefuly avoid erroring out.
     * Really need to make a better way to do this in the future.
     *
     * @param caseToAdd - Id of the case you want to try to add filters back to.
     */
    public stopHurtingMeSVM(caseToAdd: string): void {
        const tables = this.databaseService.getTables();
        const unbreakFilters = [
            {
                Filter: ["54009119af1c881c07000029"],
                ExcludedFilter: ["5448bf274bdc2dfc2f8b456a"],
            },
        ];

        tables.templates.items[caseToAdd]._props.Grids[0]._props.filters = unbreakFilters;
    }

    /**
     * Modifies container size.
     * Only works for items with a single grid. Not multiple, such as rigs and the multi-gridded backpack
     *
     * @param container - Id of the case you want to modify the size of.
     * @param horizontal - Horizontal filter size you want to change to.
     * @param vertical - Vertical filter size you want to change to.
     */
    public modifyContainerSize(container: string, horizontal: number, vertical: number): void {
        const tables = this.databaseService.getTables();
        const items = tables.templates.items;

        items[container]._props.Grids[0]._props.cellsH = horizontal;
        items[container]._props.Grids[0]._props.cellsV = vertical;
    }

    public getFilesOfType(directory: string, fileType: string, files: string[] = []): string[] {
        // no dir so exit early
        if (!fs.existsSync(directory)) {
            return files;
        }

        const dirents = fs.readdirSync(directory, { encoding: "utf-8", withFileTypes: true });
        for (const dirent of dirents) {
            const res = resolve(directory, dirent.name);
            if (dirent.isDirectory()) {
                this.getFilesOfType(res, fileType, files);
            } else {
                if (res.endsWith(fileType)) {
                    files.push(res);
                }
            }
        }

        return files;
    }
    //#endregion
    //
    //
    //
    //#region Generate Fluid Assort

    /**
     * Sorts each item in the database by category and writes them to json based on their respective category.
     *
     */
    public generateFluidAssortData() {
        const tables = this.databaseService.getTables();
        const items = Object.values(tables.templates.items);
        const itemArray = [];
        const ammoArray = [];
        const plateArray = [];
        const gearArray = [];
        const modsArray = [];
        const medsArray = [];
        const weaponArray = [];
        const keyArray = [];

        for (const item of items) {
            if (item._props.QuestItem !== true && item._type !== "Node" && item._props.Prefab.path !== "") {
                if (item._parent === BaseClasses.INFO) {
                    itemArray.push(item._id);
                }

                if (item._parent === BaseClasses.HEADPHONES) {
                    gearArray.push(item._id);
                }

                if (item._parent === BaseClasses.AUXILIARY_MOD) {
                    modsArray.push(item._id);
                }

                if (item._parent === BaseClasses.FUNCTIONAL_MOD) {
                    modsArray.push(item._id);
                }

                if (item._parent === BaseClasses.GEAR_MOD) {
                    modsArray.push(item._id);
                }

                if (
                    item._parent === BaseClasses.SILENCER &&
                    item._id !== "55d617094bdc2d89028b4568" &&
                    item._id !== "54490a4d4bdc2dbc018b4573"
                ) {
                    modsArray.push(item._id);
                }

                if (item._parent === BaseClasses.SPECIAL_SCOPE) {
                    modsArray.push(item._id);
                }

                if (item._parent === BaseClasses.OPTIC_SCOPE) {
                    modsArray.push(item._id);
                }

                if (item._parent === BaseClasses.COMPENSATOR) {
                    modsArray.push(item._id);
                }

                if (item._parent === BaseClasses.COMPACT_COLLIMATOR) {
                    modsArray.push(item._id);
                }

                if (item._parent === BaseClasses.COLLIMATOR) {
                    modsArray.push(item._id);
                }

                if (item._parent === BaseClasses.FLASH_HIDER) {
                    modsArray.push(item._id);
                }

                if (item._parent === BaseClasses.LIGHT_LASER_DESIGNATOR) {
                    modsArray.push(item._id);
                }

                if (
                    item._parent === BaseClasses.MAGAZINE &&
                    item._id !== "5d52d479a4b936793d58c76b" &&
                    item._id !== "5cffa483d7ad1a049e54ef1c" &&
                    item._id !== "6241c2c2117ad530666a5108"
                ) {
                    modsArray.push(item._id);
                }

                if (item._parent === BaseClasses.FLASHLIGHT) {
                    modsArray.push(item._id);
                }

                if (item._parent === BaseClasses.TACTICAL_COMBO) {
                    modsArray.push(item._id);
                }

                if (item._parent === BaseClasses.ASSAULT_SCOPE) {
                    modsArray.push(item._id);
                }

                if (item._parent === BaseClasses.ELECTRONICS) {
                    itemArray.push(item._id);
                }

                if (
                    item._parent === BaseClasses.ARMBAND &&
                    item._id !== "619bddc6c9546643a67df6ee" &&
                    item._id !== "DeadArmband"
                ) {
                    itemArray.push(item._id);
                }

                if (item._parent === BaseClasses.KEY_MECHANICAL) {
                    keyArray.push(item._id);
                }

                if (item._parent === BaseClasses.NIGHTVISION) {
                    itemArray.push(item._id);
                }

                if (
                    item._parent === BaseClasses.MEDS &&
                    item._id !== "5e99735686f7744bfc4af32c" &&
                    item._id !== "5e99711486f7744bfc4af328"
                ) {
                    medsArray.push(item._id);
                }

                if (item._parent === BaseClasses.MOUNT) {
                    modsArray.push(item._id);
                }

                if (item._parent === BaseClasses.FOREGRIP) {
                    modsArray.push(item._id);
                }

                if (item._parent === BaseClasses.STOCK) {
                    modsArray.push(item._id);
                }

                if (
                    item._parent === BaseClasses.STIMULATOR &&
                    item._id !== "64ba763be87866541c0d7c50" &&
                    item._id !== "637b60c3b7afa97bfc3d7001"
                ) {
                    medsArray.push(item._id);
                }

                if (item._parent === BaseClasses.FUEL) {
                    itemArray.push(item._id);
                }

                if (item._parent === BaseClasses.DRUGS) {
                    medsArray.push(item._id);
                }

                if (
                    item._parent === BaseClasses.MEDKIT &&
                    item._id !== "5e99735686f7744bfc4af32c" &&
                    item._id !== "5e99711486f7744bfc4af328"
                ) {
                    medsArray.push(item._id);
                }

                if (item._parent === BaseClasses.GAS_BLOCK) {
                    modsArray.push(item._id);
                }

                if (item._parent === BaseClasses.BACKPACK) {
                    gearArray.push(item._id);
                }

                if (item._parent === BaseClasses.FACECOVER) {
                    gearArray.push(item._id);
                }

                if (item._parent === BaseClasses.VEST) {
                    gearArray.push(item._id);
                }

                if (item._parent === BaseClasses.HEADWEAR) {
                    gearArray.push(item._id);
                }

                if (item._parent === BaseClasses.VISORS) {
                    gearArray.push(item._id);
                }

                if (item._parent === BaseClasses.UBGL && item._id !== "5648b62b4bdc2d9d488b4585") {
                    modsArray.push(item._id);
                }

                if (item._parent === BaseClasses.BARTER_ITEM) {
                    itemArray.push(item._id);
                }

                if (item._parent === BaseClasses.TOOL) {
                    itemArray.push(item._id);
                }

                if (item._parent === BaseClasses.HOUSEHOLD_GOODS) {
                    itemArray.push(item._id);
                }

                if (
                    item._parent === BaseClasses.ARMOR_PLATE &&
                    !item._name.includes("soft_armor") &&
                    item._id !== "64b11c08506a73f6a10f9364"
                ) {
                    plateArray.push(item._id);
                }

                if (item._parent === BaseClasses.THROW_WEAPON) {
                    weaponArray.push(item._id);
                }

                if (item._parent === BaseClasses.PISTOL) {
                    weaponArray.push(item._id);
                }

                if (item._parent === BaseClasses.REVOLVER) {
                    weaponArray.push(item._id);
                }

                if (item._parent === BaseClasses.SMG) {
                    weaponArray.push(item._id);
                }

                if (item._parent === BaseClasses.ASSAULT_RIFLE) {
                    weaponArray.push(item._id);
                }

                if (item._parent === BaseClasses.ASSAULT_CARBINE) {
                    weaponArray.push(item._id);
                }

                if (item._parent === BaseClasses.SHOTGUN) {
                    weaponArray.push(item._id);
                }

                if (item._parent === BaseClasses.MARKSMAN_RIFLE) {
                    weaponArray.push(item._id);
                }

                if (item._parent === BaseClasses.SNIPER_RIFLE) {
                    weaponArray.push(item._id);
                }

                if (item._parent === BaseClasses.MACHINE_GUN && item._id !== "5cdeb229d7f00c000e7ce174") {
                    weaponArray.push(item._id);
                }

                if (item._parent === BaseClasses.GRENADE_LAUNCHER && item._id !== "5d52cc5ba4b9367408500062") {
                    weaponArray.push(item._id);
                }

                if (item._parent === BaseClasses.SPECIAL_WEAPON && item._id !== "5d52cc5ba4b9367408500062") {
                    weaponArray.push(item._id);
                }
            }
        }

        const dataLocFolder = `${Utils.modLoc}/ROData/Items`;
        const dataLocItem = `${dataLocFolder}/itemArray.json`;
        const dataLocAmmo = `${dataLocFolder}/ammoArray.json`;
        const dataLocPlate = `${dataLocFolder}/plateArray.json`;
        const dataLocGear = `${dataLocFolder}/gearArray.json`;
        const dataLocMods = `${dataLocFolder}/modsArray.json`;
        const dataLocMeds = `${dataLocFolder}/medsArray.json`;
        const dataLocWeapon = `${dataLocFolder}/weaponArray.json`;
        const dataLocKey = `${dataLocFolder}/keyArray.json`;
        const itemArrayFile = JSON.stringify(itemArray, null, 2);
        const ammoArrayFile = JSON.stringify(ammoArray, null, 2);
        const plateArrayFile = JSON.stringify(plateArray, null, 2);
        const gearArrayFile = JSON.stringify(gearArray, null, 2);
        const modsArrayFile = JSON.stringify(modsArray, null, 2);
        const medsArrayFile = JSON.stringify(medsArray, null, 2);
        const weaponArrayFile = JSON.stringify(weaponArray, null, 2);
        const keyArrayFile = JSON.stringify(keyArray, null, 2);

        if (!fs.existsSync(dataLocFolder)) {
            fs.mkdirSync(dataLocFolder, { recursive: true });
        }

        try {
            fs.writeFileSync(dataLocItem, JSON.stringify(itemArrayFile, null, 4));
            fs.writeFileSync(dataLocAmmo, JSON.stringify(ammoArrayFile, null, 4));
            fs.writeFileSync(dataLocPlate, JSON.stringify(plateArrayFile, null, 4));
            fs.writeFileSync(dataLocGear, JSON.stringify(gearArrayFile, null, 4));
            fs.writeFileSync(dataLocMods, JSON.stringify(modsArrayFile, null, 4));
            fs.writeFileSync(dataLocMeds, JSON.stringify(medsArrayFile, null, 4));
            fs.writeFileSync(dataLocWeapon, JSON.stringify(weaponArrayFile, null, 4));
            fs.writeFileSync(dataLocKey, JSON.stringify(keyArrayFile, null, 4));
        } catch (error) {
            this.logger.logError(`Error writing dumped item data file: ${error}`);
        }
    }

    /**
     * Sorts each type of ammo in the database into categories and writes those to their respective json files.
     *
     */
    public generateAmmoTypeData() {
        const tables = this.databaseService.getTables();
        const items = Object.values(tables.templates.items);
        const rifleArray = [];
        const shotgunArray = [];
        const smgArray = [];
        const sniperArray = [];
        const ubglArray = [];

        for (const item of items) {
            if (
                (item._parent === BaseClasses.AMMO && item._props.Caliber === "Caliber366TKM") ||
                item._props.Caliber === "Caliber9x39" ||
                item._props.Caliber === "Caliber762x39" ||
                item._props.Caliber === "Caliber556x45NATO" ||
                item._props.Caliber === "Caliber545x39" ||
                item._props.Caliber === "Caliber127x55" ||
                item._props.Caliber === "Caliber68x51" ||
                item._props.Caliber === "Caliber762x35"
            ) {
                rifleArray.push(item._id);
            }

            if (
                (item._parent === BaseClasses.AMMO && item._props.Caliber === "Caliber12g") ||
                item._props.Caliber === "Caliber20g"
            ) {
                shotgunArray.push(item._id);
            }

            if (
                (item._parent === BaseClasses.AMMO && item._props.Caliber === "Caliber1143x23ACP") ||
                item._props.Caliber === "Caliber46x30" ||
                item._props.Caliber === "Caliber57x28" ||
                item._props.Caliber === "Caliber762x25TT" ||
                item._props.Caliber === "Caliber9x18PM" ||
                item._props.Caliber === "Caliber9x19PARA" ||
                item._props.Caliber === "Caliber9x21" ||
                item._props.Caliber === "Caliber9x33R"
            ) {
                smgArray.push(item._id);
            }

            if (
                (item._parent === BaseClasses.AMMO && item._props.Caliber === "Caliber762x51") ||
                item._props.Caliber === "Caliber762x54R" ||
                item._props.Caliber === "Caliber86x70"
            ) {
                sniperArray.push(item._id);
            }

            if (
                (item._parent === BaseClasses.UBGL && item._props.Caliber === "Caliber26x75") ||
                item._props.Caliber === "Caliber30x29" ||
                item._props.Caliber === "Caliber40mmRU" ||
                item._props.Caliber === "Caliber40x46"
            ) {
                ubglArray.push(item._id);
            }
        }

        const rifleArrayFile = JSON.stringify(rifleArray, null, 2);
        const shotgunArrayFile = JSON.stringify(shotgunArray, null, 2);
        const smgArrayFile = JSON.stringify(smgArray, null, 2);
        const sniperArrayFile = JSON.stringify(sniperArray, null, 2);
        const ubglArrayFile = JSON.stringify(ubglArray, null, 2);

        const dataLocFolder = `${Utils.modLoc}/ROData/Ammo`;
        const dataLocRifle = `${dataLocFolder}/Rifle.json`;
        const dataLocShotgun = `${dataLocFolder}/Shotgun.json`;
        const dataLocSMG = `${dataLocFolder}/SMG.json`;
        const dataLocSniper = `${dataLocFolder}/Sniper.json`;
        const dataLocUBGL = `${dataLocFolder}/UBGL.json`;

        if (!fs.existsSync(dataLocFolder)) {
            fs.mkdirSync(dataLocFolder, { recursive: true });
        }

        try {
            fs.writeFileSync(dataLocRifle, JSON.stringify(rifleArrayFile, null, 4));
            fs.writeFileSync(dataLocShotgun, JSON.stringify(shotgunArrayFile, null, 4));
            fs.writeFileSync(dataLocSMG, JSON.stringify(smgArrayFile, null, 4));
            fs.writeFileSync(dataLocSniper, JSON.stringify(sniperArrayFile, null, 4));
            fs.writeFileSync(dataLocUBGL, JSON.stringify(ubglArrayFile, null, 4));
        } catch (error) {
            this.logger.logError(`Error writing dumped ammo data files: ${error}`);
        }
    }

    /**
     * Writes each preset in the globals database to json.
     *
     */
    public generatePresetData() {
        fs.readFile(path.resolve(__dirname, "../../../../../SPT_Data/Server/database/globals.json"), (err, data) => {
            if (err) throw err;

            const presetList = JSON.parse(data).ItemPresets;
            const presetFile = {};

            for (const preset in presetList) {
                const newPreset = {
                    _changeWeaponName: presetList[preset]._changeWeaponName,
                    _encyclopedia: presetList[preset]._encyclopedia,
                    _id: this.hashUtil.generate(),
                    _items: [...presetList[preset]._items],
                    _name: presetList[preset]._name,
                    _parent: presetList[preset]._parent,
                    _type: presetList[preset]._type,
                };
                presetFile[presetList[preset]._name] = JSON.parse(JSON.stringify(newPreset));
            }
            const dataLocFolder = `${Utils.modLoc}/ROData/Presets`;
            const dataLocPreset = `${dataLocFolder}/presetArray.json`;

            if (!fs.existsSync(dataLocFolder)) {
                fs.mkdirSync(dataLocFolder, { recursive: true });
            }

            try {
                fs.writeFileSync(dataLocPreset, JSON.stringify(presetFile, null, "\t"));
            } catch (error) {
                this.logger.logError(`Error writing dumped preset data file: ${error}`);
            }
        });
    }

    /**
     * Writes the id of each preset into an array to pull from for the req shop.
     *
     */
    /*
    public writePresetKeys() {
        const gearPresetArray = [];
        const weaponPresetArray = [];

        for (const gPreset in gearPresets) {
            gearPresetArray.push(gearPresets[gPreset]._id);
        }
        for (const wPreset in weaponPresets) {
            weaponPresetArray.push(weaponPresets[wPreset]._id);
        }

        const gearPresetArrayFile = JSON.stringify(gearPresetArray, null, 2);
        const weaponPresetArrayFile = JSON.stringify(weaponPresetArray, null, 2);

        const dataLocFolder = `${Utils.modLoc}/ROData/Presets`;
        const dataLocGearPresets = `${dataLocFolder}/gearPresetKeys.json`;
        const dataLocWeaponPresets = `${dataLocFolder}/weaponPresetKeys.json`;

        if (!fs.existsSync(dataLocFolder)) {
            fs.mkdirSync(dataLocFolder, { recursive: true });
        }

        try {
            fs.writeFileSync(dataLocGearPresets, JSON.stringify(gearPresetArrayFile, null, "\t"));
            fs.writeFileSync(dataLocWeaponPresets, JSON.stringify(weaponPresetArrayFile, null, "\t"));
        } catch (error) {
            this.logger.logError(`Error writing dumped preset data files: ${error}`);
        }
    }
*/
    //#endregion
}
