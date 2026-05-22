import { inject, injectable } from "tsyringe";
//Spt Classes
import type { IWeatherConfig } from "@spt/models/spt/config/IWeatherConfig";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";
import type { ConfigServer } from "@spt/servers/ConfigServer";
import { ConfigTypes } from "@spt/models/enums/ConfigTypes";
import type { RandomUtil } from "@spt/utils/RandomUtil";
import { Season } from "@spt/models/enums/Season";
//Custom Classes
import type { seasonalProgression } from "../models/Interfaces";
import type { ConfigManager } from "../managers/ConfigManager";
import type { ROLogger } from "../utils/Logger";
//Modules
import path from "node:path";
import fs from "node:fs";
import JSON5 from "json5";

@injectable()
export class ROWeatherController {
    constructor(
        @inject("ROLogger") protected logger: ROLogger,
        @inject("ConfigManager") protected configManager: ConfigManager,
        @inject("RandomUtil") protected randomUtil: RandomUtil,
        @inject("ConfigServer") protected configServer: ConfigServer,
    ) {}

    public static progressFile: {
        seasonsProgression: number;
    };
    public static modLoc = path.join(__dirname, "..", "..");

    public weatherChangesAllSeasons() {
        const weatherConfig: IWeatherConfig = this.configServer.getConfig<IWeatherConfig>(ConfigTypes.WEATHER);

        if (
            this.configManager.modConfig().Seasons.AllSeasons &&
            !this.configManager.modConfig().Seasons.WinterWonderland &&
            !this.configManager.modConfig().Seasons.NoWinter &&
            !this.configManager.modConfig().Seasons.SeasonalProgression
        ) {
            const weatherChance = this.randomUtil.getInt(1, 100);

            if (weatherChance >= 1 && weatherChance <= 20) {
                weatherConfig.overrideSeason = Season.SUMMER;
                this.logger.log("Summer is active.", LogTextColor.MAGENTA);

                return;
            }
            if (weatherChance >= 21 && weatherChance <= 40) {
                weatherConfig.overrideSeason = Season.AUTUMN;
                this.logger.log("Autumn is active.", LogTextColor.MAGENTA);

                return;
            }
            if (weatherChance >= 41 && weatherChance <= 60) {
                weatherConfig.overrideSeason = Season.WINTER;
                this.logger.log("Winter is coming.", LogTextColor.MAGENTA);

                return;
            }
            if (weatherChance >= 61 && weatherChance <= 80) {
                weatherConfig.overrideSeason = Season.SPRING;
                this.logger.log("Spring is active.", LogTextColor.MAGENTA);

                return;
            }
            if (weatherChance >= 81 && weatherChance <= 100) {
                weatherConfig.overrideSeason = Season.STORM;
                this.logger.log("Storm is active.", LogTextColor.MAGENTA);

                return;
            }
        } else if (
            (this.configManager.modConfig().Seasons.AllSeasons &&
                this.configManager.modConfig().Seasons.WinterWonderland) ||
            (this.configManager.modConfig().Seasons.NoWinter &&
                this.configManager.modConfig().Seasons.WinterWonderland) ||
            (this.configManager.modConfig().Seasons.SeasonalProgression &&
                this.configManager.modConfig().Seasons.WinterWonderland) ||
            (this.configManager.modConfig().Seasons.NoWinter &&
                this.configManager.modConfig().Seasons.SeasonalProgression) ||
            (this.configManager.modConfig().Seasons.NoWinter && this.configManager.modConfig().Seasons.AllSeasons) ||
            (this.configManager.modConfig().Seasons.SeasonalProgression &&
                this.configManager.modConfig().Seasons.AllSeasons)
        ) {
            this.logger.log(
                "Error modifying your weather. Make sure you only have ONE of the weather options enabled",
                LogTextColor.RED,
            );

            return;
        }
    }

    public weatherChangesNoWinter() {
        const weatherConfig: IWeatherConfig = this.configServer.getConfig<IWeatherConfig>(ConfigTypes.WEATHER);

        if (
            this.configManager.modConfig().Seasons.NoWinter &&
            !this.configManager.modConfig().Seasons.WinterWonderland &&
            !this.configManager.modConfig().Seasons.AllSeasons &&
            !this.configManager.modConfig().Seasons.SeasonalProgression
        ) {
            const weatherChance = this.randomUtil.getInt(1, 100);

            if (weatherChance >= 1 && weatherChance <= 25) {
                weatherConfig.overrideSeason = Season.SUMMER;
                this.logger.log("Summer is active.", LogTextColor.MAGENTA);

                return;
            }
            if (weatherChance >= 26 && weatherChance <= 50) {
                weatherConfig.overrideSeason = Season.AUTUMN;
                this.logger.log("Autumn is active.", LogTextColor.MAGENTA);

                return;
            }
            if (weatherChance >= 51 && weatherChance <= 75) {
                weatherConfig.overrideSeason = Season.SPRING;
                this.logger.log("Spring is active.", LogTextColor.MAGENTA);

                return;
            }
            if (weatherChance >= 76 && weatherChance <= 100) {
                weatherConfig.overrideSeason = Season.STORM;
                this.logger.log("Storm is active.", LogTextColor.MAGENTA);

                return;
            }
        }

        if (
            (this.configManager.modConfig().Seasons.AllSeasons &&
                this.configManager.modConfig().Seasons.WinterWonderland) ||
            (this.configManager.modConfig().Seasons.NoWinter &&
                this.configManager.modConfig().Seasons.WinterWonderland) ||
            (this.configManager.modConfig().Seasons.SeasonalProgression &&
                this.configManager.modConfig().Seasons.WinterWonderland) ||
            (this.configManager.modConfig().Seasons.NoWinter &&
                this.configManager.modConfig().Seasons.SeasonalProgression) ||
            (this.configManager.modConfig().Seasons.NoWinter && this.configManager.modConfig().Seasons.AllSeasons) ||
            (this.configManager.modConfig().Seasons.SeasonalProgression &&
                this.configManager.modConfig().Seasons.AllSeasons)
        ) {
            this.logger.log(
                "Error modifying your weather. Make sure you only have ONE of the weather options enabled",
                LogTextColor.RED,
            );

            return;
        }
    }

    public weatherChangesWinterWonderland() {
        const weatherConfig: IWeatherConfig = this.configServer.getConfig<IWeatherConfig>(ConfigTypes.WEATHER);

        if (
            this.configManager.modConfig().Seasons.WinterWonderland &&
            !this.configManager.modConfig().Seasons.AllSeasons &&
            !this.configManager.modConfig().Seasons.NoWinter &&
            !this.configManager.modConfig().Seasons.SeasonalProgression
        ) {
            weatherConfig.overrideSeason = Season.WINTER;
            this.logger.log(`Snow is active. It's a whole fuckin' winter wonderland out there.`, LogTextColor.MAGENTA);

            return;
        }

        if (
            (this.configManager.modConfig().Seasons.AllSeasons &&
                this.configManager.modConfig().Seasons.WinterWonderland) ||
            (this.configManager.modConfig().Seasons.NoWinter &&
                this.configManager.modConfig().Seasons.WinterWonderland) ||
            (this.configManager.modConfig().Seasons.SeasonalProgression &&
                this.configManager.modConfig().Seasons.WinterWonderland) ||
            (this.configManager.modConfig().Seasons.NoWinter &&
                this.configManager.modConfig().Seasons.SeasonalProgression) ||
            (this.configManager.modConfig().Seasons.NoWinter && this.configManager.modConfig().Seasons.AllSeasons) ||
            (this.configManager.modConfig().Seasons.SeasonalProgression &&
                this.configManager.modConfig().Seasons.AllSeasons)
        ) {
            this.logger.log(
                "Error modifying your weather. Make sure you only have ONE of the weather options enabled",
                LogTextColor.RED,
            );

            return;
        }
    }

    public seasonProgression() {
        const weatherConfig: IWeatherConfig = this.configServer.getConfig<IWeatherConfig>(ConfigTypes.WEATHER);
        const seasonsProgressionLoc = `${ROWeatherController.modLoc}/src/utils/data/seasonsProgressionFile.json5`;
        const seasonsProgressionFile = JSON5.parse(
            fs.readFileSync(seasonsProgressionLoc, "utf8"),
        ) as seasonalProgression;

        let RaidsRun: number = seasonsProgressionFile.seasonsProgression;

        switch (RaidsRun) {
            //Spring
            case 1:
                RaidsRun++;
                weatherConfig.overrideSeason = Season.SPRING;
                seasonsProgressionFile.seasonsProgression = RaidsRun;
                if (this.configManager.debugConfig().debugMode) {
                    this.logger.log("Spring is active.", LogTextColor.MAGENTA);
                }
                break;
            case 2:
                RaidsRun++;
                weatherConfig.overrideSeason = Season.SPRING;
                seasonsProgressionFile.seasonsProgression = RaidsRun;
                if (this.configManager.debugConfig().debugMode) {
                    this.logger.log("Spring is active.", LogTextColor.MAGENTA);
                }
                break;
            case 3:
                RaidsRun++;
                weatherConfig.overrideSeason = Season.SPRING;
                seasonsProgressionFile.seasonsProgression = RaidsRun;
                if (this.configManager.debugConfig().debugMode) {
                    this.logger.log("Spring is active.", LogTextColor.MAGENTA);
                }
                break;
            //Storm (handled client side)
            case 4:
                RaidsRun++;
                seasonsProgressionFile.seasonsProgression = RaidsRun;
                if (this.configManager.debugConfig().debugMode) {
                    this.logger.log("Storm is active.", LogTextColor.MAGENTA);
                }
                break;
            case 5:
                RaidsRun++;
                seasonsProgressionFile.seasonsProgression = RaidsRun;
                if (this.configManager.debugConfig().debugMode) {
                    this.logger.log("Storm is active.", LogTextColor.MAGENTA);
                }
                break;
            case 6:
                RaidsRun++;
                seasonsProgressionFile.seasonsProgression = RaidsRun;
                if (this.configManager.debugConfig().debugMode) {
                    this.logger.log("Storm is active.", LogTextColor.MAGENTA);
                }
                break;
            //Summer
            case 7:
                RaidsRun++;
                weatherConfig.overrideSeason = Season.SUMMER;
                seasonsProgressionFile.seasonsProgression = RaidsRun;
                if (this.configManager.debugConfig().debugMode) {
                    this.logger.log("Summer is active.", LogTextColor.MAGENTA);
                }
                break;
            case 8:
                RaidsRun++;
                weatherConfig.overrideSeason = Season.SUMMER;
                seasonsProgressionFile.seasonsProgression = RaidsRun;
                if (this.configManager.debugConfig().debugMode) {
                    this.logger.log("Summer is active.", LogTextColor.MAGENTA);
                }
                break;
            case 9:
                RaidsRun++;
                weatherConfig.overrideSeason = Season.SUMMER;
                seasonsProgressionFile.seasonsProgression = RaidsRun;
                if (this.configManager.debugConfig().debugMode) {
                    this.logger.log("Summer is active.", LogTextColor.MAGENTA);
                }
                break;
            //Autumn
            case 10:
                RaidsRun++;
                weatherConfig.overrideSeason = Season.AUTUMN;
                seasonsProgressionFile.seasonsProgression = RaidsRun;
                if (this.configManager.debugConfig().debugMode) {
                    this.logger.log("Autumn is active.", LogTextColor.MAGENTA);
                }
                break;
            case 11:
                RaidsRun++;
                weatherConfig.overrideSeason = Season.AUTUMN;
                seasonsProgressionFile.seasonsProgression = RaidsRun;
                if (this.configManager.debugConfig().debugMode) {
                    this.logger.log("Autumn is active.", LogTextColor.MAGENTA);
                }
                break;
            //Late Autumn
            case 13:
                RaidsRun++;
                weatherConfig.overrideSeason = Season.AUTUMN_LATE;
                seasonsProgressionFile.seasonsProgression = RaidsRun;
                if (this.configManager.debugConfig().debugMode) {
                    this.logger.log("Autumn is active.", LogTextColor.MAGENTA);
                }
                break;
            case 14:
                RaidsRun++;
                weatherConfig.overrideSeason = Season.AUTUMN_LATE;
                seasonsProgressionFile.seasonsProgression = RaidsRun;
                if (this.configManager.debugConfig().debugMode) {
                    this.logger.log("Autumn is active.", LogTextColor.MAGENTA);
                }
                break;
            //Winter
            case 15:
                RaidsRun++;
                weatherConfig.overrideSeason = Season.WINTER;
                seasonsProgressionFile.seasonsProgression = RaidsRun;
                if (this.configManager.debugConfig().debugMode) {
                    this.logger.log("Winter is coming.", LogTextColor.MAGENTA);
                }
                break;
            case 16:
                RaidsRun++;
                weatherConfig.overrideSeason = Season.WINTER;
                seasonsProgressionFile.seasonsProgression = RaidsRun;
                if (this.configManager.debugConfig().debugMode) {
                    this.logger.log("Winter is coming.", LogTextColor.MAGENTA);
                }
                break;
            case 17:
                RaidsRun++;
                weatherConfig.overrideSeason = Season.WINTER;
                seasonsProgressionFile.seasonsProgression = RaidsRun;
                if (this.configManager.debugConfig().debugMode) {
                    this.logger.log("Winter is coming.", LogTextColor.MAGENTA);
                }
                break;
            case 18:
                RaidsRun++;
                weatherConfig.overrideSeason = Season.WINTER;
                seasonsProgressionFile.seasonsProgression = RaidsRun;
                if (this.configManager.debugConfig().debugMode) {
                    this.logger.log("Winter is coming.", LogTextColor.MAGENTA);
                }
                break;
            //Default catch
            default:
                weatherConfig.overrideSeason = Season.SPRING_EARLY;
                RaidsRun = 1;
                seasonsProgressionFile.seasonsProgression = RaidsRun;
                if (this.configManager.debugConfig().debugMode) {
                    this.logger.log("Defaulting to spring.", LogTextColor.MAGENTA);
                }
                break;
        }
        try {
            fs.writeFileSync(seasonsProgressionLoc, JSON5.stringify(seasonsProgressionFile, null, 4));
            if (this.configManager.debugConfig().debugMode) {
                this.logger.log(
                    `Seasonal progress updated to ${seasonsProgressionFile.seasonsProgression}`,
                    LogTextColor.CYAN,
                );
            }
        } catch (error) {
            this.logger.logError(`Error writing season progression file: ${error}`);
        }
    }

    public createSeasonsProgressFile(filePath?: string): void {
        const seasonsProgressActual = 1;
        const progressFileseasons = (ROWeatherController.progressFile = {
            seasonsProgression: seasonsProgressActual,
        });

        const targetPath = filePath ?? `${ROWeatherController.modLoc}/src/utils/data/seasonsProgressionFile.json5`;
        const progressLocFolder = path.dirname(targetPath);
        if (!fs.existsSync(progressLocFolder)) {
            fs.mkdirSync(progressLocFolder, { recursive: true });
        }

        try {
            fs.writeFileSync(targetPath, JSON5.stringify(progressFileseasons, null, 4));
        } catch (error) {
            this.logger.logError(`Error writing season progression file: ${error}`);
        }
    }
}
