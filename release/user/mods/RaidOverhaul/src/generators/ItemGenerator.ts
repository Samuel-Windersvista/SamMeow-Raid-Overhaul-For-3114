import { inject, injectable } from "tsyringe";
//Spt Classes
import type { IHandbookItem } from "@spt/models/eft/common/tables/IHandbookBase";
import type { NewItemFromCloneDetails } from "@spt/models/spt/mod/NewItemDetails";
import type { RagfairPriceService } from "@spt/services/RagfairPriceService";
import type { CustomItemService } from "@spt/services/mod/CustomItemService";
import type { IRagfairConfig } from "@spt/models/spt/config/IRagfairConfig";
import type { IProps } from "@spt/models/eft/common/tables/ITemplateItem";
import type { DatabaseService } from "@spt/services/DatabaseService";
import type { ILocation } from "@spt/models/eft/common/ILocation";
import type { IItem } from "@spt/models/eft/common/tables/IItem";
import type { ConfigServer } from "@spt/servers/ConfigServer";
import { ConfigTypes } from "@spt/models/enums/ConfigTypes";
//Custom Classes
import { AllItemList, HandbookIDs, SlotsIDs } from "../models/Enums";
import type { Utils } from "../utils/Utils";
//Modules
import path from "node:path";
import fs from "node:fs";

@injectable()
export class ItemGenerator {
    private itemConfig: CustomItemFormat;

    constructor(
        @inject("Utils") protected utils: Utils,
        @inject("ConfigServer") protected configServer: ConfigServer,
        @inject("CustomItemService") protected customItem: CustomItemService,
        @inject("DatabaseService") protected databaseService: DatabaseService,
        @inject("RagfairPriceService") protected ragfairPriceService: RagfairPriceService,
    ) {}

    /**
     * Loads all of your json item files and creates items based on the supplied data.
     *
     * @param itemDirectory - The directory where you are storing your item json files.
     */
    public createCustomItems(itemDirectory: string): void {
        this.itemConfig = this.combineItems(itemDirectory);
        const tables = this.databaseService.getTables();

        for (const newId in this.itemConfig) {
            const itemConfig = this.itemConfig[newId];
            const tempClone = AllItemList[itemConfig.ItemToClone] || itemConfig.ItemToClone;
            const itemToClone = tempClone;
            const handbookData: IHandbookItem = this.createHandbook(itemConfig, newId);

            const newItem: NewItemFromCloneDetails = {
                itemTplToClone: itemToClone,
                overrideProperties: itemConfig.OverrideProperties,
                parentId: tables.templates.items[itemToClone]._parent,
                newId: newId,
                handbookParentId: handbookData.ParentId,
                handbookPriceRoubles: handbookData.Price,
                fleaPriceRoubles: this.createFleaData(itemConfig, newId),
                locales: {
                    en: {
                        name: itemConfig.LocalePush.name,
                        shortName: itemConfig.LocalePush.shortName,
                        description: itemConfig.LocalePush.description,
                    },
                },
            };
            this.customItem.createItemFromClone(newItem);

            if (itemConfig.CloneToFilters) {
                this.cloneToFilters(itemConfig, newId);
            }

            if (itemConfig.PushMastery) {
                this.pushMastery(itemConfig, newId);
            }

            if (itemConfig.BotPush?.AddToBots) {
                this.addToBots(itemConfig, newId);
            }

            if (itemConfig.LootPush?.LootContainersToAdd !== undefined) {
                this.addToStaticLoot(itemConfig, newId);
            }

            if (itemConfig.CasePush?.CaseFiltersToAdd !== undefined) {
                this.addToCases(itemConfig, newId);
            }

            if (itemConfig.PushToFleaBlacklist) {
                this.pushToBlacklist(newId);
            }

            if (itemConfig.SlotPush?.Slot !== undefined) {
                this.pushToSlot(itemConfig, newId);
            }

            if (itemConfig.PresetPush !== undefined) {
                this.addCustomPresets(itemConfig);
            }

            if (itemConfig.QuestPush !== undefined) {
                this.addToQuests(
                    tables.templates.quests,
                    itemConfig.QuestPush.QuestConditionType,
                    itemConfig.QuestPush.QuestTargetConditionToClone,
                    newId,
                );
            }
            this.buildCustomPresets(itemConfig, newId);
        }
    }

    /**
     * Creates handbook data for your item.
     *
     * @param itemConfig - Your items json data.
     * @param itemID - Your new items Id.
     * @returns the handbook entry for your new item.
     */
    private createHandbook(itemConfig: CustomItemFormat[string], itemID: string): IHandbookItem {
        const tables = this.databaseService.getTables();
        const tempClone = AllItemList[itemConfig.ItemToClone] || itemConfig.ItemToClone;
        const itemToClone = tempClone;

        if (itemConfig.Handbook !== undefined) {
            const tempHBParent = HandbookIDs[itemConfig.Handbook.HandbookParent] || itemConfig.Handbook.HandbookParent;
            const hbParent = tempHBParent;

            const handbookEntry: IHandbookItem = {
                Id: itemID,
                ParentId: hbParent,
                Price: itemConfig.Handbook.HandbookPrice,
            };

            return handbookEntry;
        } else {
            const hbBase = tables.templates.handbook.Items.find((i) => i.Id === itemToClone);

            const handbookEntry = {
                Id: itemID,
                ParentId: hbBase.ParentId,
                Price: hbBase.Price,
            };

            return handbookEntry;
        }
    }

    /**
     * Creates flea market data for your item.
     *
     * @param itemConfig - Your items json data.
     * @returns the flea price for your cloned item.
     */
    private createFleaData(itemConfig: CustomItemFormat[string], itemID: string): number {
        const tempClone = AllItemList[itemConfig.ItemToClone] || itemConfig.ItemToClone;
        const itemToClone = tempClone;

        if (itemConfig.Handbook !== undefined) {
            return this.createHandbook(itemConfig, itemID).Price;
        } else {
            return this.utils.getFleaPrice(itemToClone);
        }
    }

    /**
     * Clones your new item to the filters of the existing item you cloned.
     *
     * @param itemConfig - Your items json data.
     * @param itemID - Your new items Id.
     */
    private cloneToFilters(itemConfig: CustomItemFormat[string], itemID: string): void {
        const tables = this.databaseService.getTables();
        const tempClone = AllItemList[itemConfig.ItemToClone] || itemConfig.ItemToClone;
        const itemToClone = tempClone;

        for (const item in tables.templates.items) {
            const itemConflictId = tables.templates.items[item]._props.ConflictingItems;

            for (const itemInConflicts in itemConflictId) {
                const itemInConflictsFiltersId = itemConflictId[itemInConflicts];

                if (itemInConflictsFiltersId === itemToClone) {
                    itemConflictId.push(itemID);
                }
            }

            for (const slots in tables.templates.items[item]._props.Slots) {
                const slotsId = tables.templates.items[item]._props.Slots[slots]._props.filters[0].Filter;

                for (const itemInFilters in slotsId) {
                    const itemInFiltersId = slotsId[itemInFilters];

                    if (itemInFiltersId === itemToClone) {
                        slotsId.push(itemID);
                    }
                }
            }

            for (const cartridge in tables.templates.items[item]._props.Cartridges) {
                const cartridgeId = tables.templates.items[item]._props.Cartridges[cartridge]._props.filters[0].Filter;

                for (const itemInFilters in cartridgeId) {
                    const itemInFiltersId = cartridgeId[itemInFilters];

                    if (itemInFiltersId === itemToClone) {
                        cartridgeId.push(itemID);
                    }
                }
            }

            for (const chamber in tables.templates.items[item]._props.Chambers) {
                const chamberId = tables.templates.items[item]._props.Chambers[chamber]._props.filters[0].Filter;

                for (const itemInFilters in chamberId) {
                    const itemInFiltersId = chamberId[itemInFilters];

                    if (itemInFiltersId === itemToClone) {
                        chamberId.push(itemID);
                    }
                }
            }
        }
    }

    /**
     * Gives your item a new mastery stat.
     *
     * @param itemConfig - Your items json data.
     * @param itemID - Your new items Id.
     */
    private pushMastery(itemConfig: CustomItemFormat[string], itemID: string): void {
        const tables = this.databaseService.getTables();
        const new_mastery_DJCore = {
            Name: itemConfig.LocalePush.name,
            Templates: [itemID],
            Level2: 450,
            Level3: 900,
        };
        tables.globals.config.Mastering.push(new_mastery_DJCore);
    }

    /**
     * Adds your item onto bots.
     *
     * @param itemConfig - Your items json data.
     * @param itemID - Your new items Id.
     */
    private addToBots(itemConfig: CustomItemFormat[string], itemID: string): void {
        const tables = this.databaseService.getTables();
        const tempClone = AllItemList[itemConfig.ItemToClone] || itemConfig.ItemToClone;
        const itemToClone = tempClone;

        for (const botId in tables.bots.types) {
            for (const lootSlot in tables.bots.types[botId].inventory.items) {
                const items = tables.bots.types[botId].inventory.items;

                if (items[lootSlot][itemToClone]) {
                    const weight = items[lootSlot][itemToClone];
                    items[lootSlot][itemID] = weight;
                }
            }

            for (const equipSlot in tables.bots.types[botId].inventory.equipment) {
                const equip = tables.bots.types[botId].inventory.equipment;

                if (equip[equipSlot][itemToClone]) {
                    const weight = equip[equipSlot][itemToClone];
                    equip[equipSlot][itemID] = weight;
                }
            }

            for (const modItem in tables.bots.types[botId].inventory.mods) {
                for (const modSlot in tables.bots.types[botId].inventory.mods[modItem]) {
                    if (tables.bots.types[botId]?.inventory?.mods[modItem][modSlot][itemToClone]) {
                        tables.bots.types[botId].inventory.mods[modItem][modSlot].push(itemID);
                    }
                }

                if (tables.bots.types[botId]?.inventory?.mods[itemToClone]) {
                    tables.bots.types[botId].inventory.mods[itemID] = structuredClone(
                        tables.bots.types[botId].inventory.mods[itemToClone],
                    );
                }
            }
        }
    }

    /**
     * Adds your item into the static loot pool.
     *
     * @param itemConfig - Your items json data.
     * @param itemID - Your new items Id.
     */
    private addToStaticLoot(itemConfig: CustomItemFormat[string], itemID: string): void {
        const tables = this.databaseService.getTables();
        const locations = tables.locations;

        if (Array.isArray(itemConfig.LootPush?.LootContainersToAdd)) {
            itemConfig.LootPush?.LootContainersToAdd.forEach((lootContainer) => {
                const tempLC = AllItemList[lootContainer] || lootContainer;
                const staticLC = tempLC;

                const lootToPush = {
                    tpl: itemID,
                    relativeProbability: itemConfig.LootPush?.StaticLootProbability,
                };

                for (const map in locations) {
                    if (locations.hasOwnProperty(map)) {
                        const location: ILocation = locations[map];
                        if (location.staticLoot) {
                            const staticLoot = location.staticLoot;
                            if (staticLoot.hasOwnProperty(staticLC)) {
                                const staticContainer = staticLoot[staticLC];
                                if (staticContainer) {
                                    staticContainer.itemDistribution.push(lootToPush);
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    /**
     * Adds your item to the specified cases.
     *
     * @param itemConfig - Your items json data.
     * @param itemID - Your new items Id.
     */
    private addToCases(itemConfig: CustomItemFormat[string], itemID: string): void {
        const conInvKey = "harmer-configurableinventories";
        const svmKey = "[SVM] Server Value Modifier";
        const tables = this.databaseService.getTables();
        const items = tables.templates.items;

        if (!this.utils.checkForMod(conInvKey) && !this.utils.checkForMod(svmKey)) {
            if (Array.isArray(itemConfig.CasePush?.CaseFiltersToAdd)) {
                itemConfig.CasePush?.CaseFiltersToAdd.forEach((caseToAdd) => {
                    const tempCases = AllItemList[caseToAdd] || caseToAdd;
                    const cases = tempCases;

                    for (const item in items) {
                        if (items[item]._id === cases) {
                            if (items[item]._props?.Grids[0]._props.filters[0].Filter === undefined) {
                                const unbreakFilters = [
                                    {
                                        Filter: ["54009119af1c881c07000029"],
                                        ExcludedFilter: ["5447e1d04bdc2dff2f8b4567"],
                                    },
                                ];

                                tables.templates.items[cases]._props.Grids[0]._props.filters = unbreakFilters;
                            } else if (items[item]._props?.Grids[0]._props.filters[0].Filter !== undefined) {
                                items[item]._props?.Grids[0]._props.filters[0].Filter.push(itemID);
                            }
                        }
                    }
                });
            } else {
                for (const item in items) {
                    if (items[item]._id === itemConfig.CasePush?.CaseFiltersToAdd) {
                        if (items[item]._props?.Grids[0]._props.filters[0].Filter === undefined) {
                            const unbreakFilters = [
                                {
                                    Filter: ["54009119af1c881c07000029"],
                                    ExcludedFilter: ["5447e1d04bdc2dff2f8b4567"],
                                },
                            ];

                            tables.templates.items[
                                itemConfig.CasePush?.CaseFiltersToAdd
                            ]._props.Grids[0]._props.filters = unbreakFilters;
                        }

                        if (items[item]._props?.Grids[0]._props.filters[0].Filter !== undefined) {
                            items[item]._props?.Grids[0]._props.filters[0].Filter.push(itemID);
                        }
                    }
                }
            }
        }
    }

    /**
     * Pushes your specified item into a specific slot on your character.
     * Ie pushing rigs to the armband slot for creating armbands with grids.
     *
     * @param itemConfig - Your items json data.
     * @param itemID - Your new items Id.
     */
    private pushToSlot(itemConfig: CustomItemFormat[string], itemID: string): void {
        const tables = this.databaseService.getTables();
        const DefaultInventory = tables.templates.items["55d7217a4bdc2d86028b456d"]._props.Slots;
        const tempSlot = SlotsIDs[itemConfig.SlotPush?.Slot] || itemConfig.SlotPush?.Slot;
        const slotToPush = tempSlot;

        DefaultInventory[slotToPush]._props.filters[0].Filter.push(itemID);
    }

    /**
     * .
     *
     * @param itemConfig - Your items json data.
     * @param itemID - Your new items Id.
     */
    private pushToBlacklist(itemID: string): void {
        const ragfair = this.configServer.getConfig<IRagfairConfig>(ConfigTypes.RAGFAIR);
        ragfair.dynamic.blacklist.custom.push(...[itemID]);
    }

    /**
     * Loads all of your json item files into one config file for processing.
     *
     * @param itemDirectory - The directory for your item files.
     */
    private combineItems(itemDirectory: string) {
        const modules = fs.readdirSync(path.join(__dirname, itemDirectory));

        const combinedModules: any = {};

        modules.forEach((modFile) => {
            const filesPath = path.join(__dirname, itemDirectory, modFile);
            const fileContents = fs.readFileSync(filesPath, "utf-8");
            const module = JSON.parse(fileContents) as CustomItemFormat;

            Object.assign(combinedModules, module);
        });

        return combinedModules;
    }

    /**
     * Create a custom preset for your item.
     *
     * @param itemConfig - Your items json data.
     */
    private addCustomPresets(itemConfig: CustomItemFormat[string]): void {
        const tables = this.databaseService.getTables();
        const customPresets = itemConfig.PresetPush.PresetToAdd;
        const presets = tables.globals.ItemPresets;

        if (itemConfig.PresetPush !== undefined) {
            customPresets.forEach((preset) => {
                const finalPreset: PresetFormat = {
                    _changeWeaponName: preset._changeWeaponName,
                    _encyclopedia: preset._encyclopedia || undefined,
                    _id: preset._id,
                    _items: preset._items.map((itemData: any) => {
                        const item: IItem = {
                            _id: itemData._id,
                            _tpl: itemData._tpl,
                        };

                        if (itemData.parentId) {
                            item.parentId = itemData.parentId;
                        }
                        if (itemData.slotId) {
                            item.slotId = itemData.slotId;
                        }

                        return item;
                    }),
                    _name: preset._name,
                    _parent: preset._parent,
                    _type: "Preset",
                };

                presets[finalPreset._id] = finalPreset;
            });
        }
    }

    /**
     * Creates a preset for your item if it's an armor piece.
     * Ie rig, armor, helmet
     *
     * @param itemConfig - Your items json data.
     * @param itemID - Your new items Id.
     */
    private buildCustomPresets(itemConfig: CustomItemFormat[string], itemID: string): void {
        const tables = this.databaseService.getTables();
        const presets = tables.globals.ItemPresets;
        const basePresetID = this.utils.genId();

        if (
            tables.templates.items[itemID]._parent === "5a341c4086f77401f2541505" ||
            tables.templates.items[itemID]._parent === "5448e5284bdc2dcb718b4567" ||
            tables.templates.items[itemID]._parent === "5448e54d4bdc2dcc718b4568"
        ) {
            const finalPreset = {
                _changeWeaponName: false,
                _encyclopedia: itemID,
                _id: this.utils.genId(),
                _items: [],
                _name: `${itemConfig.LocalePush.name} Preset`,
                _parent: basePresetID,
                _type: "Preset",
            };

            finalPreset._items.push({ _id: basePresetID, _tpl: itemID });

            tables.templates.items[itemID]._props.Slots.forEach((slot) => {
                if (slot._name !== "mod_nvg") {
                    finalPreset._items.push({
                        _id: this.utils.genId(),
                        _tpl: this.utils.drawRandom(slot._props.filters[0].Filter),
                        parentId: basePresetID,
                        slotId: slot._name,
                    });
                }
            });

            presets[finalPreset._id] = finalPreset;
        }
    }

    /**
     * Clones created item to existing quest conditions.
     *
     * @param quests - DatabaseTables.templates.quests.
     * @param condition - Condition you are wanting to add to.
     * @param target - Existing item in condition you are wanting to clone.
     * @param newTarget - Your item you are trying to add.
     */
    private addToQuests(quests: any, condition: string, target: string, newTarget: string): void {
        for (const quest of Object.keys(quests)) {
            const questConditions = quests[quest];
            for (const nextCondition of questConditions.conditions.AvailableForFinish) {
                const nextConditionData = nextCondition;
                if (nextConditionData.conditionType === condition && nextConditionData.target.includes(target)) {
                    nextConditionData.target.push(newTarget);
                }
            }
        }
    }
}

export interface CustomItemFormat {
    [newID: string]: {
        ItemToClone: string;
        OverrideProperties: IProps;
        LocalePush: {
            name: string;
            shortName: string;
            description: string;
        };
        Handbook?: {
            HandbookParent: string;
            HandbookPrice: number;
        };
        SlotPush?: {
            Slot: number;
        };
        BotPush?: {
            AddToBots: boolean;
        };
        CasePush?: {
            CaseFiltersToAdd: string[];
        };
        LootPush?: {
            LootContainersToAdd: string[];
            StaticLootProbability: number;
        };
        PresetPush?: {
            PresetToAdd: PresetFormat[];
        };
        QuestPush?: {
            QuestConditionType: string;
            QuestTargetConditionToClone: string;
        };
        PushToFleaBlacklist?: boolean;
        CloneToFilters?: boolean;
        PushMastery?: boolean;
    };
}

export interface PresetFormat {
    _changeWeaponName: boolean;
    _encyclopedia?: string;
    _id: string;
    _items: ItemFormat[];
    _name: string;
    _parent: string;
    _type: string;
}

export interface ItemFormat {
    _id: string;
    _tpl: string;
    parentId?: string;
    slotId?: string;
}
