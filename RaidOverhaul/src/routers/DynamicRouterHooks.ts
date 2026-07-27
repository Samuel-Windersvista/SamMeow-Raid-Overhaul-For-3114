import { inject, injectable } from "tsyringe";
//Spt Classes
import type { DynamicRouterModService } from "@spt/services/mod/dynamicRouter/DynamicRouterModService";
import type { JsonUtil } from "@spt/utils/JsonUtil";
import type { MailSendService } from "@spt/services/MailSendService";
import type { ISendMessageDetails } from "@spt/models/spt/dialogs/ISendMessageDetails";
import type { IUserDialogInfo } from "@spt/models/eft/common/tables/IUserDialogInfo";
import { MessageType } from "@spt/models/enums/MessageType";
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
        @inject("MailSendService") protected mailSendService: MailSendService,
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

        // Gear Exfil Crate: 通过 MailSendService 发送撤离箱物品到征用处消息
        this.dynamicRouter.registerDynamicRouter(
            `SendExfilItems-${this.routerPrefix}`,
            [
                {
                    url: "/RaidOverhaul/SendExfilItems",
                    action: async (url, info, sessionID, output) => {
                        try {
                            const items = info.items;
                            if (!items || items.length === 0) {
                                return JSON.stringify({ resp: "empty" });
                            }

                            // 构造发送者：征用处（不依赖商人 dialogue.json）
                            const senderBot: IUserDialogInfo = {
                                _id: "66f0eaa93f6cc015bc1f3acb",
                                aid: 1113680,
                                Info: {
                                    Level: 1,
                                    MemberCategory: "emissary" as any,
                                    SelectedMemberCategory: "emissary" as any,
                                    Nickname: "征用处",
                                    Side: "Usec",
                                },
                            };

                            const details: ISendMessageDetails = {
                                recipientId: sessionID,
                                sender: MessageType.USER_MESSAGE,
                                senderDetails: senderBot,
                                messageText: "你的装备已安全回收。",
                                items: items,
                                itemsMaxStorageLifetimeSeconds: 86400,
                            };

                            this.mailSendService.sendMessageToPlayer(details);
                            return JSON.stringify({ resp: "ok" });
                        } catch (e) {
                            return JSON.stringify({ resp: "error", msg: String(e) });
                        }
                    },
                },
            ],
            "SendExfilItems",
        );
    }
}
