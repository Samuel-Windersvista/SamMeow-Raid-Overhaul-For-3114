import { DependencyContainer, Lifecycle } from "tsyringe";
//Custom Classes
import { LegionControllerGlobal } from "../controllers/LegionControllerGlobal";
import { ROWeatherController } from "../controllers/WeatherController";
import { ROHealthController } from "../controllers/HealthController";
import { ClothingGenerator } from "../generators/ClothingGenerator";
import { LegionController } from "../controllers/LegionController";
import { ItemController } from "../controllers/ItemController";
import { RaidController } from "../controllers/RaidController";
import { ReqsController } from "../controllers/ReqsController";
import { PkController } from "../controllers/PkController";
import { DynamicRouters } from "../routers/DynamicRouterHooks";
import { StaticRouters } from "../routers/StaticRouterHooks";
import { ItemGenerator } from "../generators/ItemGenerator";
import { SlotGenerator } from "../generators/SlotGenerator";
import { ConfigManager } from "../managers/ConfigManager";
import { TraderManager } from "../managers/TraderManager";
import { AssortUtils } from "../utils/AssortUtils";
import { TraderUtils } from "../utils/TraderUtils";
import { ROLogger } from "../utils/Logger";
import { Utils } from "../utils/Utils";
import { RaidOverhaul } from "../RaidOverhaul";

export class DiContainer {
    public static register(container: DependencyContainer): void {
        container.register<LegionControllerGlobal>("LegionControllerGlobal", LegionControllerGlobal, {
            lifecycle: Lifecycle.Singleton,
        });
        container.register<ROWeatherController>("ROWeatherController", ROWeatherController, {
            lifecycle: Lifecycle.Singleton,
        });
        container.register<ROHealthController>("ROHealthController", ROHealthController, {
            lifecycle: Lifecycle.Singleton,
        });
        container.register<ClothingGenerator>("ClothingGenerator", ClothingGenerator, {
            lifecycle: Lifecycle.Singleton,
        });
        container.register<LegionController>("LegionController", LegionController, {
            lifecycle: Lifecycle.Singleton,
        });
        container.register<ItemController>("ItemController", ItemController, {
            lifecycle: Lifecycle.Singleton,
        });
        container.register<RaidController>("RaidController", RaidController, {
            lifecycle: Lifecycle.Singleton,
        });
        container.register<ReqsController>("ReqsController", ReqsController, {
            lifecycle: Lifecycle.Singleton,
        });
        container.register<PkController>("PkController", PkController, {
            lifecycle: Lifecycle.Singleton,
        });
        container.register<DynamicRouters>("DynamicRouters", DynamicRouters, {
            lifecycle: Lifecycle.Singleton,
        });
        container.register<StaticRouters>("StaticRouters", StaticRouters, {
            lifecycle: Lifecycle.Singleton,
        });
        container.register<ConfigManager>("ConfigManager", ConfigManager, {
            lifecycle: Lifecycle.Singleton,
        });
        container.register<TraderManager>("TraderManager", TraderManager, {
            lifecycle: Lifecycle.Singleton,
        });
        container.register<ItemGenerator>("ItemGenerator", ItemGenerator, {
            lifecycle: Lifecycle.Singleton,
        });
        container.register<SlotGenerator>("SlotGenerator", SlotGenerator, {
            lifecycle: Lifecycle.Singleton,
        });
        container.register<RaidOverhaul>("RaidOverhaul", RaidOverhaul, {
            lifecycle: Lifecycle.Singleton,
        });
        container.register<AssortUtils>("AssortUtils", AssortUtils, {
            lifecycle: Lifecycle.Singleton,
        });
        container.register<TraderUtils>("TraderUtils", TraderUtils, {
            lifecycle: Lifecycle.Singleton,
        });
        container.register<ROLogger>("ROLogger", ROLogger, {
            lifecycle: Lifecycle.Singleton,
        });
        container.register<Utils>("Utils", Utils, {
            lifecycle: Lifecycle.Singleton,
        });
    }
}
