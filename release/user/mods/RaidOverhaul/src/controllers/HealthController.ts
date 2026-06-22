import { inject, injectable } from "tsyringe";
//Spt Classes
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";
import { DatabaseService } from "@spt/services/DatabaseService";
//Custom Classes
import type { ConfigManager } from "../managers/ConfigManager";
import type { ROLogger } from "../utils/Logger";

@injectable()
export class ROHealthController {
    constructor(
        @inject("ROLogger") protected logger: ROLogger,
        @inject("ConfigManager") protected configManager: ConfigManager,
        @inject("DatabaseService") protected databaseService: DatabaseService,
    ) {}

    public modifyEnemyHealth() {
        const tables = this.databaseService.getTables();
        const botTypes = tables.bots.types;

        for (const bot in botTypes) {
            botTypes[bot].health.BodyParts = [
                {
                    Chest: {
                        max: 85,
                        min: 85,
                    },
                    Head: {
                        max: 35,
                        min: 35,
                    },
                    LeftArm: {
                        max: 60,
                        min: 60,
                    },
                    LeftLeg: {
                        max: 65,
                        min: 65,
                    },
                    RightArm: {
                        max: 60,
                        min: 60,
                    },
                    RightLeg: {
                        max: 65,
                        min: 65,
                    },
                    Stomach: {
                        max: 70,
                        min: 70,
                    },
                },
            ];
        }

        if (this.configManager.debugConfig().debugMode) {
            this.logger.log("Enemy health modified.", LogTextColor.GREEN);
        }
    }
}
