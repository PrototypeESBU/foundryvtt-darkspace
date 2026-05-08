import { ActorBaseSD } from "/systems/shadowdark/src/models/_ActorBaseSD.mjs";

export default class Ship extends ActorBaseSD {
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            crew: new fields.ArrayField(
                new fields.SchemaField({
                    uuid: new fields.StringField({ initial: "" }),
                    name: new fields.StringField({ initial: "" }),
                })
            ),
            class:   new fields.DocumentUUIDField(),
            credits: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
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
