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

    // -----------------------------------------------
    // Compatibility with the PlayerSD attack machinery
    // (getAttacks / rollAttack)
    // -----------------------------------------------

    get equipped() {
        return true;
    }

    get handedness() {
        return "1h";
    }

    get isFinesse() {
        return false;
    }

    get isThrown() {
        return false;
    }

    get isWeapon() {
        return true;
    }

    get type() {
        return "ranged";
    }

    get subtext() {
        const energy = this.energyCost ? `Energy ${this.energyCost}` : "";
        return [this.damageType, this.range, energy].filter(Boolean).join(" • ");
    }

    getDamageFormula(handedness = this.handedness) {
        return this.damage;
    }
}
