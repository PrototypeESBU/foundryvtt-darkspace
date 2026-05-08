import { BaseItemSD } from "/systems/shadowdark/src/models/items/_BaseItemSD.mjs";

export default class ShipClass extends BaseItemSD {
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            hullSize:     new fields.StringField({ initial: "Light" }),
            crewMin:      new fields.NumberField({ integer: true, initial: 1, min: 1 }),
            crewMax:      new fields.NumberField({ integer: true, initial: 4, min: 1 }),
            systemSlots:  new fields.NumberField({ integer: true, initial: 10, min: 0 }),
            featureSlots: new fields.NumberField({ integer: true, initial: 10, min: 0 }),
            cargoSlots:   new fields.NumberField({ integer: true, initial: 40, min: 0 }),
        };
    }
}
