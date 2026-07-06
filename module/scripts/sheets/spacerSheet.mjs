const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export default class SpacerSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

    constructor(object, options) {
        super(object, options);

        this.editingHp = false;
        this.editingStats = false;
    }

    static DEFAULT_OPTIONS = {
        classes: ["darkspace", "spacer"],
        position: { width: 1000, height: 700 },
        window: { resizable: true },
        form: {
            handler: SpacerSheet.#onSubmit,
            submitOnChange: true,
        },
        actions: {
            "roll-ability-check": SpacerSheet.#onRollAbilityCheck,
            "item-attack":     SpacerSheet.#onItemAttack,
            "item-create":     SpacerSheet.#onItemCreate,
            "item-edit":       SpacerSheet.#onItemEdit,
            "item-delete":     SpacerSheet.#onItemDelete,
            "edit-sheet":      SpacerSheet.#onEditSheet,
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
    _getHeaderControls() {
        const controls = super._getHeaderControls();
        controls.push({
            icon: "fa-solid fa-pen-to-square",
            label: "DARKSPACE.sheet.editSheet",
            action: "edit-sheet",
            ownership: "OWNER",
        });
        return controls;
    }

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
        context.editingHp    = this.editingHp;
        context.maxHp        = system.attributes?.hp?.max ?? 0;
        context.editingStats = this.editingStats;

        // Item lists
        const items         = actor.items.contents;
        const physicalItems = system.getPhysicalItems(); // isPhysical && !stashed
        context.inventory = {
            equipped: physicalItems.filter(i => i.system.equipped),
            carried:  physicalItems.filter(i => !i.system.equipped),
            stashed:  system.getStashedItems(),
        };
        const talentItems = items.filter(i => i.type === "Talent");
        context.talents = {
            species:   talentItems.filter(i => i.system.talentClass === "ancestry"),
            archetype: talentItems.filter(i => i.system.talentClass === "class"),
            level:     talentItems.filter(i => !["ancestry", "class"].includes(i.system.talentClass)),
        };
        context.attacks          = await system.getAttacks();
        context.slots            = system.getSlotUsage();
        context.gearSlots        = system.slots;
        context.slotsOverCapacity = context.slots.total > context.gearSlots;

        // Species, archetype and background are embedded items
        context.archetype  = await system.getClass();
        context.species    = await system.getAncestry();
        context.background = await system.getBackground();

        context.shipRoles = [];
        if (system.shipUuid) {
            const ship       = await fromUuid(system.shipUuid).catch(() => null);
            context.shipName = ship?.name ?? "";
            context.shipId   = system.shipUuid;
            const roleUuids  = system.shipRoleUuids ?? [];
            if (ship) {
                context.shipRoles = ship.items
                    .filter(i => i.type === "darkspace.ShipRole" && roleUuids.includes(i.uuid))
                    .map(i => i.name);
            }
        }

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

        if (!this.isEditable) return;

        // Credits input — plain number sets, +/- prefix adjusts
        const creditsInput = this.element.querySelector(".ds-credits-input");
        if (creditsInput) {
            creditsInput.addEventListener("focus", (e) => {e.currentTarget.value = "";});
            creditsInput.addEventListener("blur", (e) => {e.currentTarget.value = e.currentTarget.dataset.value;});
            creditsInput.addEventListener("keyup", event => this.#onInputCredits(event));
        }
    }

    /** Lock width — only allow vertical resizing. */
    setPosition(position = {}) {
        if (position.width !== undefined) position.width = 1000;
        return super.setPosition(position);
    }

    // -----------------------------------------------
    // Drag & Drop
    // -----------------------------------------------

    /** @override */
    async _onDropItem(event, item) {
        if (!this.actor.isOwner) return null;

        // Species, archetype and background replace any existing one
        if (item.type === "Ancestry")   return this.actor.system.addAncestry(item);
        if (item.type === "Class")      return this.actor.system.addClass(item);
        if (item.type === "Background") return this.actor.system.addBackground(item);

        return super._onDropItem(event, item);
    }

    // -----------------------------------------------
    // Action Handlers
    // -----------------------------------------------

    static async #onSubmit(event, form, formData) {
        await this.document.update(formData.object);
    }

    static #onEditSheet(event, target) {
        this.editingHp = !this.editingHp;
        this.editingStats = !this.editingStats;
        this.render();
    }

    static #onRollAbilityCheck(event, target) {
        const ability = target.dataset.ability;
        if (!ability) return;
        // skip roll prompt if shift clicked
        this.actor.system.rollStatCheck(ability, { skipPrompt: event.shiftKey });
    }

    static #onItemAttack(event, target) {
        const data = {
            skipPrompt: event.shiftKey, // skip roll prompt if shift clicked
        };
        if (target.dataset.attackType) {
            data.attack = { type: target.dataset.attackType };
        }
        this.actor.system.rollAttack(target.dataset.itemId, data);
    }

    static #onItemCreate(event, target) {
        const types = target.dataset.itemTypes?.split(",")
            ?? ["Armor", "Basic", "Gem", "Potion", "Scroll", "Wand", "Weapon"];
        Item.createDialog(
            { type: target.dataset.itemType },
            { parent: this.actor },
            { types }
        );
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

    // -----------------------------------------------
    // Instance handler (change event, needs closure)
    // -----------------------------------------------

    async #onInputCredits(event) {
        if (event.keyCode !== 13) return;
        await this.actor.system.adjustCredits(event.currentTarget.value);
    }
}
