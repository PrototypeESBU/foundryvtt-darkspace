import { BaseItemSD } from "/systems/shadowdark/src/models/items/_BaseItemSD.mjs";

export default class ShipArmor extends BaseItemSD {
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            acProjectile: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
            acEnergy:     new fields.NumberField({ integer: true, initial: 0, min: 0 }),
        };
    }
}
