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
        };
    }

    // Crew is derived: a spacer belongs to this ship when its shipUuid points here.
    getCrew() {
        return game.actors.filter(a =>
            a.type === "darkspace.Spacer" && a.system.shipUuid === this.parent.uuid);
    }

    getCrewLevel() {
        const crew = this.getCrew();
        if (!crew.length) return 0;
        const total = crew.reduce((sum, a) => sum + (a.system?.level?.value ?? 0), 0);
        return Math.floor(total / crew.length);
    }

    prepareBaseData() {
        super.prepareBaseData();

        //set max cargo
        this.cargo = {
            max: 0,
            value: this._getCargoValue()
        }
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
    }

    get isPC() {
        return false;
    }

    _getCargoValue() {
        //TODO 
        return 0;
    }
}
