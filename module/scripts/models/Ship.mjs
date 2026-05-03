import { ActorBaseSD } from "/systems/shadowdark/src/models/_ActorBaseSD.mjs";
export default class Ship extends ActorBaseSD {
    static defineSchema() {
        const fields = foundry.data.fields;
        const schema = {
            crew: new fields.ObjectField({initial: 0}),
            class: new fields.DocumentUUIDField()
        };
        return schema;
    }
}