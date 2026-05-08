export default class ShipSheet extends shadowdark.sheets.PlayerSheetSD {

    /** @inheritdoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            scrollY: [".ds-col-flex"],
            width: 1100,
            height: 700,
            tabs: [],
        });
    }

    /** @inheritdoc */
    get template() {
        return "modules/darkspace/templates/actors/ship.hbs";
    }

    /** @override */
    async getData(options) {
        // Bypass PlayerSheetSD.getData() which assumes system.level exists.
        // Call ActorSheetSD.getData() directly, then add only what the ship template needs.
        const context = await shadowdark.sheets.ActorSheetSD.prototype.getData.call(this, options);

        // Fields required by the stats.hbs and hp.hbs partials
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

        // Resolve crew UUIDs to actor stubs
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

        // Resolve ship class UUID to name
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
    }

    async _onCrewRemove(event) {
        const uuid = event.currentTarget.closest("[data-uuid]")?.dataset.uuid;
        if (!uuid) return;
        const crew = this.actor.system.crew.filter(c => c.uuid !== uuid);
        await this.actor.update({ "system.crew": crew });
    }

    /** @override */
    async _onDrop(event) {
        const data = TextEditor.getDragEventData(event);
        if (data?.type === "Actor") {
            const actor = await fromUuid(data.uuid);
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
