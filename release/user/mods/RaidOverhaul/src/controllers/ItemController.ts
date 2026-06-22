import { inject, injectable } from "tsyringe";
//Spt Classes
import type { CustomItemService } from "@spt/services/mod/CustomItemService";
import type { DatabaseService } from "@spt/services/DatabaseService";
import type { IBotConfig } from "@spt/models/spt/config/IBotConfig";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";
import type { ConfigServer } from "@spt/servers/ConfigServer";
import { ConfigTypes } from "@spt/models/enums/ConfigTypes";
import { BaseClasses } from "@spt/models/enums/BaseClasses";
//Custom Classes
import type { ConfigManager } from "../managers/ConfigManager";
import { AllBots, CustomMap } from "../models/Enums";
import type { ROLogger } from "../utils/Logger";
import type { Utils } from "../utils/Utils";
//Json Imports
const containerCrafts = require("../utils/data/containerCrafts.json");
const globalPresets = require("../../db/Presets/Globals.json");
const ammoList = require("../utils/data/ammoStackList.json");

@injectable()
export class ItemController {
    constructor(
        @inject("Utils") protected utils: Utils,
        @inject("ROLogger") protected logger: ROLogger,
        @inject("ConfigManager") protected configManager: ConfigManager,
        @inject("ConfigServer") protected configServer: ConfigServer,
        @inject("CustomItemService") protected customItem: CustomItemService,
        @inject("DatabaseService") protected databaseService: DatabaseService,
    ) {}

    public itemChanges(): void {
        const tables = this.databaseService.getTables();
        const presets = tables.globals;
        const items = tables.templates.items;
        const pockets = tables.templates.items["627a4e6b255f7527fb05a0f6"];
        const uhPockets = tables.templates.items["65e080be269cbd5c5005e529"];
        const botConfig = this.configServer.getConfig<IBotConfig>(ConfigTypes.BOT);
        const conInvKey = "harmer-configurableinventories";
        const svmKey = "[SVM] Server Value Modifier";
        let recipes = tables.hideout.production.recipes;

        for (const id in items) {
            const base = items[id];

            if (this.configManager.modConfig().Raid.LootableMelee) {
                if (base._parent === BaseClasses.KNIFE) {
                    base._props.Unlootable = false;
                    base._props.UnlootableFromSide = [];
                }
            }

            if (this.configManager.modConfig().Raid.LootableArmbands) {
                if (base._parent === BaseClasses.ARMBAND) {
                    base._props.Unlootable = false;
                    base._props.UnlootableFromSide = [];
                }
            }

            if (base._props.BlocksEarpiece) {
                base._props.BlocksEarpiece = false;
            }

            if (base._props.BlocksFaceCover) {
                base._props.BlocksFaceCover = false;
            }

            if (base._id === "5ea058e01dbce517f324b3e2") {
                base._props.armorClass = "4";
            }
        }

        if (this.configManager.modConfig().PocketChanges.Enabled) {
            (pockets._props.Grids = [
                {
                    _id: this.utils.genId(),
                    _name: "pocket1",
                    _parent: "627a4e6b255f7527fb05a0f6",
                    _props: {
                        cellsH: this.configManager.modConfig().PocketChanges.Pocket1.Horizontal,
                        cellsV: this.configManager.modConfig().PocketChanges.Pocket1.Vertical,
                        filters: [
                            {
                                ExcludedFilter: ["5448bf274bdc2dfc2f8b456a"],
                                Filter: ["54009119af1c881c07000029"],
                            },
                        ],
                        isSortingTable: false,
                        maxCount: 0,
                        maxWeight: 0,
                        minCount: 0,
                    },
                    _proto: "55d329c24bdc2d892f8b4567",
                },
                {
                    _id: this.utils.genId(),
                    _name: "pocket2",
                    _parent: "627a4e6b255f7527fb05a0f6",
                    _props: {
                        cellsH: this.configManager.modConfig().PocketChanges.Pocket2.Horizontal,
                        cellsV: this.configManager.modConfig().PocketChanges.Pocket2.Vertical,
                        filters: [
                            {
                                ExcludedFilter: ["5448bf274bdc2dfc2f8b456a"],
                                Filter: ["54009119af1c881c07000029"],
                            },
                        ],
                        isSortingTable: false,
                        maxCount: 0,
                        maxWeight: 0,
                        minCount: 0,
                    },
                    _proto: "55d329c24bdc2d892f8b4567",
                },
                {
                    _id: this.utils.genId(),
                    _name: "pocket3",
                    _parent: "627a4e6b255f7527fb05a0f6",
                    _props: {
                        cellsH: this.configManager.modConfig().PocketChanges.Pocket3.Horizontal,
                        cellsV: this.configManager.modConfig().PocketChanges.Pocket3.Vertical,
                        filters: [
                            {
                                ExcludedFilter: ["5448bf274bdc2dfc2f8b456a"],
                                Filter: ["54009119af1c881c07000029"],
                            },
                        ],
                        isSortingTable: false,
                        maxCount: 0,
                        maxWeight: 0,
                        minCount: 0,
                    },
                    _proto: "55d329c24bdc2d892f8b4567",
                },
                {
                    _id: this.utils.genId(),
                    _name: "pocket4",
                    _parent: "627a4e6b255f7527fb05a0f6",
                    _props: {
                        cellsH: this.configManager.modConfig().PocketChanges.Pocket4.Horizontal,
                        cellsV: this.configManager.modConfig().PocketChanges.Pocket4.Vertical,
                        filters: [
                            {
                                ExcludedFilter: ["5448bf274bdc2dfc2f8b456a"],
                                Filter: ["54009119af1c881c07000029"],
                            },
                        ],
                        isSortingTable: false,
                        maxCount: 0,
                        maxWeight: 0,
                        minCount: 0,
                    },
                    _proto: "55d329c24bdc2d892f8b4567",
                },
            ]),
                (uhPockets._props.Grids = [
                    {
                        _id: this.utils.genId(),
                        _name: "pocket1",
                        _parent: "627a4e6b255f7527fb05a0f6",
                        _props: {
                            cellsH: this.configManager.modConfig().PocketChanges.Pocket1.Horizontal,
                            cellsV: this.configManager.modConfig().PocketChanges.Pocket1.Vertical,
                            filters: [
                                {
                                    ExcludedFilter: ["5448bf274bdc2dfc2f8b456a"],
                                    Filter: ["54009119af1c881c07000029"],
                                },
                            ],
                            isSortingTable: false,
                            maxCount: 0,
                            maxWeight: 0,
                            minCount: 0,
                        },
                        _proto: "55d329c24bdc2d892f8b4567",
                    },
                    {
                        _id: this.utils.genId(),
                        _name: "pocket2",
                        _parent: "627a4e6b255f7527fb05a0f6",
                        _props: {
                            cellsH: this.configManager.modConfig().PocketChanges.Pocket2.Horizontal,
                            cellsV: this.configManager.modConfig().PocketChanges.Pocket2.Vertical,
                            filters: [
                                {
                                    ExcludedFilter: ["5448bf274bdc2dfc2f8b456a"],
                                    Filter: ["54009119af1c881c07000029"],
                                },
                            ],
                            isSortingTable: false,
                            maxCount: 0,
                            maxWeight: 0,
                            minCount: 0,
                        },
                        _proto: "55d329c24bdc2d892f8b4567",
                    },
                    {
                        _id: this.utils.genId(),
                        _name: "pocket3",
                        _parent: "627a4e6b255f7527fb05a0f6",
                        _props: {
                            cellsH: this.configManager.modConfig().PocketChanges.Pocket3.Horizontal,
                            cellsV: this.configManager.modConfig().PocketChanges.Pocket3.Vertical,
                            filters: [
                                {
                                    ExcludedFilter: ["5448bf274bdc2dfc2f8b456a"],
                                    Filter: ["54009119af1c881c07000029"],
                                },
                            ],
                            isSortingTable: false,
                            maxCount: 0,
                            maxWeight: 0,
                            minCount: 0,
                        },
                        _proto: "55d329c24bdc2d892f8b4567",
                    },
                    {
                        _id: this.utils.genId(),
                        _name: "pocket4",
                        _parent: "627a4e6b255f7527fb05a0f6",
                        _props: {
                            cellsH: this.configManager.modConfig().PocketChanges.Pocket4.Horizontal,
                            cellsV: this.configManager.modConfig().PocketChanges.Pocket4.Vertical,
                            filters: [
                                {
                                    ExcludedFilter: ["5448bf274bdc2dfc2f8b456a"],
                                    Filter: ["54009119af1c881c07000029"],
                                },
                            ],
                            isSortingTable: false,
                            maxCount: 0,
                            maxWeight: 0,
                            minCount: 0,
                        },
                        _proto: "55d329c24bdc2d892f8b4567",
                    },
                ]);
            this.utils.stopHurtingMeSVM("627a4e6b255f7527fb05a0f6");
            this.utils.stopHurtingMeSVM("65e080be269cbd5c5005e529");
        }

        if (this.configManager.modConfig().Raid.SpecialSlotChanges) {
            pockets._props.Slots = [
                {
                    _id: this.utils.genId(),
                    _mergeSlotWithChildren: false,
                    _name: "SpecialSlot1",
                    _parent: "627a4e6b255f7527fb05a0f6",
                    _props: { filters: [{ Filter: ["54009119af1c881c07000029"] }] },
                    _proto: "55d721144bdc2d89028b456f",
                    _required: false,
                },
                {
                    _id: this.utils.genId(),
                    _mergeSlotWithChildren: false,
                    _name: "SpecialSlot2",
                    _parent: "627a4e6b255f7527fb05a0f6",
                    _props: { filters: [{ Filter: ["54009119af1c881c07000029"] }] },
                    _proto: "55d721144bdc2d89028b456f",
                    _required: false,
                },
                {
                    _id: this.utils.genId(),
                    _mergeSlotWithChildren: false,
                    _name: "SpecialSlot3",
                    _parent: "627a4e6b255f7527fb05a0f6",
                    _props: { filters: [{ Filter: ["54009119af1c881c07000029"] }] },
                    _proto: "55d721144bdc2d89028b456f",
                    _required: false,
                },
            ];

            uhPockets._props.Slots = [
                {
                    _id: this.utils.genId(),
                    _mergeSlotWithChildren: false,
                    _name: "SpecialSlot1",
                    _parent: "627a4e6b255f7527fb05a0f6",
                    _props: { filters: [{ Filter: ["54009119af1c881c07000029"] }] },
                    _proto: "55d721144bdc2d89028b456f",
                    _required: false,
                },
                {
                    _id: this.utils.genId(),
                    _mergeSlotWithChildren: false,
                    _name: "SpecialSlot2",
                    _parent: "627a4e6b255f7527fb05a0f6",
                    _props: { filters: [{ Filter: ["54009119af1c881c07000029"] }] },
                    _proto: "55d721144bdc2d89028b456f",
                    _required: false,
                },
                {
                    _id: this.utils.genId(),
                    _mergeSlotWithChildren: false,
                    _name: "SpecialSlot3",
                    _parent: "627a4e6b255f7527fb05a0f6",
                    _props: { filters: [{ Filter: ["54009119af1c881c07000029"] }] },
                    _proto: "55d721144bdc2d89028b456f",
                    _required: false,
                },
            ];
        }

        if (this.configManager.modConfig().EnableCustomItems) {
            for (const itemPreset in globalPresets.ItemPresets) {
                presets.ItemPresets[itemPreset] = globalPresets.ItemPresets[itemPreset];
            }
        }

        if (this.configManager.modConfig().Raid.HolsterAnything) {
            const inventory = items["55d7217a4bdc2d86028b456d"];
            const holster = inventory._props.Slots[2];

            holster._props.filters[0].Filter.push("5422acb9af1c889c16000029");
        }

        if (this.configManager.modConfig().Raid.LowerExamineTime) {
            for (const id in items) {
                items[id]._props.ExamineTime = 0.1;
            }
        }

        for (const botId in tables.bots.types) {
            const botType = AllBots[botId];

            if (botType) {
                for (const lootSlot in tables.bots.types[botId].inventory.items) {
                    const items = tables.bots.types[botId].inventory.items;

                    if (items[lootSlot]["5c94bbff86f7747ee735c08f"] !== undefined) {
                        const weight = items[lootSlot]["5c94bbff86f7747ee735c08f"];
                        items[lootSlot]["668b3c71042c73c6f9b00704"] = weight;
                    }
                }
            }
        }

        for (const botId in tables.bots.types) {
            const botType = AllBots[botId];

            if (botType) {
                for (const lootSlot in tables.bots.types[botId].inventory.items) {
                    const items = tables.bots.types[botId].inventory.items;

                    if (items[lootSlot]["573475fb24597737fb1379e1"] !== undefined) {
                        const weight = items[lootSlot]["573475fb24597737fb1379e1"];
                        items[lootSlot]["66292e79a4d9da25e683ab55"] = weight;
                    }
                }
            }
        }

        if (!this.utils.checkForMod(conInvKey) && !this.utils.checkForMod(svmKey)) {
            this.utils.addToCases(
                [
                    "5732ee6a24597719ae0c0281",
                    "544a11ac4bdc2d470e8b456a",
                    "5857a8b324597729ab0a0e7d",
                    "5857a8bc2459772bad15db29",
                    "59db794186f77448bc595262",
                    "5c093ca986f7740a1867ab12",
                    "6621b12c9f46c3eb4a0c8f40",
                    "6621b143edb81061ceb5d7cc",
                    "6621b177ce1b117550362db5",
                    "6621b1895c9cd0794d536d14",
                    "6621b1986f4ebd47e39eacb5",
                    "6621b1b3166c301c04facfc8",
                    "666361eff60f4ea5a464eb70",
                    "666362befb4578a9f2450bd8",
                ],
                "64d4b23dc1b37504b41ac2b6",
            );

            this.utils.addToCases(
                [
                    "5783c43d2459774bbe137486",
                    "60b0f6c058e0b0481a09ad11",
                    "590c60fc86f77412b13fddcf",
                    "5d235bb686f77443f4331278",
                ],
                "59f32c3b86f77472a31742f0",
            );
            this.utils.addToCases(
                [
                    "5783c43d2459774bbe137486",
                    "60b0f6c058e0b0481a09ad11",
                    "590c60fc86f77412b13fddcf",
                    "5d235bb686f77443f4331278",
                ],
                "59f32bb586f774757e1e8442",
            );
        }

        for (const container of containerCrafts) {
            const craftExists = recipes.find((i) => i._id === container._id);
            if (!craftExists) {
                recipes.push(container);
            } else {
                recipes = recipes.filter((i) => i._id !== container._id);
                recipes.push(container);
            }
        }

        if (this.configManager.modConfig().Raid.ChangeBackpackSizes) {
            this.utils.modifyContainerSize("5df8a4d786f77412672a1e3b", 6, 12);
            this.utils.modifyContainerSize("628bc7fb408e2b2e9c0801b1", 6, 11);
            this.utils.modifyContainerSize("5c0e774286f77468413cc5b2", 6, 10);
            this.utils.modifyContainerSize("5e4abc6786f77406812bd572", 6, 9);
            this.utils.modifyContainerSize("5e997f0b86f7741ac73993e2", 6, 6);
            this.utils.modifyContainerSize("5ab8ebf186f7742d8b372e80", 6, 9);
            this.utils.modifyContainerSize("61b9e1aaef9a1b5d6a79899a", 6, 9);
            this.utils.modifyContainerSize("59e763f286f7742ee57895da", 6, 9);
            this.utils.modifyContainerSize("639346cc1c8f182ad90c8972", 6, 8);
            this.utils.modifyContainerSize("628e1ffc83ec92260c0f437f", 6, 6);
            this.utils.modifyContainerSize("62a1b7fbc30cfa1d366af586", 6, 6);
            this.utils.modifyContainerSize("5b44c6ae86f7742d1627baea", 6, 6);
            this.utils.modifyContainerSize("545cdae64bdc2d39198b4568", 6, 6);
            this.utils.modifyContainerSize("5f5e467b0bc58666c37e7821", 6, 6);
            this.utils.modifyContainerSize("618bb76513f5097c8d5aa2d5", 6, 5);
            this.utils.modifyContainerSize("619cf0335771dd3c390269ae", 6, 5);
            this.utils.modifyContainerSize("60a272cc93ef783291411d8e", 6, 5);
            this.utils.modifyContainerSize("618cfae774bb2d036a049e7c", 6, 5);
            this.utils.modifyContainerSize("6034d103ca006d2dca39b3f0", 4, 8);
            this.utils.modifyContainerSize("6038d614d10cbf667352dd44", 4, 8);
            this.utils.modifyContainerSize("60a2828e8689911a226117f9", 6, 5);
            this.utils.modifyContainerSize("5e9dcf5986f7746c417435b3", 5, 5);
            this.utils.modifyContainerSize("56e335e4d2720b6c058b456d", 5, 5);
            this.utils.modifyContainerSize("5ca20d5986f774331e7c9602", 5, 5);
            this.utils.modifyContainerSize("544a5cde4bdc2d39388b456b", 4, 5);
            this.utils.modifyContainerSize("56e33634d2720bd8058b456b", 5, 3);
            this.utils.modifyContainerSize("5f5e45cc5021ce62144be7aa", 3, 5);
            this.utils.modifyContainerSize("56e33680d2720be2748b4576", 4, 3);
            this.utils.modifyContainerSize("5ab8ee7786f7742d8f33f0b9", 3, 4);
            this.utils.modifyContainerSize("5ab8f04f86f774585f4237d8", 3, 3);
            this.utils.modifyContainerSize("66a9f98f3bd5a41b162030f4", 6, 9);
            this.utils.modifyContainerSize("66b5f247af44ca0014063c02", 5, 5);
            this.utils.modifyContainerSize("66b5f22b78bbc0200425f904", 6, 6);
        }
        /*
        botConfig.currencyStackSize.default = {
            "5449016a4bdc2d6f028b456f": {
                "25000": 2,
                "20000": 4,
                "15000": 8,
                "10000": 14,
                "5000": 70
            },
            "5696686a4bdc2da3298b456a": {
                "50": 10,
                "100": 5,
                "250": 1
            },
            "569668774bdc2da2298b4568": {
                "50": 10,
                "100": 5,
                "250": 1
            },
            "5d235b4d86f7742e017bc88a": {
                "1": 8,
                "2": 4,
                "5": 4,
                "10": 1
            },
            "66292e79a4d9da25e683ab55": {
                "1": 1,
                "500": 8,
                "1000": 4,
                "2000": 4,
                "3000": 3,
                "4000": 2,
                "5000": 1
            },
            "668b3c71042c73c6f9b00704": {
                "1": 8,
                "5": 6,
                "10": 3,
                "15": 3,
                "20": 2,
                "25": 1
            }
        }
*/
    }

    public stackChanges(): void {
        const tables = this.databaseService.getTables();
        const items = tables.templates.items;

        if (
            this.configManager.modConfig().AdvancedStackTuning.Enabled &&
            !this.configManager.modConfig().BasicStackTuning.Enabled
        ) {
            for (const id of ammoList.Shotgun) {
                items[id]._props.StackMaxSize = this.configManager.modConfig().AdvancedStackTuning.ShotgunStack;
            }

            for (const id of ammoList.UBGL) {
                items[id]._props.StackMaxSize = this.configManager.modConfig().AdvancedStackTuning.FlaresAndUBGL;
            }

            for (const id of ammoList.Sniper) {
                items[id]._props.StackMaxSize = this.configManager.modConfig().AdvancedStackTuning.SniperStack;
            }

            for (const id of ammoList.SMG) {
                items[id]._props.StackMaxSize = this.configManager.modConfig().AdvancedStackTuning.SMGStack;
            }

            for (const id of ammoList.Rifle) {
                items[id]._props.StackMaxSize = this.configManager.modConfig().AdvancedStackTuning.RifleStack;
            }
        }

        if (
            this.configManager.modConfig().BasicStackTuning.Enabled &&
            !this.configManager.modConfig().AdvancedStackTuning.Enabled
        ) {
            for (const id in items) {
                if (items[id]._parent === "5485a8684bdc2da71d8b4567" && items[id]._props.StackMaxSize !== undefined) {
                    items[id]._props.StackMaxSize *= this.configManager.modConfig().BasicStackTuning.StackMultiplier;
                }
            }
        }

        if (
            this.configManager.modConfig().BasicStackTuning.Enabled &&
            this.configManager.modConfig().AdvancedStackTuning.Enabled
        ) {
            this.logger.log(
                "Error multiplying your ammo stacks. Make sure you only have ONE of the Stack Tuning options enabled",
                LogTextColor.RED,
            );
        }

        if (this.configManager.modConfig().MoneyStackMultiplier.Enabled) {
            for (const id in items) {
                if (items[id]._parent === "543be5dd4bdc2deb348b4569" && items[id]._props.StackMaxSize !== undefined) {
                    items[id]._props.StackMaxSize *=
                        this.configManager.modConfig().MoneyStackMultiplier.MoneyMultiplier;
                }
            }
        }
    }
}
