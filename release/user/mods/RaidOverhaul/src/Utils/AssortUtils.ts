import { inject, injectable } from "tsyringe";
//Spt Classes
import type { IBarterScheme, ITrader } from "@spt/models/eft/common/tables/ITrader";
import type { DatabaseService } from "@spt/services/DatabaseService";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";
import type { IItem } from "@spt/models/eft/common/tables/IItem";
import type { PresetHelper } from "@spt/helpers/PresetHelper";
import { BaseClasses } from "@spt/models/enums/BaseClasses";
import type { ItemHelper } from "@spt/helpers/ItemHelper";
//Custom Classes
import { Currency } from "../models/Enums";
import type { ROLogger } from "./Logger";
import type { Utils } from "./Utils";
//Json Imports
import * as baseJson from "../../db/base.json";

@injectable()
export class AssortUtils {
    //#region AssortUtils
    protected itemsToSell: IItem[] = [];
    protected barterScheme: Record<string, IBarterScheme[][]> = {};
    protected loyaltyLevel: Record<string, number> = {};

    constructor(
        @inject("Utils") protected utils: Utils,
        @inject("ROLogger") protected logger: ROLogger,
        @inject("ItemHelper") protected itemHelper: ItemHelper,
        @inject("PresetHelper") protected presetHelper: PresetHelper,
        @inject("DatabaseService") protected databaseService: DatabaseService,
    ) {}

    /**
     * Start selling item with tpl
     * @param itemTpl Tpl id of the item you want trader to sell
     * @param itemId Optional - set your own Id, otherwise unique id will be generated
     */
    private createSingleAssortItem(itemTpl: string, itemId = undefined): AssortUtils {
        // Create item ready for insertion into assort table
        const newItemToAdd: IItem = {
            _id: !itemId ? this.utils.genId() : itemId,
            _tpl: itemTpl,
            parentId: "hideout", // Should always be "hideout"
            slotId: "hideout", // Should always be "hideout"
            upd: {
                UnlimitedCount: false,
                StackObjectsCount: 100,
            },
        };

        this.itemsToSell.push(newItemToAdd);

        return this;
    }

    private createComplexAssortItem(items: IItem[]): AssortUtils {
        items[0].parentId = "hideout";
        items[0].slotId = "hideout";

        if (!items[0].upd) {
            items[0].upd = {};
        }

        items[0].upd.UnlimitedCount = false;
        items[0].upd.StackObjectsCount = 100;

        this.itemsToSell.push(...items);

        return this;
    }

    private addStackCount(stackCount: number): AssortUtils {
        this.itemsToSell[0].upd.StackObjectsCount = stackCount;

        return this;
    }

    private addBuyRestriction(maxBuyLimit: number): AssortUtils {
        this.itemsToSell[0].upd.BuyRestrictionMax = maxBuyLimit;
        this.itemsToSell[0].upd.BuyRestrictionCurrent = 0;

        return this;
    }

    private addLoyaltyLevel(level: number) {
        this.loyaltyLevel[this.itemsToSell[0]._id] = level;

        return this;
    }

    private addMoneyCost(currencyType: Currency, amount: number): AssortUtils {
        this.barterScheme[this.itemsToSell[0]._id] = [
            [
                {
                    count: amount,
                    _tpl: currencyType,
                },
            ],
        ];

        return this;
    }

    private addBarterCost(itemTpl: string, count: number): AssortUtils {
        const sellableItemId = this.itemsToSell[0]._id;

        // No data at all, create
        if (Object.keys(this.barterScheme).length === 0) {
            this.barterScheme[sellableItemId] = [
                [
                    {
                        count: count,
                        _tpl: itemTpl,
                    },
                ],
            ];
        } else {
            // Item already exists, add to
            const existingData = this.barterScheme[sellableItemId][0].find((x) => x._tpl === itemTpl);
            if (existingData) {
                // itemtpl already a barter for item, add to count
                existingData.count += count;
            } else {
                // No barter for item, add it fresh
                this.barterScheme[sellableItemId][0].push({
                    count: count,
                    _tpl: itemTpl,
                });
            }
        }

        return this;
    }

    /**
     * Reset object ready for reuse
     * @returns
     */
    private export(data: ITrader, blockDupes: boolean): AssortUtils {
        const itemBeingSoldId = this.itemsToSell[0]._id;
        const itemBeingSoldTpl = this.itemsToSell[0]._tpl;
        if (blockDupes) {
            if (data.assort.items.find((x) => x._id === itemBeingSoldId)) {
                return;
            }

            if (data.assort.items.find((x) => x._tpl === itemBeingSoldTpl)) {
                return;
            }
        }

        data.assort.items.push(...this.itemsToSell);
        data.assort.barter_scheme[itemBeingSoldId] = this.barterScheme[itemBeingSoldId];
        data.assort.loyal_level_items[itemBeingSoldId] = this.loyaltyLevel[itemBeingSoldId];

        this.itemsToSell = [];
        this.barterScheme = {};
        this.loyaltyLevel = {};

        return this;
    }

    /**
     * Processes all items in a preset and fetches the total cost of them
     *
     * @param offerItems - The _items section of the selected preset
     * @returns Collective cost of all preset items
     */
    private getPriceForPresetItems(offerItems: IItem[]): number {
        let price = 0;

        for (const item of offerItems) {
            // Skip over armour inserts as those are not factored into item prices.
            if (this.itemHelper.isOfBaseclass(item._tpl, BaseClasses.BUILT_IN_INSERTS)) {
                continue;
            }

            price += this.utils.getFleaPrice(item._tpl);

            if (
                item?.upd?.sptPresetId &&
                this.presetHelper.isPresetBaseClass(item.upd.sptPresetId, BaseClasses.WEAPON)
            ) {
                break;
            }
        }

        return Math.round(price);
    }

    /**
     * Adds an item to the traders assort based on the specified params.
     *
     * @param ItemID - Id of the item you are wanting to add. Also fetches the flea price for the item by Id.
     * @param StockCount - Stock count for the added item in the traders shop.
     * @param LoyaltyLevelToPush - Loyalty level you want your item to be available at.
     */
    public buildBaseAssort(ItemID: string, StockCount: number, LoyaltyLevelToPush: number, TraderToUse?: string): void {
        const itemPrice = this.utils.getFleaPrice(ItemID);

        const slipCost = Math.round(itemPrice / 53999);
        const formCost = Math.round(itemPrice / 175);

        try {
            if (itemPrice <= 0 || itemPrice === undefined) {
                this.createSingleItemOffer(
                    ItemID,
                    StockCount,
                    LoyaltyLevelToPush,
                    this.utils.genRandomCount(1, 10),
                    Currency.ReqSlips,
                    TraderToUse ?? baseJson._id,
                );
            } else if (itemPrice <= 53999) {
                this.createSingleItemOffer(
                    ItemID,
                    StockCount,
                    LoyaltyLevelToPush,
                    formCost,
                    Currency.ReqCoins,
                    TraderToUse ?? baseJson._id,
                );
            } else if (itemPrice >= 54000) {
                this.createSingleItemOffer(
                    ItemID,
                    StockCount,
                    LoyaltyLevelToPush,
                    slipCost,
                    Currency.ReqSlips,
                    TraderToUse ?? baseJson._id,
                );
            }
        } catch (error) {
            this.logger.log(`Error loading ${ItemID} => ${error}, skipping item.`, LogTextColor.RED);
        }
    }

    /**
     * Adds a preset to the traders assort based on the specified params.
     * Mostly just for autopopulating it with random presets from the dumped globals preset array.
     *
     * @param ArrayToPull - Array holding your preset.
     * @param ItemKeys - Key of your preset in the array that will be used to generate the shop offer.
     * @param StockCount - Stock count for the preset in the traders shop.
     * @param LoyaltyLevelToPush - Loyalty level you want your preset to be available at.
     * @param presetName - Readable name of the preset for logging.
     */
    public buildPresetAssort(
        PresetItems: IItem[],
        StockCount: number,
        LoyaltyLevelToPush: number,
        presetName: any,
        TraderToUse?: string,
    ): void {
        const presetPrice = this.getPriceForPresetItems(PresetItems);
        const slipCost = Math.round(presetPrice / 53999);
        const formCost = Math.round(presetPrice / 175);

        try {
            if (presetPrice <= 0 || presetPrice === undefined) {
                this.createPresetOffer(
                    PresetItems,
                    StockCount,
                    LoyaltyLevelToPush,
                    this.utils.genRandomCount(1, 10),
                    Currency.ReqSlips,
                    TraderToUse ?? baseJson._id,
                );
            } else if (presetPrice <= 53999) {
                this.createPresetOffer(
                    PresetItems,
                    StockCount,
                    LoyaltyLevelToPush,
                    formCost,
                    Currency.ReqCoins,
                    TraderToUse ?? baseJson._id,
                );
            } else if (presetPrice >= 54000) {
                this.createPresetOffer(
                    PresetItems,
                    StockCount,
                    LoyaltyLevelToPush,
                    slipCost,
                    Currency.ReqSlips,
                    TraderToUse ?? baseJson._id,
                );
            }
        } catch (error) {
            this.logger.log(`Error loading ${presetName} => ${error}, skipping preset.`, LogTextColor.RED);
        }
    }

    public createPresetOffer(
        PresetItems: IItem[],
        StockCount: number,
        LoyaltyLevelToPush: number,
        ReqCost: number,
        CurrencyToUse: any,
        TraderToUse?: string,
    ): void {
        const tables = this.databaseService.getTables();

        PresetItems[0].parentId = "hideout";
        PresetItems[0].slotId = "hideout";

        if (!PresetItems[0].upd) {
            PresetItems[0].upd = {};
        }

        PresetItems[0].upd.UnlimitedCount = false;
        PresetItems[0].upd.StackObjectsCount = StockCount;

        this.itemsToSell.push(...PresetItems);

        const complexOffer = this.itemsToSell;
        const barterScheme = [
            [
                {
                    count: ReqCost,
                    _tpl: CurrencyToUse,
                },
            ],
        ];
        const loyaltyLevel = LoyaltyLevelToPush;

        tables.traders[TraderToUse ?? baseJson._id].assort.items.push(...complexOffer);
        tables.traders[TraderToUse ?? baseJson._id].assort.barter_scheme[complexOffer[0]._id] = barterScheme;
        tables.traders[TraderToUse ?? baseJson._id].assort.loyal_level_items[complexOffer[0]._id] = loyaltyLevel;

        this.itemsToSell = [];
    }

    public createSingleItemOffer(
        ItemToAdd: string,
        StockCount: number,
        LoyaltyLevelToPush: number,
        ReqCost: number,
        CurrencyToUse: any,
        TraderToUse?: string,
    ): void {
        const tables = this.databaseService.getTables();
        const singleOffer: IItem = {
            _id: this.utils.genId(),
            _tpl: ItemToAdd,
            parentId: "hideout",
            slotId: "hideout",
            upd: {
                UnlimitedCount: false,
                StackObjectsCount: StockCount,
            },
        };
        const barterScheme = [
            [
                {
                    count: ReqCost,
                    _tpl: CurrencyToUse,
                },
            ],
        ];
        const loyaltyLevel = LoyaltyLevelToPush;

        tables.traders[TraderToUse ?? baseJson._id].assort.items.push(singleOffer);
        tables.traders[TraderToUse ?? baseJson._id].assort.barter_scheme[singleOffer._id] = barterScheme;
        tables.traders[TraderToUse ?? baseJson._id].assort.loyal_level_items[singleOffer._id] = loyaltyLevel;
    }
    //#endregion
}
