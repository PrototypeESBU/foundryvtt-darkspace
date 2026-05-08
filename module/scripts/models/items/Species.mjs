import AncestrySD from "/systems/shadowdark/src/models/items/AncestrySD.mjs";

export default class Species extends AncestrySD {
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            traits: new fields.HTMLField(),
        };
    }

    get isSpecies() {
        true;
    }
}
