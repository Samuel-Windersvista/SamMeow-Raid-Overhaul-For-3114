import { inject, injectable } from "tsyringe";
//Spt Classes
import type { ILostOnDeathConfig } from "@spt/models/spt/config/ILostOnDeathConfig";
import type { ILocationConfig } from "@spt/models/spt/config/ILocationConfig";
import type { IRagfairConfig } from "@spt/models/spt/config/IRagfairConfig";
import { DatabaseService } from "@spt/services/DatabaseService";
import { ConfigTypes } from "@spt/models/enums/ConfigTypes";
import { ConfigServer } from "@spt/servers/ConfigServer";
//Custom Classes
import type { ConfigManager } from "../managers/ConfigManager";

@injectable()
export class RaidController {
    constructor(
        @inject("ConfigManager") protected configManager: ConfigManager,
        @inject("ConfigServer") protected configServer: ConfigServer,
        @inject("DatabaseService") protected databaseService: DatabaseService,
    ) {}

    public raidChanges(): void {
        const tables = this.databaseService.getTables();
        const globals = tables.globals.config;
        const questItems = this.configServer.getConfig<ILostOnDeathConfig>(ConfigTypes.LOST_ON_DEATH);

        if (this.configManager.modConfig().Raid.EnableExtendedRaids) {
            for (const location in tables.locations) {
                if (location === "base") continue;

                tables.locations[location].base.EscapeTimeLimit = this.configManager.modConfig().Raid.TimeLimit * 60;
                tables.locations[location].base.EscapeTimeLimitCoop =
                    this.configManager.modConfig().Raid.TimeLimit * 60;
            }
        }

        if (this.configManager.modConfig().Raid.ReduceFoodAndHydroDegrade.Enabled) {
            globals.Health.Effects.Existence.EnergyDamage =
                this.configManager.modConfig().Raid.ReduceFoodAndHydroDegrade.EnergyDecay;
            globals.Health.Effects.Existence.HydrationDamage =
                this.configManager.modConfig().Raid.ReduceFoodAndHydroDegrade.HydroDecay;
        }

        if (this.configManager.modConfig().Raid.ChangeAirdropValues.Enabled) {
            tables.locations["bigmap"].base.AirdropParameters[0].PlaneAirdropChance =
                this.configManager.modConfig().Raid.ChangeAirdropValues.Customs;
            tables.locations["woods"].base.AirdropParameters[0].PlaneAirdropChance =
                this.configManager.modConfig().Raid.ChangeAirdropValues.Woods;
            tables.locations["lighthouse"].base.AirdropParameters[0].PlaneAirdropChance =
                this.configManager.modConfig().Raid.ChangeAirdropValues.Lighthouse;
            tables.locations["shoreline"].base.AirdropParameters[0].PlaneAirdropChance =
                this.configManager.modConfig().Raid.ChangeAirdropValues.Shoreline;
            tables.locations["interchange"].base.AirdropParameters[0].PlaneAirdropChance =
                this.configManager.modConfig().Raid.ChangeAirdropValues.Interchange;
            tables.locations["rezervbase"].base.AirdropParameters[0].PlaneAirdropChance =
                this.configManager.modConfig().Raid.ChangeAirdropValues.Reserve;
            tables.locations["tarkovstreets"].base.AirdropParameters[0].PlaneAirdropChance =
                this.configManager.modConfig().Raid.ChangeAirdropValues.Streets;
            tables.locations["sandbox"].base.AirdropParameters[0].PlaneAirdropChance =
                this.configManager.modConfig().Raid.ChangeAirdropValues.GroundZero;
            tables.locations["sandbox_high"].base.AirdropParameters[0].PlaneAirdropChance =
                this.configManager.modConfig().Raid.ChangeAirdropValues.GroundZero;
        }

        if (this.configManager.modConfig().Raid.SaveQuestItems) {
            questItems.questItems = false;
        }

        if (this.configManager.modConfig().Raid.NoRunThrough) {
            globals.exp.match_end.survived_exp_requirement = 0;
            globals.exp.match_end.survived_seconds_requirement = 0;
        }
    }

    public weightChanges(): void {
        const tables = this.databaseService.getTables();
        const globals = tables.globals.config;

        if (this.configManager.modConfig().WeightChanges.Enabled) {
            globals.Stamina.BaseOverweightLimits.x *= this.configManager.modConfig().WeightChanges.WeightMultiplier;
            globals.Stamina.BaseOverweightLimits.y *= this.configManager.modConfig().WeightChanges.WeightMultiplier;
            globals.Stamina.WalkOverweightLimits.x *= this.configManager.modConfig().WeightChanges.WeightMultiplier;
            globals.Stamina.WalkOverweightLimits.y *= this.configManager.modConfig().WeightChanges.WeightMultiplier;
            globals.Stamina.WalkSpeedOverweightLimits.x *=
                this.configManager.modConfig().WeightChanges.WeightMultiplier;
            globals.Stamina.WalkSpeedOverweightLimits.y *=
                this.configManager.modConfig().WeightChanges.WeightMultiplier;
            globals.Stamina.SprintOverweightLimits.x *= this.configManager.modConfig().WeightChanges.WeightMultiplier;
            globals.Stamina.SprintOverweightLimits.y *= this.configManager.modConfig().WeightChanges.WeightMultiplier;
        }
    }

    public lootChanges(): void {
        const tables = this.databaseService.getTables();
        const maps = this.configServer.getConfig<ILocationConfig>(ConfigTypes.LOCATION);
        const markedRoomCustoms = tables.locations.bigmap.looseLoot.spawnpoints;
        const markedRoomReserve = tables.locations.rezervbase.looseLoot.spawnpoints;
        const markedRoomStreets = tables.locations.tarkovstreets.looseLoot.spawnpoints;
        const markedRoomLighthouse = tables.locations.lighthouse.looseLoot.spawnpoints;

        // Marked room spawn point coordinate bounds for each map
        const MARKED_ROOM_BOUNDS = {
            customs: [
                { xMin: 180, xMax: 185, yMin: 6, yMax: 7, zMin: 180, zMax: 185 }
            ],
            reserve: [
                { xMin: -125, xMax: -120, yMin: -15, yMax: -14, zMin: 25, zMax: 30 },
                { xMin: -155, xMax: -150, yMin: -9, yMax: -8, zMin: 70, zMax: 75 },
                { xMin: 190, xMax: 195, yMin: -6, yMax: -5, zMin: -230, zMax: -225 }
            ],
            streets: [
                { xMin: -133, xMax: -129, yMin: 8.5, yMax: 11, zMin: 265, zMax: 275 },
                { xMin: 186, xMax: 191, yMin: -0.5, yMax: 1.5, zMin: 224, zMax: 229 }
            ],
            lighthouse: [
                { xMin: 319, xMax: 330, yMin: 5, yMax: 6.5, zMin: 482, zMax: 489 }
            ]
        };

        if (this.configManager.modConfig().LootChanges.EnableLootOptions) {
            maps.looseLootMultiplier.bigmap = this.configManager.modConfig().LootChanges.LooseLootMultiplier;
            maps.looseLootMultiplier.factory4_day = this.configManager.modConfig().LootChanges.LooseLootMultiplier;
            maps.looseLootMultiplier.factory4_night = this.configManager.modConfig().LootChanges.LooseLootMultiplier;
            maps.looseLootMultiplier.interchange = this.configManager.modConfig().LootChanges.LooseLootMultiplier;
            maps.looseLootMultiplier.laboratory = this.configManager.modConfig().LootChanges.LooseLootMultiplier;
            maps.looseLootMultiplier.rezervbase = this.configManager.modConfig().LootChanges.LooseLootMultiplier;
            maps.looseLootMultiplier.shoreline = this.configManager.modConfig().LootChanges.LooseLootMultiplier;
            maps.looseLootMultiplier.woods = this.configManager.modConfig().LootChanges.LooseLootMultiplier;
            maps.looseLootMultiplier.lighthouse = this.configManager.modConfig().LootChanges.LooseLootMultiplier;
            maps.looseLootMultiplier.tarkovstreets = this.configManager.modConfig().LootChanges.LooseLootMultiplier;
            maps.looseLootMultiplier.sandbox = this.configManager.modConfig().LootChanges.LooseLootMultiplier;

            maps.staticLootMultiplier.bigmap = this.configManager.modConfig().LootChanges.StaticLootMultiplier;
            maps.staticLootMultiplier.factory4_day = this.configManager.modConfig().LootChanges.StaticLootMultiplier;
            maps.staticLootMultiplier.factory4_night = this.configManager.modConfig().LootChanges.StaticLootMultiplier;
            maps.staticLootMultiplier.interchange = this.configManager.modConfig().LootChanges.StaticLootMultiplier;
            maps.staticLootMultiplier.laboratory = this.configManager.modConfig().LootChanges.StaticLootMultiplier;
            maps.staticLootMultiplier.rezervbase = this.configManager.modConfig().LootChanges.StaticLootMultiplier;
            maps.staticLootMultiplier.shoreline = this.configManager.modConfig().LootChanges.StaticLootMultiplier;
            maps.staticLootMultiplier.woods = this.configManager.modConfig().LootChanges.StaticLootMultiplier;
            maps.staticLootMultiplier.lighthouse = this.configManager.modConfig().LootChanges.StaticLootMultiplier;
            maps.staticLootMultiplier.tarkovstreets = this.configManager.modConfig().LootChanges.StaticLootMultiplier;
            maps.staticLootMultiplier.sandbox = this.configManager.modConfig().LootChanges.StaticLootMultiplier;
        }

        for (const cSP of markedRoomCustoms) {
            if (isInBounds(cSP.template.Position, MARKED_ROOM_BOUNDS.customs)) {
                cSP.probability *= this.configManager.modConfig().LootChanges.MarkedRoomLootMultiplier;
            }
        }

        for (const rSP of markedRoomReserve) {
            if (isInBounds(rSP.template.Position, MARKED_ROOM_BOUNDS.reserve)) {
                rSP.probability *= this.configManager.modConfig().LootChanges.MarkedRoomLootMultiplier;
            }
        }

        for (const sSP of markedRoomStreets) {
            if (isInBounds(sSP.template.Position, MARKED_ROOM_BOUNDS.streets)) {
                sSP.probability *= this.configManager.modConfig().LootChanges.MarkedRoomLootMultiplier;
            }
        }

        for (const lSP of markedRoomLighthouse) {
            if (isInBounds(lSP.template.Position, MARKED_ROOM_BOUNDS.lighthouse)) {
                lSP.probability *= this.configManager.modConfig().LootChanges.MarkedRoomLootMultiplier;
            }
        }

        function isInBounds(pos: { x: number; y: number; z: number }, bounds: { xMin: number; xMax: number; yMin: number; yMax: number; zMin: number; zMax: number }[]): boolean {
            return bounds.some(b =>
                pos.x > b.xMin && pos.x < b.xMax &&
                pos.y > b.yMin && pos.y < b.yMax &&
                pos.z > b.zMin && pos.z < b.zMax
            );
        }
    }

    public traderTweaks(): void {
        const tables = this.databaseService.getTables();
        const quests = tables.templates.quests;
        const traders = tables.traders;
        const ragfair = this.configServer.getConfig<IRagfairConfig>(ConfigTypes.RAGFAIR);

        if (this.configManager.modConfig().Insurance.Enabled) {
            traders["54cb50c76803fa8b248b4571"].base.insurance.min_return_hour =
                this.configManager.modConfig().Insurance.PraporMinReturn;
            traders["54cb50c76803fa8b248b4571"].base.insurance.max_return_hour =
                this.configManager.modConfig().Insurance.PraporMaxReturn;
            traders["54cb57776803fa99248b456e"].base.insurance.min_return_hour =
                this.configManager.modConfig().Insurance.TherapistMinReturn;
            traders["54cb57776803fa99248b456e"].base.insurance.max_return_hour =
                this.configManager.modConfig().Insurance.TherapistMaxReturn;
        }

        if (this.configManager.modConfig().Trader.LL1Items && this.configManager.modConfig().EnableRequisitionOffice) {
            for (const item in tables.traders["66f0eaa93f6cc015bc1f3acb"].assort.loyal_level_items) {
                tables.traders["66f0eaa93f6cc015bc1f3acb"].assort.loyal_level_items[item] = 1;
            }
        }

        if (this.configManager.modConfig().Trader.DisableFleaBlacklist) {
            ragfair.dynamic.blacklist.enableBsgList = false;
        }

        if (this.configManager.modConfig().Trader.RemoveFirRequirementsForQuests) {
            for (const q in quests) {
                const quest = quests[q];
                if (quest?.conditions?.AvailableForFinish) {
                    const availableForFinish = quest.conditions.AvailableForFinish;
                    for (const requirement in availableForFinish) {
                        if (availableForFinish[requirement].onlyFoundInRaid) {
                            availableForFinish[requirement].onlyFoundInRaid = false;
                        }
                    }
                }
            }
        }
    }
}
