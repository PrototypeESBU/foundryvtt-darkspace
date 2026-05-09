import { ActorBaseSD } from "/systems/shadowdark/src/models/_ActorBaseSD.mjs";

export default class Ship extends ActorBaseSD {
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            crew: new fields.ArrayField(new fields.DocumentUUIDField()),
            class:   new fields.DocumentUUIDField(),
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
        this.attributes ??= {};
        this.attributes.acProjectile = acProjectile;
        this.attributes.acEnergy     = acEnergy;
    }
}
