import type { IItem } from "@spt/models/eft/common/tables/IItem";

export interface WeaponPreset {
    _id: string;
    _name: string;
    _parent: string;
    _items: IItem[];
}

export interface ArmorPreset {
    _id: string;
    _name: string;
    _parent: string;
    _items: IItem[];
}

export interface AssortTemplate {
    items: [
        {
            _id: string;
            _tpl: string;
            parentId: string;
            slotId: string;
            upd: {
                StackObjectsCount: number;
                UnlimitedCount: boolean;
            };
        },
    ];
    barter_scheme: {
        [itemid: string]: [
            [
                {
                    _tpl: string;
                    count: number;
                },
            ],
        ];
    };
    loyal_level_items: {
        [itemid: string]: number;
    };
}
//#endregion

export interface configFile {
    EnableCustomBoss: boolean;
    EnableRequisitionOffice: boolean;
    UseLegionGlobalSpawnChance: boolean;
    GlobalSpawnChance: number;
    RemoveFromSwag: boolean;
    EnableCustomItems: boolean;
    BackupProfile: boolean;
    Raid: {
        ReduceFoodAndHydroDegrade: {
            Enabled: boolean;
            EnergyDecay: number;
            HydroDecay: number;
        };
        SaveQuestItems: boolean;
        NoRunThrough: boolean;
        LootableMelee: boolean;
        LootableArmbands: boolean;
        EnableExtendedRaids: boolean;
        TimeLimit: number;
        HolsterAnything: boolean;
        LowerExamineTime: boolean;
        SpecialSlotChanges: boolean;
        ChangeBackpackSizes: boolean;
        ModifyEnemyBotHealth: boolean;
        ChangeAirdropValues: {
            Enabled: boolean;
            Customs: number;
            Woods: number;
            Lighthouse: number;
            Interchange: number;
            Shoreline: number;
            Reserve: number;
            Streets: number;
            GroundZero: number;
        };
    };
    PocketChanges: {
        Enabled: boolean;
        Pocket1: {
            Vertical: number;
            Horizontal: number;
        };
        Pocket2: {
            Vertical: number;
            Horizontal: number;
        };
        Pocket3: {
            Vertical: number;
            Horizontal: number;
        };
        Pocket4: {
            Vertical: number;
            Horizontal: number;
        };
    };
    WeightChanges: {
        Enabled: boolean;
        WeightMultiplier: number;
    };
    Trader: {
        DisableFleaBlacklist: boolean;
        LL1Items: boolean;
        RemoveFirRequirementsForQuests: boolean;
    };
    Insurance: {
        Enabled: boolean;
        PraporMinReturn: number;
        PraporMaxReturn: number;
        TherapistMinReturn: number;
        TherapistMaxReturn: number;
    };
    BasicStackTuning: {
        Enabled: boolean;
        StackMultiplier: number;
    };
    AdvancedStackTuning: {
        Enabled: boolean;
        ShotgunStack: number;
        FlaresAndUBGL: number;
        SniperStack: number;
        SMGStack: number;
        RifleStack: number;
    };
    MoneyStackMultiplier: {
        Enabled: boolean;
        MoneyMultiplier: number;
    };
    LootChanges: {
        EnableLootOptions: boolean;
        StaticLootMultiplier: number;
        LooseLootMultiplier: number;
        MarkedRoomLootMultiplier: number;
    };
    Seasons: {
        EnableWeatherOptions: boolean;
        AllSeasons: boolean;
        NoWinter: boolean;
        SeasonalProgression: boolean;
        WinterWonderland: boolean;
    };
}

export interface seasonalProgression {
    seasonsProgression: number;
}

export interface legionProgression {
    legionChance: number;
}

export interface itemEntry {
    itemFormat: Record<string, string>;
}

export interface debugFile {
    baseLegionChance: number;
    debugMode: boolean;
    dumpData: boolean;
}

export interface SwagCustomBossConfig {
    TotalBossesPerMap: {
        factory: number;
        factory_night: number;
        customs: number;
        woods: number;
        shoreline: number;
        lighthouse: number;
        reserve: number;
        interchange: number;
        laboratory: number;
        streets: number;
    };
    Bosses: {
        useGlobalBossSpawnChance: boolean;
        gluhar: {
            customs: number;
            factory: number;
            factory_night: number;
            groundzero: number;
            groundzero_high: number;
            interchange: number;
            laboratory: number;
            lighthouse: number;
            reserve: number;
            shoreline: number;
            streets: number;
            woods: number;
        };
        goons: {
            customs: number;
            factory: number;
            factory_night: number;
            groundzero: number;
            groundzero_high: number;
            interchange: number;
            laboratory: number;
            lighthouse: number;
            reserve: number;
            shoreline: number;
            streets: number;
            woods: number;
        };
        kaban: {
            customs: number;
            factory: number;
            factory_night: number;
            groundzero: number;
            groundzero_high: number;
            interchange: number;
            laboratory: number;
            lighthouse: number;
            reserve: number;
            shoreline: number;
            streets: number;
            woods: number;
        };
        killa: {
            customs: number;
            factory: number;
            factory_night: number;
            groundzero: number;
            groundzero_high: number;
            interchange: number;
            laboratory: number;
            lighthouse: number;
            reserve: number;
            shoreline: number;
            streets: number;
            woods: number;
        };
        kolontay: {
            customs: number;
            factory: number;
            factory_night: number;
            groundzero: number;
            groundzero_high: number;
            interchange: number;
            laboratory: number;
            lighthouse: number;
            reserve: number;
            shoreline: number;
            streets: number;
            woods: number;
        };
        reshala: {
            customs: number;
            factory: number;
            factory_night: number;
            groundzero: number;
            groundzero_high: number;
            interchange: number;
            laboratory: number;
            lighthouse: number;
            reserve: number;
            shoreline: number;
            streets: number;
            woods: number;
        };
        sanitar: {
            customs: number;
            factory: number;
            factory_night: number;
            groundzero: number;
            groundzero_high: number;
            interchange: number;
            laboratory: number;
            lighthouse: number;
            reserve: number;
            shoreline: 25;
            streets: number;
            woods: number;
        };
        shturman: {
            customs: number;
            factory: number;
            factory_night: number;
            groundzero: number;
            groundzero_high: number;
            interchange: number;
            laboratory: number;
            lighthouse: number;
            reserve: number;
            shoreline: number;
            streets: number;
            woods: 15;
        };
        tagilla: {
            customs: number;
            factory: number;
            factory_night: number;
            groundzero: number;
            groundzero_high: number;
            interchange: number;
            laboratory: number;
            lighthouse: number;
            reserve: number;
            shoreline: number;
            streets: number;
            woods: number;
        };
        zryachiy: {
            customs: number;
            factory: number;
            factory_night: number;
            groundzero: number;
            groundzero_high: number;
            interchange: number;
            laboratory: number;
            lighthouse: number;
            reserve: number;
            shoreline: number;
            streets: number;
            woods: number;
        };
        partisan: {
            customs: 15;
            factory: number;
            factory_night: number;
            groundzero: number;
            groundzero_high: number;
            interchange: number;
            laboratory: number;
            lighthouse: 15;
            reserve: number;
            shoreline: 15;
            streets: number;
            woods: 15;
        };
    };
    CustomBosses: {
        santa: {
            enabled: boolean;
            forceSpawnOutsideEvent: boolean;
            customs: number;
            factory: number;
            factory_night: number;
            groundzero: number;
            groundzero_high: number;
            interchange: number;
            laboratory: number;
            lighthouse: number;
            reserve: number;
            shoreline: number;
            streets: number;
            woods: number;
        };
        punisher: {
            enabled: boolean;
            useProgressSpawnChance: boolean;
            customs: number;
            factory: number;
            factory_night: number;
            groundzero: number;
            groundzero_high: number;
            interchange: number;
            laboratory: number;
            lighthouse: number;
            reserve: number;
            shoreline: number;
            streets: number;
            woods: number;
        };
        legion: {
            enabled: boolean;
            useProgressSpawnChance: boolean;
            customs: number;
            factory: number;
            factory_night: number;
            groundzero: number;
            groundzero_high: number;
            interchange: number;
            laboratory: number;
            lighthouse: number;
            reserve: number;
            shoreline: number;
            streets: number;
            woods: number;
        };
    };
}

export interface SwagLegionConfig {
    customs: [
        {
            BossChance: number;
            BossEscortAmount: number;
            BossEscortType: string;
            BossName: string;
            BossZone: any;
            Time: number;
        },
    ];
    factory: [
        {
            BossChance: number;
            BossEscortAmount: number;
            BossEscortType: string;
            BossName: string;
            BossZone: any;
            Time: number;
        },
    ];
    factory_night: [
        {
            BossChance: number;
            BossEscortAmount: number;
            BossEscortType: string;
            BossName: string;
            BossZone: any;
            Time: number;
        },
    ];
    groundzero: [
        {
            BossChance: number;
            BossEscortAmount: number;
            BossEscortType: string;
            BossName: string;
            BossZone: any;
            Time: number;
        },
    ];
    groundzero_high: [
        {
            BossChance: number;
            BossEscortAmount: number;
            BossEscortType: string;
            BossName: string;
            BossZone: any;
            Time: number;
        },
    ];
    interchange: [
        {
            BossChance: number;
            BossEscortAmount: number;
            BossEscortType: string;
            BossName: string;
            BossZone: any;
            Time: number;
        },
    ];
    laboratory: [
        {
            BossChance: number;
            BossEscortAmount: number;
            BossEscortType: string;
            BossName: string;
            BossZone: any;
            Time: number;
        },
    ];
    lighthouse: [
        {
            BossChance: number;
            BossEscortAmount: number;
            BossEscortType: string;
            BossName: string;
            BossZone: any;
            Time: number;
        },
    ];
    reserve: [
        {
            BossChance: number;
            BossEscortAmount: number;
            BossEscortType: string;
            BossName: string;
            BossZone: any;
            Time: number;
        },
    ];
    shoreline: [
        {
            BossChance: number;
            BossEscortAmount: number;
            BossEscortType: string;
            BossName: string;
            BossZone: any;
            Time: number;
        },
    ];
    streets: [
        {
            BossChance: number;
            BossEscortAmount: number;
            BossEscortType: string;
            BossName: string;
            BossZone: any;
            Time: number;
        },
    ];
    woods: [
        {
            BossChance: number;
            BossEscortAmount: number;
            BossEscortType: string;
            BossName: string;
            BossZone: any;
            Time: number;
        },
    ];
}
