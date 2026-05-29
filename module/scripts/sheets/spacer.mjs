const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export default class SpacerSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

    static DEFAULT_OPTIONS = {
        classes: ["darkspace", "spacer"],
        position: { width: 1000, height: 700 },
        form: {
            handler: SpacerSheet.#onSubmit,
            submitOnChange: true,
        },
        actions: {
            "item-create":     SpacerSheet.#onItemCreate,
            "item-edit":       SpacerSheet.#onItemEdit,
            "item-delete":     SpacerSheet.#onItemDelete,
            "toggle-equipped": SpacerSheet.#onToggleEquipped,
            "toggle-stashed":  SpacerSheet.#onToggleStashed,
        },
    };

    static PARTS = {
        sidebar: { template: "modules/darkspace/templates/actors/spacer/sidebar.hbs" },
        tabs:    { template: "templates/generic/tab-navigation.hbs" },
        details: { template: "modules/darkspace/templates/actors/spacer/_partials/tab-details.hbs",  scrollable: [""] },
        gear:    { template: "modules/darkspace/templates/actors/spacer/_partials/tab-gear.hbs",     scrollable: [""] },
        talents: { template: "modules/darkspace/templates/actors/spacer/_partials/tab-talents.hbs",  scrollable: [""] },
        notes:   { template: "modules/darkspace/templates/actors/partials/tab-notes.hbs",             scrollable: [""] },
    };

    static TABS = {
        primary: {
            tabs: [{ id: "details" }, { id: "gear" }, { id: "talents" }, { id: "notes" }],
            initial: "details",
            labelPrefix: "DARKSPACE.sheet.spacer.tab",
        },
    };

    /** @override */
    async _preparePartContext(partId, context, options) {
        await super._preparePartContext(partId, context, options);
        if (partId in context.tabs) context.tab = context.tabs[partId];
        return context;
    }

    /** @override */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const actor   = this.actor;
        const system  = actor.system;

        context.actor        = actor;
        context.system       = system;
        context.owner        = actor.isOwner;
        context.abilities    = system.abilities;
        context.editingHp    = false;
        context.maxHp        = system.attributes?.hp?.max ?? 0;
        context.editingStats = false;

        // Item lists
        const items         = actor.items.contents;
        const physicalItems = system.getPhysicalItems(); // isPhysical && !stashed
        context.inventory = {
            equipped: physicalItems.filter(i => i.system.equipped),
            carried:  physicalItems.filter(i => !i.system.equipped),
            stashed:  system.getStashedItems(),
        };
        context.talents          = items.filter(i => i.type === "Talent");
        context.slots            = system.getSlotUsage();
        context.gearSlots        = system.slots;
        context.slotsOverCapacity = context.slots.total > context.gearSlots;

        // Darkspace-specific lookups
        if (system.class) {
            const archetype        = await fromUuid(system.class).catch(() => null);
            context.archetypeName  = archetype?.name ?? "";
            context.archetypeUuid  = system.class;
        }

        if (system.ancestry) {
            const species        = await fromUuid(system.ancestry).catch(() => null);
            context.speciesName  = species?.name ?? "";
            context.speciesUuid  = system.ancestry;
        }

        if (system.shipUuid) {
            const ship       = await fromUuid(system.shipUuid).catch(() => null);
            context.shipName = ship?.name ?? "";
            context.shipId   = system.shipUuid;
        }

        context.shipRoles = system.shipRoles ?? [];

        context.notesHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
            system.notes ?? "",
            { async: true, relativeTo: actor }
        );

        context.motivationChoices = [
            { value: "survivor", label: game.i18n.localize("DARKSPACE.motivation.survivor") },
            { value: "vile",     label: game.i18n.localize("DARKSPACE.motivation.vile") },
            { value: "virtuous", label: game.i18n.localize("DARKSPACE.motivation.virtuous") },
        ].map(m => ({ ...m, selected: system.motivation === m.value }));

        return context;
    }

    /** @override */
    _onRender(context, options) {
        super._onRender(context, options);
    }

    // -----------------------------------------------
    // Action Handlers
    // -----------------------------------------------

    static async #onSubmit(event, form, formData) {
        await this.document.update(formData.object);
    }

    static #onItemCreate(event, target) {
        const type = target.dataset.itemType ?? "Item";
        this.actor.createEmbeddedDocuments("Item", [{ name: game.i18n.localize("DARKSPACE.sheet.newItem"), type }]);
    }

    static #onItemEdit(event, target) {
        this.actor.items.get(target.dataset.itemId)?.sheet.render(true);
    }

    static async #onItemDelete(event, target) {
        this.actor.items.get(target.dataset.itemId)?.delete();
    }

    static async #onToggleEquipped(event, target) {
        const item = this.actor.items.get(target.dataset.itemId);
        await item?.update({ "system.equipped": !item.system.equipped, "system.stashed": false });
    }

    static async #onToggleStashed(event, target) {
        const item = this.actor.items.get(target.dataset.itemId);
        await item?.update({ "system.stashed": !item.system.stashed, "system.equipped": false });
    }
}
