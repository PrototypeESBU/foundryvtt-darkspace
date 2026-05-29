import { BaseItemSD } from "/systems/shadowdark/src/models/items/_BaseItemSD.mjs";

export default class ShipClass extends BaseItemSD {

    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            systemSlots:  new fields.NumberField({ integer: true, initial: 0, min: 0 }),
            featureSlots: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
            hpDie:        new fields.StringField({ initial: "d6", choices: ["d4", "d6", "d8"] }),
            freeComponents: new fields.ArrayField(new fields.DocumentUUIDField({ type: "Item" })),
            classTalents:  new fields.ArrayField(new fields.DocumentUUIDField({ type: "Item" })),
            talentTable:  new fields.DocumentUUIDField({ type: "RollTable" }),
        };
    }
}
