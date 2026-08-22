import ActorBaseDS from "./ActorBaseDS.mjs";
import ShipClass from "./items/ShipClass.mjs";

const fields = foundry.data.fields;

// coins.gp > credits
// class > shipClass
// slots > Cargo
export default class Ship extends ActorBaseDS {

    static defineSchema() {
        return {
            ...super.defineSchema(),
            // Ships can run a negative credit balance to represent debt,
            // so gp has no minimum unlike the Shadowdark base schema.
            coins: new fields.SchemaField({
                gp: new fields.NumberField({ integer: true, initial: 0 }),
                sp: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
                cp: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
            }),
        };
    }

    // Crew is derived: a spacer belongs to this ship when its shipUuid points here.
    getCrew() {
        return game.actors.filter(a =>
            a.type === "darkspace.Spacer" && a.system.shipUuid === this.parent.uuid);
    }

    /**
     * Transfers credits from this ship, split evenly among its crew.
     * Each crew member receives an equal share; any remainder stays
     * aboard. The ship can go into debt to cover the transfer.
     * @param {number} credits - amount to transfer
     */
    async creditsToCrew(credits) {
        const amount = Math.floor(credits);
        if (!(amount > 0)) return;

        const crew = this.getCrew();
        if (!crew.length) {
            return ui.notifications.warn(game.i18n.localize("DARKSPACE.sheet.ship.credits.noCrew"));
        }

        const share = Math.floor(amount / crew.length);
        if (!share) return;

        for (const spacer of crew) {
            await spacer.update({ "system.coins.gp": spacer.system.coins.gp + share });
        }
        return this.parent.update({ "system.coins.gp": this.coins.gp - share * crew.length });
    }

    getCrewLevel() {
        const crew = this.getCrew();
        if (!crew.length) return 0;
        const total = crew.reduce((sum, a) => sum + (a.system?.level?.value ?? 0), 0);
        return Math.floor(total / crew.length);
    }

    /**
     * The ship's class item. Prefers the linked uuid, falling back to whichever
     * class item is embedded on the ship.
     * @returns {Promise<Item|null>}
     */
    async getShipClass() {
        const linked = this.class ? await fromUuid(this.class).catch(() => null) : null;
        return linked ?? this.parent.items.find(i => i.type === "darkspace.ShipClass") ?? null;
    }

    /**
     * A ship's level is always equal to or greater than the average Crew Level,
     * and only ever follows it upwards — a dropping CL leaves the ship as it is.
     */
    get needsLevelUp() {
        return this.getCrewLevel() > (this.level?.value ?? 0);
    }

    prepareBaseData() {
        super.prepareBaseData();

        // Both cargo values are calculated: the capacity is granted purely by
        // active effects, the load is the sum of the cargo aboard.
        this.cargo = {
            max: 0,
            value: 0,
        };
    }

    prepareDerivedData() {
        super.prepareDerivedData();

        let acProjectile = 0;
        let acEnergy = 0;
        for (const item of this.parent?.items ?? []) {
            if (item.type === "darkspace.ShipArmor") {
                acProjectile += item.system.acProjectile ?? 0;
                acEnergy     += item.system.acEnergy ?? 0;
            }
        }
        this.attributes.ac.projectile = acProjectile;
        this.attributes.ac.energy = acEnergy;

        this.cargo.value = this._getCargoValue();
    }

    get isPC() {
        return false;
    }

    /**
     * The cargo aboard the ship.
     * @returns {Item[]}
     */
    getCargoItems() {
        return (this.parent?.items ?? []).filter(i => i.type === "darkspace.Cargo");
    }

    _getCargoValue() {
        return this.getCargoItems().reduce((sum, i) => sum + (i.system.units ?? 1), 0);
    }
}
