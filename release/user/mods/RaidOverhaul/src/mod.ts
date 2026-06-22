import { DependencyContainer } from "tsyringe";
//Spt Classes
import { IPreSptLoadModAsync } from "@spt/models/external/IPreSptLoadModAsync";
import { IPostDBLoadModAsync } from "@spt/models/external/IPostDBLoadModAsync";
//Custom Classes
import { RaidOverhaul } from "./RaidOverhaul";
import { DiContainer } from "./di/Container";

class ROMod implements IPreSptLoadModAsync, IPostDBLoadModAsync {
    public async preSptLoadAsync(container: DependencyContainer): Promise<void> {
        DiContainer.register(container);

        await container.resolve<RaidOverhaul>("RaidOverhaul").preSptLoadAsync();
    }

    public async postDBLoadAsync(container: DependencyContainer): Promise<void> {
        container.resolve<RaidOverhaul>("RaidOverhaul").postDBLoadAsync();
    }
}

module.exports = { mod: new ROMod() };

//      \('_')/     \('_')/     \('_')/     \('_')/     \('_')/     \('_')/     \('_')/     \('_')/     \('_')/     \('_')/     \('_')/     \('_')/     \('_')/     \('_')/
