import { BaseItemSD } from "/systems/shadowdark/src/models/items/_BaseItemSD.mjs";
export default class Component extends BaseItemSD {
    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            type: new fields.StringField({
                choices: ["System","Feature"], initial: "System", nullable: false
            }),
            online: new fields.BooleanField({initial: true}),
            damaged: new fields.BooleanField({initial: false}),
            slots: new fields.NumberField({initial: 1}),
        };
    }

    prepareDerivedData() {
        this.online = !this.damaged;
      }
}