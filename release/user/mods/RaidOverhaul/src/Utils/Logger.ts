import { inject, injectable } from "tsyringe";
//Spt Classes
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";
import type { FileSystemSync } from "@spt/utils/FileSystemSync";
import { ILogger } from "@spt/models/spt/utils/ILogger";
//Custom Classes
import type { debugFile } from "../models/Interfaces";
//Modules
import path from "node:path";
import JSON5 from "json5";

@injectable()
export class ROLogger {
    private logPrefix = "[Raid Overhaul] ";

    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("FileSystemSync") protected sptFs: FileSystemSync,
    ) {}

    public log(text: string, textColor?: LogTextColor) {
        if (typeof textColor !== "undefined") {
            this.logger.log(this.logPrefix + text, textColor);
        } else {
            this.logger.log(this.logPrefix + text, LogTextColor.WHITE);
        }
    }

    public logError(errorText: string) {
        this.logger.error(this.logPrefix + errorText);
    }

    public logWarning(text: string) {
        this.logger.warning(this.logPrefix + text);
    }

    public logDebug(text: string) {
        const debugConfig = JSON5.parse(
            this.sptFs.read(path.resolve(__dirname, "./Data/debugOptions.json5")),
        ) as debugFile;

        if (debugConfig.debugMode) {
            this.logger.log(this.logPrefix + text, LogTextColor.WHITE);
        }
    }

    public logToServer(text: string) {
        this.logger.log(this.logPrefix + text, LogTextColor.CYAN);
    }

    public debugModeWarning() {
        this.logger.log(this.logPrefix + "DEBUG MODE ENABLED", LogTextColor.YELLOW);
    }
}
