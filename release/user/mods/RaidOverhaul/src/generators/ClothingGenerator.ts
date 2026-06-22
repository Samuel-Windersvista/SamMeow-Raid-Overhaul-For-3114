import { inject, injectable } from "tsyringe";
//Spt Classes
import type { DatabaseService } from "@spt/services/DatabaseService";

@injectable()
export class ClothingGenerator {
    constructor(@inject("DatabaseService") protected databaseService: DatabaseService) {}

    /**
     * Loads all of your json tops files and creates items based on the supplied data.
     *
     * @param newTopConfig - The directory where you are storing your top json files.
     */
    public createClothingTop(newTopConfig: any): void {
        const tables = this.databaseService.getTables();
        const newTop = structuredClone(tables.templates.customization["5d28adcb86f77429242fc893"]);
        const newHands = structuredClone(tables.templates.customization[newTopConfig.HandsToClone]);
        const newSet = structuredClone(tables.templates.customization["5d1f623e86f7744bce0ef705"]);

        newTop._id = newTopConfig.NewOutfitID;
        newTop._name = newTopConfig.LocaleName;
        newTop._props.Prefab.path = newTopConfig.BundlePath;
        tables.templates.customization[newTopConfig.NewOutfitID] = newTop;

        newHands._id = newTopConfig.NewHandsID;
        newHands._name = `${newTopConfig.LocaleName} Hands`;
        newHands._props.Prefab.path = newTopConfig.HandsBundlePath;
        tables.templates.customization[newTopConfig.NewHandsID] = newHands;

        newSet._id = newTopConfig.NewSetID;
        newSet._name = `${newTopConfig.LocaleName} Set`;
        newSet._props.Body = newTopConfig.NewOutfitID;
        newSet._props.Hands = newHands._id;
        newSet._props.Side = ["Usec", "Bear", "Savage"];
        tables.templates.customization[newTopConfig.NewSetID] = newSet;

        for (const locale in tables.locales.global) {
            tables.locales.global[locale][newSet._name] = newTopConfig.LocaleName;
        }

        if (newTopConfig.TraderScheme !== undefined) {
            if (!tables.traders[newTopConfig.TraderScheme?.TraderToUse].base.customization_seller) {
                tables.traders[newTopConfig.TraderScheme?.TraderToUse].base.customization_seller = true;
            }

            if (!tables.traders[newTopConfig.TraderScheme?.TraderToUse].suits) {
                tables.traders[newTopConfig.TraderScheme?.TraderToUse].suits = [];
            }

            tables.traders[newTopConfig.TraderScheme?.TraderToUse].suits.push({
                _id: newTopConfig.NewOutfitID,
                tid: newTopConfig.TraderScheme?.TraderToUse,
                suiteId: newTopConfig.NewSetID,
                isActive: true,
                requirements: {
                    loyaltyLevel: newTopConfig.TraderScheme?.LoyaltyLevel,
                    profileLevel: newTopConfig.TraderScheme?.ProfileLevelRequirement,
                    standing: newTopConfig.TraderScheme?.TraderStandingRequirement,
                    skillRequirements: [],
                    questRequirements: [],
                    itemRequirements: [
                        {
                            count: newTopConfig.TraderScheme?.Cost,
                            _tpl: newTopConfig.TraderScheme?.CurrencyToUse,
                            onlyFunctional: false,
                            id: null,
                            type: "ItemRequirement",
                        },
                    ],
                    achievementRequirements: [],
                    requiredTid: "",
                },
                externalObtain: false,
                internalObtain: false,
                isHiddenInPVE: false,
            });
        }
    }

    /**
     * Loads all of your pants item files and creates items based on the supplied data.
     *
     * @param newBottomConfig - The directory where you are storing your pants json files.
     */
    public createClothingBottom(newBottomConfig: any): void {
        const tables = this.databaseService.getTables();
        const newBottom = structuredClone(tables.templates.customization["5d5e7f4986f7746956659f8a"]);
        const newSet = structuredClone(tables.templates.customization["5cd946231388ce000d572fe3"]);

        newBottom._id = newBottomConfig.NewBottomsID;
        newBottom._name = newBottomConfig.LocaleName;
        newBottom._props.Prefab.path = newBottomConfig.BundlePath;
        tables.templates.customization[newBottomConfig.NewBottomsID] = newBottom;

        newSet._id = newBottomConfig.NewSetID;
        newSet._name = `${newBottomConfig.NewBottomsID} Set`;
        newSet._props.Feet = newBottomConfig.NewBottomsID;
        newSet._props.Side = ["Usec", "Bear", "Savage"];
        tables.templates.customization[newBottomConfig.NewSetID] = newSet;

        for (const locale in tables.locales.global) {
            tables.locales.global[locale][newBottomConfig.NewBottomsID] = newBottomConfig.LocaleName;
        }

        if (newBottomConfig.TraderScheme !== undefined) {
            if (!tables.traders[newBottomConfig.TraderScheme?.TraderToUse].base.customization_seller) {
                tables.traders[newBottomConfig.TraderScheme?.TraderToUse].base.customization_seller = true;
            }

            if (!tables.traders[newBottomConfig.TraderScheme?.TraderToUse].suits) {
                tables.traders[newBottomConfig.TraderScheme?.TraderToUse].suits = [];
            }

            tables.traders[newBottomConfig.TraderScheme?.TraderToUse].suits.push({
                _id: newBottomConfig.NewBottomsID,
                tid: newBottomConfig.TraderScheme?.TraderToUse,
                suiteId: newBottomConfig.NewSetID,
                isActive: true,
                requirements: {
                    loyaltyLevel: newBottomConfig.TraderScheme?.LoyaltyLevel,
                    profileLevel: newBottomConfig.TraderScheme?.ProfileLevelRequirement,
                    standing: newBottomConfig.TraderScheme?.TraderStandingRequirement,
                    skillRequirements: [],
                    questRequirements: [],
                    itemRequirements: [
                        {
                            count: newBottomConfig.TraderScheme?.Cost,
                            _tpl: newBottomConfig.TraderScheme?.CurrencyToUse,
                            onlyFunctional: false,
                            id: null,
                            type: "ItemRequirement",
                        },
                    ],
                    achievementRequirements: [],
                    requiredTid: "",
                },
                externalObtain: false,
                internalObtain: false,
                isHiddenInPVE: false,
            });
        }
    }
}
