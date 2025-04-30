import {PlayerSD} from "./SDBase.mjs";

export default class Ship extends PlayerSD {
    static defineSchema() {
        const fields = foundry.data.fields;
        const schema = {
            crew: new fields.ObjectField({initial: null}),
            class: new fields.DocumentUUIDField({initial: null})
        };
        return schema;
    }
}