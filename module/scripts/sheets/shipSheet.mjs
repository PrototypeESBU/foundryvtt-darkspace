const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export default class ShipSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

    constructor(object, options) {
		super(object, options);

		this.editingHp = false;
		this.editingStats = false;
	}

    static DEFAULT_OPTIONS = {
        classes: ["darkspace", "ship"],
        position: { width: 1100, height: 700 },
        form: {
            handler: ShipSheet.#onSubmit,
            submitOnChange: true,
        },
        actions: {
            "roll-ability-check": ShipSheet.#onRollAbilityCheck,
            "item-create":       ShipSheet.#onItemCreate,
            "item-edit":         ShipSheet.#onItemEdit,
            "item-delete":       ShipSheet.#onItemDelete,
            "crew-open":         ShipSheet.#onCrewOpen,
            "item-attack":       ShipSheet.#onItemAttack,
            "edit-sheet":        ShipSheet.#onEditSheet,
        },
    };

    static PARTS = {
        sidebar: { template: "modules/darkspace/templates/actors/ship/sidebar.hbs" },
        tabs:    { template: "templates/generic/tab-navigation.hbs" },
        crew:    { template: "modules/darkspace/templates/actors/ship/_partials/tab-crew.hbs",    scrollable: [""] },
        systems: { template: "modules/darkspace/templates/actors/ship/_partials/tab-systems.hbs", scrollable: [""] },
        cargo:   { template: "modules/darkspace/templates/actors/ship/_partials/tab-cargo.hbs",   scrollable: [""] },
        notes:   { template: "modules/darkspace/templates/actors/partials/tab-notes.hbs",          scrollable: [""] },
    };

    static TABS = {
        primary: {
            tabs: [{ id: "crew" }, { id: "systems" }, { id: "cargo" }, { id: "notes" }],
            initial: "crew",
            labelPrefix: "DARKSPACE.sheet.ship.tab",
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

        context.actor = this.actor;
        const system = this.actor.system;
        context.system = system;
        context.owner = this.actor.isOwner;
        context.editingHp = this.editingHp;
        context.editingStats = this.editingStats;
        context.maxHp = system.attributes?.hp?.max ?? 0;

        const items = this.actor.items;
        const shipTypes = new Set([
            "darkspace.ShipArmor",
            "darkspace.ShipClass",
            "darkspace.ShipComponent",
            "darkspace.ShipRole",
            "darkspace.ShipWeapon",
        ]);

        context.systems   = items.filter(i => i.type === "darkspace.ShipComponent" && i.system.type === "System");
        context.features  = items.filter(i => i.type === "darkspace.ShipComponent" && i.system.type === "Feature");
        context.armor     = items.filter(i => i.type === "darkspace.ShipArmor");
        context.weapons   = items.filter(i => i.type === "darkspace.ShipWeapon");
        context.attacks   = await system.getAttacks();
        context.cargo     = items.filter(i => !shipTypes.has(i.type));

        Object.assign(context, await this.#prepareCrewContext());

        context.shipClass    = (system.class ? await fromUuid(system.class).catch(() => null) : null)
            ?? items.find(i => i.type === "darkspace.ShipClass") ?? null;
        context.acProjectile = system.attributes?.acProjectile ?? 0;
        context.acEnergy     = system.attributes?.acEnergy     ?? 0;

        context.notesHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
            system.notes ?? "",
            { async: true, relativeTo: this.actor }
        );
        return context;
    }

    async #prepareCrewContext() {

        const shipRoles  = this.actor.items.filter(i => i.type === "darkspace.ShipRole");
        const crewActors = this.actor.system.getCrew();

        const crew = await Promise.all(crewActors.map(async (a) => {
            const archetypeObj  = await a.system?.getClass?.() ?? null;
            const backgroundObj = await a.system?.getBackground?.() ?? null;
            const roleUuids     = a.system?.shipRoleUuids ?? [];
            return {
                uuid:       a.uuid,
                name:       a.name ?? "Unknown",
                img:        a.img  ?? "icons/svg/mystery-man.svg",
                level:      a.system?.level?.value ?? 0,
                hp: {
                    value: a.system?.attributes?.hp?.value ?? 0,
                    max:   a.system?.attributes?.hp?.max   ?? 0,
                },
                archetype:  archetypeObj?.name  ?? "",
                background: backgroundObj?.name ?? "",
                roles:      shipRoles.filter(r => roleUuids.includes(r.uuid)).map(r => r.name),
            };
        }));

        // Role rows: one assignee per role, resolved from whichever crew member holds it.
        const roles = shipRoles.map(role => {
            const holder = crewActors.find(a => (a.system?.shipRoleUuids ?? []).includes(role.uuid));
            return {
                roleUuid:   role.uuid,
                roleId:     role.id,
                roleName:   role.name,
                spacerUuid: holder?.uuid ?? "",
                spacerName: holder?.name ?? "",
            };
        });

        return { shipRoles, crew, roles };
    }

    /** @override */
    _onRender(context, options) {
        super._onRender(context, options);

        if (!this.isEditable) return;

        // Right-click menu on crew cards
        new foundry.applications.ux.ContextMenu.implementation(
            this.element,
            ".ds-crew-card",
            this.#getCrewContextOptions(),
            { jQuery: false }
        );

        // Change events — AppV2 action system handles clicks only
        this.element.querySelectorAll("[data-action=role-spacer-change]").forEach(el => {
            el.addEventListener("change", event => this.#onRoleSpacerChange(event));
        });
        this.element.querySelectorAll("[data-action=toggle-online]").forEach(el => {
            el.addEventListener("change", event => {
                const item = this.actor.items.get(el.dataset.itemId);
                if (item) item.update({ "system.online": event.currentTarget.checked });
            });
        });
        this.element.querySelectorAll("[data-action=toggle-damaged]").forEach(el => {
            el.addEventListener("change", event => {
                const item = this.actor.items.get(el.dataset.itemId);
                if (item) item.update({ "system.damaged": event.currentTarget.checked });
            });
        });

        // Credits input — plain number sets, +/- prefix adjusts
        const creditsInput = this.element.querySelector(".ds-credits-input");
        if (creditsInput) {
            creditsInput.addEventListener("focus", (e) => {e.currentTarget.value = "";});
            creditsInput.addEventListener("blur", (e) => {e.currentTarget.value = e.currentTarget.dataset.value;});
            creditsInput.addEventListener("keyup", event => this.#onInputCredits(event));
        }
    }

    // -----------------------------------------------
    // Action Handlers (static, click events)
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

    static async #onItemCreate(event, target) {
        const itemType = target.dataset.itemType;
        const subtype  = target.dataset.componentSubtype;
        const itemData = {
            name:   `New ${subtype ?? itemType.split(".")[1]}`,
            type:   itemType,
            system: subtype ? { type: subtype } : {},
        };
        const [newItem] = await this.actor.createEmbeddedDocuments("Item", [itemData]);
        newItem.sheet.render(true);
    }

    static #onItemEdit(event, target) {
        this.actor.items.get(target.dataset.itemId)?.sheet.render(true);
    }

    static async #onItemDelete(event, target) {
        const itemId = target.dataset.itemId;
        const item   = this.actor.items.get(itemId);
        if (!item) return;
        if (item.type === "darkspace.ShipRole") await this.#unassignRoleFromCrew(item.uuid);
        item.delete();
    }

    // -----------------------------------------------
    // Context menu (crew cards)
    // -----------------------------------------------

    #getCrewContextOptions() {
        return [
            {
                name: "Remove from crew",
                icon: '<i class="fas fa-trash"></i>',
                callback: element => this.#removeCrew(element.dataset.uuid),
            },
        ];
    }

    async #removeCrew(uuid) {
        if (!uuid) return;
        const spacer = await fromUuid(uuid).catch(() => null);
        if (spacer) {
            await spacer.update({ "system.shipUuid": "", "system.shipRoleUuids": [] });
            // Crew is derived from the spacer, so the ship document is unchanged — re-render manually.
            this.render();
        }
    }

    static async #onCrewOpen(event, target) {
        const uuid   = target.closest("[data-uuid]")?.dataset.uuid;
        if (!uuid) return;
        const spacer = await fromUuid(uuid).catch(() => null);
        spacer?.sheet.render(true);
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

    // -----------------------------------------------
    // Instance handler (change event, needs closure)
    // -----------------------------------------------

    async #onInputCredits(event) {
        if (event.keyCode !== 13) return;
        await this.actor.system.adjustCredits(event.currentTarget.value);
    }

    async #onRoleSpacerChange(event) {
        const roleUuid = event.currentTarget.dataset.roleUuid;
        const newUuid  = event.currentTarget.value;
        // A role has a single assignee: grant it to the chosen spacer, revoke from the rest.
        for (const spacer of this.actor.system.getCrew()) {
            const roleUuids = spacer.system.shipRoleUuids ?? [];
            const has       = roleUuids.includes(roleUuid);
            const should    = spacer.uuid === newUuid;
            if (has === should) continue;
            const next = should ? [...roleUuids, roleUuid] : roleUuids.filter(u => u !== roleUuid);
            await spacer.update({ "system.shipRoleUuids": next });
        }
        // Role assignments live on the spacer, so the ship document is unchanged — re-render manually.
        this.render();
    }

    /** Strip a role from every crew member that currently holds it. */
    async #unassignRoleFromCrew(roleUuid) {
        for (const spacer of this.actor.system.getCrew()) {
            const roleUuids = spacer.system.shipRoleUuids ?? [];
            if (roleUuids.includes(roleUuid)) {
                await spacer.update({ "system.shipRoleUuids": roleUuids.filter(u => u !== roleUuid) });
            }
        }
    }

    // -----------------------------------------------
    // Drag & Drop
    // -----------------------------------------------

    /** @override */
    async _onDropActor(event, actor) {
        if (!this.actor.isOwner) return null;
        if (actor?.type !== "darkspace.Spacer") return null;
        // Assigning to this ship moves the spacer off any previous one and clears stale roles.
        if (actor.system.shipUuid !== this.actor.uuid) {
            await actor.update({ "system.shipUuid": this.actor.uuid, "system.shipRoleUuids": [] });
            // Crew is derived from the spacer, so the ship document is unchanged — re-render manually.
            this.render();
        }
        return actor;
    }

    /** @override */
    async _onDropItem(event, item) {
        if (!this.actor.isOwner) return null;

        if (item.type === "darkspace.ShipClass") {
            const existing = this.actor.items.find(i => i.type === "darkspace.ShipClass");
            if (existing) {
                const confirmed = await foundry.applications.api.DialogV2.confirm({
                    window: { title: "DARKSPACE.sheet.ship.class.replaceTitle" },
                    content: `<p>${game.i18n.format("DARKSPACE.sheet.ship.class.replaceContent", {
                        current: existing.name,
                        new:     item.name,
                    })}</p>`,
                });
                if (!confirmed) return null;
                await existing.delete();
            }
            const [newItem] = await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
            await this.actor.update({ "system.class": newItem.uuid });
            return newItem;
        }

        if (item.type === "darkspace.ShipRole") {
            const [newItem] = await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
            return newItem;
        }

        if (item.type === "darkspace.ShipComponent") {
            const [newItem] = await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
            return newItem;
        }

        return super._onDropItem(event, item);
    }
}
