import registerSettings from "./scripts/settings.mjs";
import * as sheets from "./scripts/sheets/_module.mjs";
import * as models from "./scripts/models/_module.mjs";
import CharacterGeneratorDS from "./scripts/apps/characterGeneratorDS.mjs";
import { DEFAULT_ICONS } from "./scripts/config.mjs";

// -----------------------------------------------
// Triggered when the module is first initialized
// -----------------------------------------------
Hooks.on("init", () => {

    // Module settings
    registerSettings();

    // Actor data models
    Object.assign(CONFIG.Actor.dataModels, {
        "darkspace.Spacer": models.Spacer,
        "darkspace.Ship":   models.Ship,
    });

    // Item data models
    Object.assign(CONFIG.Item.dataModels, {
        "darkspace.Cargo":          models.Cargo,
        "darkspace.ShipArmor":      models.ShipArmor,
        "darkspace.ShipClass":      models.ShipClass,
        "darkspace.ShipComponent":  models.ShipComponent,
        "darkspace.ShipRole":       models.ShipRole,
        "darkspace.Weapon":         models.Weapon,
    });

    // Restrict the Actor creation dialog to Darkspace types only
    const _origActorCreateDialog = Actor.createDialog;
    Actor.createDialog = function(data={}, createOptions={}, options={}) {
        options.types ??= ["darkspace.Spacer", "darkspace.Ship"];
        return _origActorCreateDialog.call(this, data, createOptions, options);
    };

    // Restrict the Item creation dialog to Darkspace types only
    const _origItemCreateDialog = Item.createDialog;
    Item.createDialog = function(data={}, createOptions={}, options={}) {
        options.types ??= [
            "Ancestry",
            "Armor",
            "Background",
            "Basic",
            "Class",
            "Property",
            "Talent",
            "darkspace.Cargo",
            "darkspace.ShipArmor",
            "darkspace.ShipClass",
            "darkspace.ShipComponent",
            "darkspace.ShipRole",
            "darkspace.Weapon",
        ];
        return _origItemCreateDialog.call(this, data, createOptions, options);
    };

    // Localize the item type in Shadowdark sheet titles (Class → Archetype, Ancestry → Species)
    Object.defineProperty(shadowdark.sheets.ItemSheetSD.prototype, "title", {
        get() {
            return `[${game.i18n.localize(`TYPES.Item.${this.item.type}`)}] ${this.item.name}`;
        },
        configurable: true,
    });

    // Actor sheets
    Actors.registerSheet("darkspace", sheets.SpacerSheet, {
        types: ["darkspace.Spacer"],
        makeDefault: true,
    });

    Actors.registerSheet("darkspace", sheets.ShipSheet, {
        types: ["darkspace.Ship"],
        makeDefault: true,
    });

    // Item sheets
    Items.registerSheet("darkspace", sheets.CargoSheet, {
        types: ["darkspace.Cargo"],
        makeDefault: true,
    });

    Items.registerSheet("darkspace", sheets.ShipArmorSheet, {
        types: ["darkspace.ShipArmor"],
        makeDefault: true,
    });

    Items.registerSheet("darkspace", sheets.ShipClassSheet, {
        types: ["darkspace.ShipClass"],
        makeDefault: true,
    });

    Items.registerSheet("darkspace", sheets.ShipComponentSheet, {
        types: ["darkspace.ShipComponent"],
        makeDefault: true,
    });

    Items.registerSheet("darkspace", sheets.ShipRoleSheet, {
        types: ["darkspace.ShipRole"],
        makeDefault: true,
    });

    Items.registerSheet("darkspace", sheets.WeaponSheet, {
        types: ["darkspace.Weapon"],
        makeDefault: true,
    });

    // Handlebars helpers
    Handlebars.registerHelper("eq", (a, b) => a === b);

    // Override Shadowdark's hardcoded " gp" suffix with " cr"
    Handlebars.registerHelper("displayCost", item => {
        let costInCr = item.system.cost.gp
            + (item.system.cost.sp / 10)
            + (item.system.cost.cp / 100);
        costInCr = costInCr * item.system.quantity;
        return `${costInCr} ${game.i18n.localize("DARKSPACE.currency.cr")}`;
    });

    // load templates
    loadTemplates({
        // Shared actor partials
        stats:   "modules/darkspace/templates/actors/partials/stats.hbs",
        attacks: "modules/darkspace/templates/actors/partials/attacks.hbs",
        hp:      "modules/darkspace/templates/actors/partials/hp.hbs",
        level:   "modules/darkspace/templates/actors/partials/level.hbs",
        // UI primitives
        "ui/ds-box":             "modules/darkspace/templates/ui/ds-box.hbs",
        "items/item-header":     "modules/darkspace/templates/items/_partials/item-header.hbs",
        "ship/component-section": "modules/darkspace/templates/actors/ship/_partials/component-section.hbs",
        // Character generator
        "darkspace/character-generator/motivation": "modules/darkspace/templates/apps/character-generator/motivation.hbs",
    });

    // Create Spacer button at the top of the Actors tab. Shadowdark's footer
    // buttons are hidden via CSS (overrides.scss) because its render hook
    // inserts them asynchronously, after this one has already run.
    Hooks.on("renderActorDirectory", (app, html) => {
        const actions = html.querySelector(".directory-header .header-actions");
        if (!actions) return;

        const button = document.createElement("button");
        button.type = "button";
        button.classList.add("ds-character-generator-button");
        button.innerHTML = `<i class="fas fa-user-astronaut"></i>
            <b class="button-text">${game.i18n.localize("DARKSPACE.apps.character-generator.sidebar_create")}</b>`;
        button.addEventListener("click", () => new CharacterGeneratorDS().render(true));
        actions.prepend(button);
    });

});

// set default icon for new items
Hooks.on("preCreateItem", (item, data) => {
    const icon = DEFAULT_ICONS[item.type];
    if (icon && item.img === Item.DEFAULT_ICON) item.updateSource({ img: icon });
});

// -----------------------------------------------
// Triggers once the module is fully loaded
// -----------------------------------------------
Hooks.on("ready", async () => {
    if (!game.user.isGM) return;

    const filters = game.settings.get("shadowdark", "sourceFilters") ?? [];
    if (!filters.includes("darkspace")) {
        await game.settings.set("shadowdark", "sourceFilters", [...filters, "darkspace"]);
    }
});
