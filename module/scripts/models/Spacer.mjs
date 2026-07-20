import ActorBaseDS from "./ActorBaseDS.mjs";

export default class Spacer extends ActorBaseDS {
    static defineSchema() {
        const fields = foundry.data.fields;
        const schema = {
            motivation: new fields.StringField({ initial: "" }),
            shipUuid:      new fields.StringField({ initial: "" }),
            shipRoleUuids: new fields.ArrayField(new fields.StringField({ initial: "" })),
            bounty:     new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
            player:     new fields.StringField({ initial: "" }),
        };
        return Object.assign(super.defineSchema(), schema);
    }

    /**
     * Transfers credits from this spacer to their assigned ship.
     * The transfer is capped at the spacer's current credits.
     * @param {number} credits - amount to transfer
     */
    async creditsToShip(credits) {
        const amount = Math.min(Math.floor(credits), this.coins.gp);
        if (!(amount > 0)) return;

        const ship = await fromUuid(this.shipUuid).catch(() => null);
        if (!ship) {
            return ui.notifications.warn(game.i18n.localize("DARKSPACE.sheet.spacer.credits.noShip"));
        }

        await ship.update({ "system.coins.gp": ship.system.coins.gp + amount });
        return this.parent.update({ "system.coins.gp": this.coins.gp - amount });
    }

    // -----------------------------------------------
    // Function Overrides
    // -----------------------------------------------

    async getAncestry() {
        return this.parent.items.find(i => i.type === "Ancestry") ?? null;
    }

    async getClass() {
        return this.parent.items.find(i => i.type === "Class") ?? null;
    }

    async getBackground() {
        return this.parent.items.find(i => i.type === "Background") ?? null;
    }

    async addAncestry(item) {
        // Mirrors the character generator: talents are only fixed when there
        // are no more of them than the choice count, otherwise they are picks
        const talents = item.system.talents ?? [];
        const fixed = talents.length <= item.system.talentChoiceCount ? talents : [];
        return this.#replaceEmbeddedIdentity(item, "ancestry", fixed);
    }

    async addClass(item) {
        return this.#replaceEmbeddedIdentity(item, "class", item.system.talents ?? []);
    }

    async addBackground(item) {
        return this.#replaceEmbeddedIdentity(item);
    }

    // -----------------------------------------------
    // Private Functions
    // -----------------------------------------------

    /**
     * Replaces any existing embedded item of the same type, and the talents
     * it granted, with the new item and its fixed talents.
     * @param {Item} item - the dropped Ancestry/Class/Background item
     * @param {string} [talentClass] - talentClass granted talents are tagged with
     * @param {string[]} [talentUuids] - fixed talents to embed alongside the item
     */
    async #replaceEmbeddedIdentity(item, talentClass, talentUuids=[]) {
        const oldIds = this.parent.items
            .filter(i => i.type === item.type
                || (talentClass && i.type === "Talent" && i.system.talentClass === talentClass))
            .map(i => i.id);

        const newItems = [item.toObject()];
        for (const uuid of talentUuids) {
            const talent = await fromUuid(uuid);
            if (!talent) continue;
            const talentObj = await shadowdark.effects.createItemWithEffect(talent);
            if (!talentObj) continue;
            talentObj.system.talentClass = talentClass;
            newItems.push(talentObj);
        }

        if (oldIds.length) await this.parent.deleteEmbeddedDocuments("Item", oldIds);
        return this.parent.createEmbeddedDocuments("Item", newItems);
    }
}
