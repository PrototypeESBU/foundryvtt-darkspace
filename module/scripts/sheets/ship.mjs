export default class ShipSheet extends shadowdark.sheets.PlayerSheetSD {

    /** @inheritdoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            scrollY: [".SD-content-body"],
            width: 1100,
            height: 700,
            tabs: [{
                navSelector: ".SD-nav",
                contentSelector: ".SD-content-body",
                initial: "tab-systems",
            }],
        });
    }

    /** @inheritdoc */
    get template() {
        return "modules/darkspace/templates/actors/ship.hbs";
    }

    /** @override */
    async getData(options) {
        const context = await shadowdark.sheets.ActorSheetSD.prototype.getData.call(this, options);

        context.abilities    = this.actor.system.abilities;
        context.maxHp        = this.actor.system.attributes?.hp?.max ?? 0;
        context.editingHp    = this.editingHp ?? false;
        context.editingStats = this.editingStats ?? false;

        const items = this.actor.items;
        const shipTypes = new Set([
            "darkspace.Component", "darkspace.ShipArmor",
            "darkspace.ShipWeapon", "darkspace.ShipClass",
        ]);

        context.systems  = items.filter(i => i.type === "darkspace.Component" && i.system.type === "System");
        context.features = items.filter(i => i.type === "darkspace.Component" && i.system.type === "Feature");
        context.armor    = items.filter(i => i.type === "darkspace.ShipArmor");
        context.attacks  = items.filter(i => i.type === "darkspace.ShipWeapon");
        context.cargo    = items.filter(i => !shipTypes.has(i.type));

        context.crew = await Promise.all(
            (this.actor.system.crew ?? []).map(async c => {
                const actor = await fromUuid(c.uuid).catch(() => null);
                return {
                    uuid: c.uuid,
                    name: actor?.name ?? c.name,
                    img:  actor?.img ?? "icons/svg/mystery-man.svg",
                };
            })
        );

        if (this.actor.system.class) {
            const shipClass = await fromUuid(this.actor.system.class).catch(() => null);
            context.shipClassName = shipClass?.name ?? "";
            context.shipClassUuid = this.actor.system.class;
        }

        context.acProjectile = this.actor.system.attributes?.acProjectile ?? 0;
        context.acEnergy     = this.actor.system.attributes?.acEnergy ?? 0;

        return context;
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        if (!this.isEditable) return;

        html.find("[data-action=crew-remove]").click(event => this._onCrewRemove(event));

        html.find("[data-action=item-edit]").click(event => {
            const itemId = event.currentTarget.dataset.itemId;
            this.actor.items.get(itemId)?.sheet.render(true);
        });

        html.find("[data-action=toggle-online]").change(event => {
            const itemId = event.currentTarget.dataset.itemId;
            const item = this.actor.items.get(itemId);
            if (item) item.update({ "system.online": event.currentTarget.checked });
        });

        html.find("[data-action=toggle-damaged]").change(event => {
            const itemId = event.currentTarget.dataset.itemId;
            const item = this.actor.items.get(itemId);
            if (item) item.update({ "system.damaged": event.currentTarget.checked });
        });

        html.find("[data-action=ship-attack]").click(event => this._onShipAttack(event));
    }

    /** @override */
    async _onItemCreate(event) {
        event.preventDefault();
        const itemType = event.currentTarget.dataset.itemType;
        const subtype  = event.currentTarget.dataset.componentSubtype;

        const itemData = {
            name:   `New ${subtype ?? itemType.split(".")[1]}`,
            type:   itemType,
            system: subtype ? { type: subtype } : {},
        };

        const [newItem] = await this.actor.createEmbeddedDocuments("Item", [itemData]);
        newItem.sheet.render(true);
    }

    async _onCrewRemove(event) {
        const uuid = event.currentTarget.closest("[data-uuid]")?.dataset.uuid;
        if (!uuid) return;
        const crew = this.actor.system.crew.filter(c => c.uuid !== uuid);
        await this.actor.update({ "system.crew": crew });
    }

    async _onShipAttack(event) {
        event.preventDefault();
        const itemId = event.currentTarget.dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (!item) return;

        const formula = item.system.damage || "1d6";
        const roll = await new Roll(formula).evaluate();
        roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flavor: `${this.actor.name} fires ${item.name}`,
        });
    }

    /** @override */
    async _onDrop(event) {
        const data = TextEditor.getDragEventData(event);

        if (data?.type === "Item") {
            const item = await fromUuid(data.uuid).catch(() => null);
            if (item?.type === "darkspace.ShipClass") {
                await this.actor.update({ "system.class": data.uuid });
                return;
            }
        }

        if (data?.type === "Actor") {
            const actor = await fromUuid(data.uuid).catch(() => null);
            if (actor?.type === "darkspace.Spacer") {
                const crew = [...(this.actor.system.crew ?? [])];
                if (!crew.some(c => c.uuid === data.uuid)) {
                    crew.push({ uuid: data.uuid, name: actor.name });
                    await this.actor.update({ "system.crew": crew });
                }
                return;
            }
        }

        return super._onDrop(event);
    }
}
