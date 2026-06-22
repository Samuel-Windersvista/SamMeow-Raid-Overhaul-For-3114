import { inject, injectable } from "tsyringe";
//Spt Classes
import type { DynamicRouterModService } from "@spt/services/mod/dynamicRouter/DynamicRouterModService";
import type { JsonUtil } from "@spt/utils/JsonUtil";
//Custom Classes
import type { ConfigManager } from "../managers/ConfigManager";
import type { ROLogger } from "../utils/Logger";

@injectable()
export class DynamicRouters {
    private routerPrefix = "[Raid Overhaul] ";

    constructor(
        @inject("ROLogger") protected logger: ROLogger,
        @inject("ConfigManager") protected configManager: ConfigManager,
        @inject("JsonUtil") protected jsonUtil: JsonUtil,
        @inject("DynamicRouterModService") protected dynamicRouter: DynamicRouterModService,
    ) {}

    public registerHooks(): void {
        //Log from the client to the server if in debug mode is enabled in debug options
        if (this.configManager.debugConfig().debugMode) {
            this.dynamicRouter.registerDynamicRouter(
                `DynamicLogToServer-${this.routerPrefix}`,
                [
                    {
                        url: "/RaidOverhaul/LogToServer",
                        action: async (url, info, sessionID, output) => {
                            const loggerInfo = this.jsonUtil.serialize(info);
                            this.logger.logToServer(loggerInfo);

                            return JSON.stringify({ resp: "OK" });
                        },
                    },
                ],
                "LogToServer",
            );
        }
    }
}
