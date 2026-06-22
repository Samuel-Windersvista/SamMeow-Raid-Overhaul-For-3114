import { inject, injectable } from "tsyringe";
//Spt Classes
import type { StaticRouterModService } from "@spt/services/mod/staticRouter/StaticRouterModService";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";
import type { ProfileHelper } from "@spt/helpers/ProfileHelper";
//Custom Classes
import type { ROWeatherController } from "../controllers/WeatherController";
import type { ConfigManager } from "../managers/ConfigManager";
import type { ROLogger } from "../utils/Logger";
import type { Utils } from "../utils/Utils";
//Json Imports
const EventWeightingsConfig = require("../../config/EventWeightings.json");
//Modules
import path from "node:path";
import fs from "node:fs";

@injectable()
export class StaticRouters {
    private routerPrefix = "[Raid Overhaul] ";

    constructor(
        @inject("Utils") protected utils: Utils,
        @inject("ROLogger") protected logger: ROLogger,
        @inject("ConfigManager") protected configManager: ConfigManager,
        @inject("ROWeatherController") protected weatherController: ROWeatherController,
        @inject("ProfileHelper") protected profileHelper: ProfileHelper,
        @inject("StaticRouterModService") protected staticRouter: StaticRouterModService,
    ) {}

    public registerHooks(): void {
        const pluginPath = fs.readdirSync("./BepInEx/plugins").map((plugin) => plugin.toLowerCase());
        const fika = "fika.core.dll";
        const dediClient = "fika.dedicated.dll";

        //Backup profile
        this.staticRouter.registerStaticRouter(
            `${this.routerPrefix}-/client/game/start`,
            [
                {
                    url: "/client/game/start",
                    action: async (url, info, sessionID, output) => {
                        const profileInfo = this.profileHelper.getFullProfile(sessionID);

                        if (
                            this.configManager.modConfig().BackupProfile &&
                            !this.utils.checkDependancies(pluginPath, fika) &&
                            !this.utils.checkDependancies(pluginPath, dediClient)
                        ) {
                            this.utils.profileBackup(sessionID, profileInfo);
                        }
                        return Promise.resolve(output);
                    },
                },
            ],
            "spt",
        );

        //Get and send configs to the client
        this.staticRouter.registerStaticRouter(
            "GetEventConfig",
            [
                {
                    url: "/RaidOverhaul/GetEventConfig",
                    action: async (url, info, sessionId, output) => {
                        const EventWeightings = EventWeightingsConfig;

                        return JSON.stringify(EventWeightings);
                    },
                },
            ],
            "spt",
        );

        this.staticRouter.registerStaticRouter(
            "GetServerConfig",
            [
                {
                    url: "/RaidOverhaul/GetServerConfig",
                    action: async (url, info, sessionId, output) => {
                        const ServerConfig = this.configManager.modConfig();

                        return JSON.stringify(ServerConfig);
                    },
                },
            ],
            "spt",
        );

        this.staticRouter.registerStaticRouter(
            "GetWeatherConfig",
            [
                {
                    url: "/RaidOverhaul/GetWeatherConfig",
                    action: async (url, info, sessionId, output) => {
                        const WeatherConfig = this.configManager.seasonProgressionFile();

                        return JSON.stringify(WeatherConfig);
                    },
                },
            ],
            "spt",
        );

        this.staticRouter.registerStaticRouter(
            "GetDebugConfig",
            [
                {
                    url: "/RaidOverhaul/GetDebugConfig",
                    action: async (url, info, sessionId, output) => {
                        const DebugConfig = this.configManager.debugConfig();

                        return JSON.stringify(DebugConfig);
                    },
                },
            ],
            "spt",
        );

        // Randomize weather pre-raid
        if (this.configManager.modConfig().Seasons.EnableWeatherOptions) {
            if (
                this.configManager.modConfig().Seasons.NoWinter &&
                !this.configManager.modConfig().Seasons.AllSeasons &&
                !this.configManager.modConfig().Seasons.SeasonalProgression &&
                !this.configManager.modConfig().Seasons.WinterWonderland
            ) {
                this.staticRouter.registerStaticRouter(
                    `[${this.routerPrefix}]-/Seasons`,
                    [
                        {
                            url: "/client/items",
                            action: async (url, info, sessionId, output) => {
                                this.weatherController.weatherChangesNoWinter();
                                return Promise.resolve(output);
                            },
                        },
                    ],
                    "spt",
                );
            }

            if (
                this.configManager.modConfig().Seasons.AllSeasons &&
                !this.configManager.modConfig().Seasons.NoWinter &&
                !this.configManager.modConfig().Seasons.SeasonalProgression &&
                !this.configManager.modConfig().Seasons.WinterWonderland
            ) {
                this.staticRouter.registerStaticRouter(
                    `[${this.routerPrefix}]-/Seasons`,
                    [
                        {
                            url: "/client/items",
                            action: async (url, info, sessionId, output) => {
                                this.weatherController.weatherChangesAllSeasons();
                                return Promise.resolve(output);
                            },
                        },
                    ],
                    "spt",
                );
            }

            if (
                this.configManager.modConfig().Seasons.SeasonalProgression &&
                !this.configManager.modConfig().Seasons.AllSeasons &&
                !this.configManager.modConfig().Seasons.NoWinter &&
                !this.configManager.modConfig().Seasons.WinterWonderland
            ) {
                this.staticRouter.registerStaticRouter(
                    `[${this.routerPrefix}]-/Seasons`,
                    [
                        {
                            url: "/client/match/local/start",
                            action: async (url, info, sessionId, output) => {
                                const profileId = info.uid;
                                this.weatherController.seasonProgression();
                                return Promise.resolve(output);
                            },
                        },
                    ],
                    "spt",
                );
            }
            this.staticRouter.registerStaticRouter(
                `${this.routerPrefix}-ProfileSelected/Seasons`,
                [
                    {
                        url: "/client/game/profile/select",
                        action: async (url, info, sessionId, output) => {
                            const profileId = info.uid;
                            const modLoc = path.join(__dirname, "..", "..");
                            const seasonsProgressionLoc = path.join(modLoc, "config", "profiles", profileId, "seasonsProgression.json5");

                            if (!fs.existsSync(seasonsProgressionLoc)) {
                                this.logger.logWarning("No season progress file exists for this profile. Creating...");
                                this.weatherController.createSeasonsProgressFile(seasonsProgressionLoc);
                                this.logger.log(`Season progression file created.`, LogTextColor.MAGENTA);
                            }

                            return Promise.resolve(output);
                        },
                    },
                ],
                "spt",
            );
        }
    }
}
