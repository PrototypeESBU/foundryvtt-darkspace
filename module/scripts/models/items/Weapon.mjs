import WeaponSD from "/systems/shadowdark/src/models/items/WeaponSD.mjs";

export default class Weapon extends WeaponSD {
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            damageType: new fields.StringField({
                choices: ["Melee", "Projectile", "Energy"],
                initial:  "Melee",
            }),
            size: new fields.StringField({
                choices: ["", "Light", "Medium", "Heavy"],
                initial:  "",
                blank:    true,
            }),
        };
    }

    get requiresAmmo() {
        return this.hasProperty("Ammo");
    }

    get requiresEnergy() {
        return this.hasProperty("Energy Cell");
    }
}
