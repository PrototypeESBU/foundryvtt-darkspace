import { ActorBaseSD } from "/systems/shadowdark/src/models/_ActorBaseSD.mjs";
import ShipClass from "./items/ShipClass.mjs";

const fields = foundry.data.fields;

// coins.gp > credits
// class > shipClass
// slots > Cargo
export default class Ship extends PlayerSD {
    static defineSchema() {
        return {
            ...super.defineSchema(),
            roles:     new fields.ArrayField(new fields.SchemaField({
                roleId:     new fields.StringField({ initial: "" }),
                spacerUuid: new fields.StringField({ initial: "" }),
            })),
        };
    }

    async getCrew() {
        return Promise.all((this.crew ?? []).map(uuid => fromUuid(uuid).catch(() => null)));
    }

    async getCrewLevel() {
        const crew = (await this.getCrew()).filter(a => a !== null);
        if (!crew.length) return 0;
        const total = crew.reduce((sum, a) => sum + (a.system?.level?.value ?? 0), 0);
        return Math.floor(total / crew.length);
    }

    prepareBaseData() {
        //set max cargo
        this.cargo.max = 0;
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

    get isPlayer() {
        return false;
    }
}
