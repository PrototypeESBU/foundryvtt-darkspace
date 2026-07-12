import { BaseItemSD } from "/systems/shadowdark/src/models/items/_BaseItemSD.mjs";

export default class ShipComponent extends BaseItemSD {

    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            type:     new fields.StringField({ initial: "System", choices: ["System", "Feature"] }),
            online:   new fields.BooleanField({ initial: true }),
            damaged:  new fields.BooleanField({ initial: false }),
            slots:    new fields.NumberField({ integer: true, initial: 1, min: 1 }),
        };
    }

    prepareDerivedData() {
        super.prepareDerivedData();
        if (this.damaged) this.online = false;
    }
}
