import {PlayerSD} from "./SDBase.mjs";

export default class Spacer extends PlayerSD {
    static defineSchema() {
        const fields = foundry.data.fields;
        const schema = {
            ...super.defineSchema(),
            species: new fields.StringField({required: true,initial: "Glorp"}),
        };
        return schema
    }
}
