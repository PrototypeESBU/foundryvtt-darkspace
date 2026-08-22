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
            // Credits to buy the component outright, and to repair it once
            // damaged. Both are per the component's entry in Ship Components.
            cost: new fields.SchemaField({
                initial: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
                repair:  new fields.NumberField({ integer: true, initial: 0, min: 0 }),
            }),
        };
    }

    prepareDerivedData() {
        super.prepareDerivedData();
        if (this.damaged) this.online = false;
    }
}
