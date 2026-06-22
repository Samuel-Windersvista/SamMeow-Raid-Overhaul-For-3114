import { inject, injectable } from "tsyringe";
//Spt Classes
import { DatabaseService } from "@spt/services/DatabaseService";
//Custom Classes
import { CustomMap } from "../models/Enums";

@injectable()
export class SlotGenerator {
    constructor(@inject("DatabaseService") protected databaseService: DatabaseService) {}

    /**
     * Pushes my items to the specified slots. Saves a lot of time, space, and my sanity doing it all in json
     *
     */
    public buildSlots(): void {
        const tables = this.databaseService.getTables();
        const items = tables.templates.items;

        items[CustomMap.Aug762]._props.Slots[0]._props.filters[0].Filter = [CustomMap.Aug30Rd, CustomMap.Aug42Rd];

        items[CustomMap.Stm46]._props.Slots[1]._props.filters[0].Filter = [CustomMap.Stm33Rd, CustomMap.Stm50Rd];
        items[CustomMap.Stm46]._props.Slots[2]._props.filters[0].Filter = [CustomMap.StmRec];

        items[CustomMap.Mcm4]._props.Slots[1]._props.filters[0].Filter.push(CustomMap.Mag300);
        items[CustomMap.Mcm4]._props.Slots[1]._props.filters[0].Filter.push(CustomMap.Mag545);
        items[CustomMap.Mcm4]._props.Slots[1]._props.filters[0].Filter.push(CustomMap.Mag57);
        items[CustomMap.Mcm4]._props.Slots[1]._props.filters[0].Filter.push(CustomMap.Mag762);
        items[CustomMap.Mcm4]._props.Slots[1]._props.filters[0].Filter.push(CustomMap.Mag939);
        items[CustomMap.Mcm4]._props.Slots[2]._props.filters[0].Filter.push(CustomMap.Rec300);
        items[CustomMap.Mcm4]._props.Slots[2]._props.filters[0].Filter.push(CustomMap.Rec545);
        items[CustomMap.Mcm4]._props.Slots[2]._props.filters[0].Filter.push(CustomMap.Rec57);
        items[CustomMap.Mcm4]._props.Slots[2]._props.filters[0].Filter.push(CustomMap.Rec762);
        items[CustomMap.Mcm4]._props.Slots[2]._props.filters[0].Filter.push(CustomMap.Rec939);

        // Judge magazines - slot index may need game testing after switching clone base to SHOTGUN_SAIGA12
        items[CustomMap.Judge]._props.Slots[3]._props.filters[0].Filter = [
            CustomMap.Judge17Rd,
            CustomMap.Judge33Rd,
            CustomMap.Judge50Rd,
        ];
        // Judge receiver - verify slot index on Saiga-12 base
        items[CustomMap.Judge]._props.Slots[2]._props.filters[0].Filter = [CustomMap.JudgeSlide];

        items[CustomMap.Jury]._props.Slots[1]._props.filters[0].Filter = [
            CustomMap.Jury20Rd,
            CustomMap.Jury25Rd,
            CustomMap.Jury50Rd,
        ];
        items[CustomMap.Jury]._props.Slots[2]._props.filters[0].Filter = [CustomMap.JuryRec];

        // Executioner magazines - slot index may need game testing
        // Executioner magazines on M700 base - slot index needs game verification
        items[CustomMap.Exec]._props.Slots[1]._props.filters[0].Filter = [
            CustomMap.ExecAics,
            CustomMap.ExecPmag,
            CustomMap.ExecWyatt,
        ];
    }
}
