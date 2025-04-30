import * as common from "./_fields/common.mjs";
import {bonuses} from "./_fields/bonuses.mjs";

const fields = foundry.data.fields;

function playerStat() {
    return new fields.SchemaField({
        base: new fields.NumberField({integer: true, initial: 10}),
        bonus: new fields.NumberField({integer: true, initial: 0}),
        mod: new fields.NumberField({integer: true, initial: 0, min: -4, max: 4}),
    })
}

function NPCStat() {
    return new fields.SchemaField({
        mod: new fields.NumberField({integer: true, initial: 0})
    })
}

export class PlayerSD extends foundry.abstract.TypeDataModel {
    static defineSchema() {
         const schema = {
            ...common.level(),
            ...common.notes(),
            ...bonuses(),
            abilities: new fields.SchemaField({
                str: playerStat(),
                dex: playerStat(),
                con: playerStat(),
                int: playerStat(),
                wis: playerStat(),
                cha: playerStat()
            }),
            ancestry: new fields.DocumentUUIDField(),
            attributes: new fields.SchemaField({
                ...common.ac(),
				hp: new fields.SchemaField({
                    ...common.hp(), 
					base: new fields.NumberField({ integer: true, initial: 0, min: 0}),
					bonus: new fields.NumberField({ integer: true, initial: 0, min: 0})
				})
			}),
            background: new fields.DocumentUUIDField(),
            class: new fields.DocumentUUIDField({initial: "Compendium.shadowdark.classes.Item.6LEKsG1HEw3dbo27"}),
            coins: new fields.SchemaField({
				gp: new fields.NumberField({ integer: true, initial: 0, min: 0}),
				sp: new fields.NumberField({ integer: true, initial: 0, min: 0}),
				cp: new fields.NumberField({ integer: true, initial: 0, min: 0})
			}),
            deity: new fields.DocumentUUIDField(),
            languages: new fields.ArrayField(new fields.DocumentUUIDField()),
            luck: new fields.SchemaField({
				remaining: new fields.NumberField({ integer: true, initial: 0, min: 0}),
				available: new fields.BooleanField({initial: false}),
			}),
            patron: new fields.DocumentUUIDField(),
            slots: new fields.NumberField({ integer: true, initial: 10, min: 0})
        };
        return schema;
    }

    prepareDerivedData() {
        super.prepareDerivedData();
        for (const ability of CONFIG.SHADOWDARK.ABILITY_KEYS) {
			const total = this.abilities[ability].base + this.abilities[ability].bonus;
            this.abilities[ability].total = total;
            this.abilities[ability].mod = Math.min(4,Math.max(-4, Math.floor((total-10)/2)));
		}
    }

}

export class NPCSD extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        const schema = {
            abilities: new fields.SchemaField({
                str: NPCStat,
                dex: NPCStat,
                con: NPCStat,
                int: NPCStat,
                wis: NPCStat,
                cha: NPCStat
            }),
            attributes: {
				hp: {
					hd: new fields.NumberField({ integer: true, initial: 0, min: 0}),
				}
			},
            darkAdapted: new fields.BooleanField({initial: false}),
            move: "",
            moveNote: new fields.StringField(),
            spellcastingAbility: "",
			spellcastingBonus: new fields.NumberField({ integer: true, initial: 0, min: 0}),
			spellcastingAttackNum: new fields.NumberField({ integer: true, initial: 0, min: 0}),
        };
        return foundry.utils.mergeObject(schema, super.defineSchema())
    }
}
