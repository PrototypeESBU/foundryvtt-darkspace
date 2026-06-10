import { BaseItemSD } from "/systems/shadowdark/src/models/items/_BaseItemSD.mjs";

export default class Cargo extends BaseItemSD {

    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            units: new fields.NumberField({ integer: true, initial: 1, min: 1 }),
        };
    }
}
