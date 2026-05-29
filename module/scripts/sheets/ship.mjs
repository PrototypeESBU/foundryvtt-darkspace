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
            "item-create":       ShipSheet.#onItemCreate,
            "item-edit":         ShipSheet.#onItemEdit,
            "item-delete":       ShipSheet.#onItemDelete,
            "crew-remove":       ShipSheet.#onCrewRemove,
            "ship-class-remove": ShipSheet.#onShipClassRemove,
            "role-remove":       ShipSheet.#onRoleRemove,
            "ship-attack":       ShipSheet.#onShipAttack,
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
    async _preparePartContext(partId, context, options) {
        await super._preparePartContext(partId, context, options);
        if (partId in context.tabs) context.tab = context.tabs[partId];
        return context;
    }

    /** @override */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        context.actor        = this.actor;
        context.system       = this.actor.system;

        const items = actor.items;
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
        context.attacks   = items.filter(i => i.type === "darkspace.ShipWeapon");
        context.cargo     = items.filter(i => !shipTypes.has(i.type));

        Object.assign(context, await this.#prepareCrewContext(system, items));

        context.shipClass    = system.shipClass ? actor.items.get(system.shipClass) ?? null : null;
        context.acProjectile = system.attributes?.acProjectile ?? 0;
        context.acEnergy     = system.attributes?.acEnergy     ?? 0;

        context.notesHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
            system.notes ?? "",
            { async: true, relativeTo: actor }
        );
        return context;
    }

    async #prepareCrewContext(system, items) {
        const shipRoles = items.filter(i => i.type === "darkspace.ShipRole");
        const roleMap   = Object.fromEntries(shipRoles.map(r => [r.id, r.name]));

        const rolesBySpacerUuid = {};
        for (const r of system.roles ?? []) {
            if (!r.spacerUuid) continue;
            (rolesBySpacerUuid[r.spacerUuid] ??= []).push(roleMap[r.roleId] ?? "Unknown Role");
        }

        const crewActors = await system.getCrew();
        const crew = await Promise.all(crewActors.map(async (a, i) => {
            const uuid          = system.crew[i];
            const archetypeObj  = a?.system?.class      ? await fromUuid(a.system.class).catch(() => null)      : null;
            const backgroundObj = a?.system?.background ? await fromUuid(a.system.background).catch(() => null) : null;
            return {
                uuid,
                name:       a?.name ?? "Unknown",
                img:        a?.img  ?? "icons/svg/mystery-man.svg",
                level:      a?.system?.level?.value ?? 0,
                hp: {
                    value: a?.system?.attributes?.hp?.value ?? 0,
                    max:   a?.system?.attributes?.hp?.max   ?? 0,
                },
                archetype:  archetypeObj?.name  ?? "",
                background: backgroundObj?.name ?? "",
                roles:      rolesBySpacerUuid[uuid] ?? [],
            };
        }));

        const crewMap = Object.fromEntries(crew.map(c => [c.uuid, c.name]));
        const roles = (system.roles ?? []).map((r, index) => ({
            index,
            roleId:     r.roleId,
            spacerUuid: r.spacerUuid,
            roleName:   roleMap[r.roleId]     ?? "Unknown Role",
            spacerName: crewMap[r.spacerUuid] ?? "",
        }));

        return { shipRoles, crew, roles };
    }

    /** @override */
    _onRender(context, options) {
        super._onRender(context, options);

        if (!this.isEditable) return;

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
    }

    // -----------------------------------------------
    // Action Handlers (static, click events)
    // -----------------------------------------------

    static async #onSubmit(event, form, formData) {
        await this.document.update(formData.object);
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
        if (itemType === "darkspace.ShipRole") {
            const roles = [...(this.actor.system.roles ?? []), { roleId: newItem.id, spacerUuid: "" }];
            await this.actor.update({ "system.roles": roles });
        }
        newItem.sheet.render(true);
    }

    static #onItemEdit(event, target) {
        this.actor.items.get(target.dataset.itemId)?.sheet.render(true);
    }

    static async #onItemDelete(event, target) {
        const itemId = target.dataset.itemId;
        const item   = this.actor.items.get(itemId);
        if (!item) return;
        if (item.type === "darkspace.ShipRole") {
            const roles = (this.actor.system.roles ?? []).filter(r => r.roleId !== itemId);
            await this.actor.update({ "system.roles": roles });
        }
        item.delete();
    }

    static async #onCrewRemove(event, target) {
        const uuid = target.closest("[data-uuid]")?.dataset.uuid;
        if (!uuid) return;
        const crew = this.actor.system.crew.filter(u => u !== uuid);
        await this.actor.update({ "system.crew": crew });
    }

    static async #onShipClassRemove(event, target) {
        const classId = this.actor.system.shipClass;
        if (classId) await this.actor.items.get(classId)?.delete();
        await this.actor.update({ "system.shipClass": "" });
    }

    static async #onRoleRemove(event, target) {
        const index = Number(target.dataset.index);
        const roles = [...(this.actor.system.roles ?? [])];
        roles.splice(index, 1);
        await this.actor.update({ "system.roles": roles });
    }

    static async #onShipAttack(event, target) {
        const item = this.actor.items.get(target.dataset.itemId);
        if (!item) return;
        const formula = item.system.damage || "1d6";
        const roll    = await new Roll(formula).evaluate();
        roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flavor:  `${this.actor.name} fires ${item.name}`,
        });
    }

    // -----------------------------------------------
    // Instance handler (change event, needs closure)
    // -----------------------------------------------

    async #onRoleSpacerChange(event) {
        const index = Number(event.currentTarget.dataset.index);
        const roles = foundry.utils.deepClone(this.actor.system.roles ?? []);
        if (roles[index]) {
            roles[index].spacerUuid = event.currentTarget.value;
            await this.actor.update({ "system.roles": roles });
        }
    }

    // -----------------------------------------------
    // Drag & Drop
    // -----------------------------------------------

    /** @override */
    async _onDrop(event) {
        const data = TextEditor.getDragEventData(event);

        if (data?.type === "Item") {
            const item = await fromUuid(data.uuid).catch(() => null);
            if (!item) return super._onDrop(event);

            if (item.type === "darkspace.ShipClass") {
                const existing = this.actor.items.find(i => i.type === "darkspace.ShipClass");
                if (existing) await existing.delete();
                const [newItem] = await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
                await this.actor.update({ "system.shipClass": newItem.id });
                return;
            }

            if (item.type === "darkspace.ShipRole") {
                const [newItem] = await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
                const roles = [...(this.actor.system.roles ?? []), { roleId: newItem.id, spacerUuid: "" }];
                await this.actor.update({ "system.roles": roles });
                return;
            }

            if (item.type === "darkspace.ShipComponent") {
                await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
                return;
            }
        }

        if (data?.type === "Actor") {
            const actor = await fromUuid(data.uuid).catch(() => null);
            if (actor?.type === "darkspace.Spacer") {
                const crew = [...(this.actor.system.crew ?? [])];
                if (!crew.includes(data.uuid)) {
                    crew.push(data.uuid);
                    await this.actor.update({ "system.crew": crew });
                }
                return;
            }
        }

        return super._onDrop(event);
    }
}
