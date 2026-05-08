import { default as PlayerSD } from "/systems/shadowdark/src/models/PlayerSD.mjs";

export default class Spacer extends PlayerSD {
    static defineSchema() {
        const fields = foundry.data.fields;
        const schema = {
            motivation: new fields.StringField({ initial: "" }),
            shipUuid:   new fields.StringField({ initial: "" }),
            shipRoles:  new fields.ArrayField(new fields.StringField({ initial: "" })),
            bounty:     new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
            player:     new fields.StringField({ initial: "" }),
        };
        return Object.assign(super.defineSchema(), schema);
    }
}
