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

    // Damage is stored as a free-form roll formula rather than a
    // WEAPON_BASE_DAMAGE key, so display the formulas directly.
    get subtext() {
        const type = game.i18n.localize(CONFIG.SHADOWDARK.WEAPON_TYPES[this.type]).titleCase();
        const range = game.i18n.localize(CONFIG.SHADOWDARK.RANGES[this.range]);
        const damageDice = [this.damage.oneHanded, this.damage.twoHanded].filter(Boolean).join(", ");
        const properties = this.propertyNames.filter(Boolean).map(p => p.titleCase()).join(", ");
        return [type, range, damageDice, properties].filter(Boolean).join(" • ");
    }

    get requiresAmmo() {
        return this.hasProperty("Ammo");
    }

    get requiresEnergy() {
        return this.hasProperty("Energy Cell");
    }
}
