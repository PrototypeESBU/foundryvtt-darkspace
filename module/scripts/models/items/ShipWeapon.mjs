import { BaseItemSD } from "/systems/shadowdark/src/models/items/_BaseItemSD.mjs";

export default class ShipWeapon extends BaseItemSD {
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            damageType: new fields.StringField({
                choices: ["Projectile", "Energy"], initial: "Projectile",
            }),
            damage:     new fields.StringField({ initial: "1d6" }),
            range:      new fields.StringField({ initial: "" }),
            energyCost: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
        };
    }
}
