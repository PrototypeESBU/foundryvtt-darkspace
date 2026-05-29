//import registerSettings from "./scripts/settings.mjs";
import * as sheets from "./scripts/sheets/_module.mjs";
import * as models from "./scripts/models/_module.mjs";
import { DEFAULT_ICONS } from "./scripts/config.mjs";

// -----------------------------------------------
// Triggered when the module is first initialized
// -----------------------------------------------
Hooks.on("init", () => {

    // Actor data models
    Object.assign(CONFIG.Actor.dataModels, {
        "darkspace.Spacer": models.Spacer,
        "darkspace.Ship":   models.Ship,
    });

    // Item data models
    Object.assign(CONFIG.Item.dataModels, {
        "darkspace.Archetype":      models.Archetype,
        "darkspace.ShipArmor":      models.ShipArmor,
        "darkspace.ShipClass":      models.ShipClass,
        "darkspace.ShipComponent":  models.ShipComponent,
        "darkspace.ShipRole":       models.ShipRole,
        "darkspace.ShipWeapon":     models.ShipWeapon,
        "darkspace.Species":        models.Species,
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
            "Background",
            "darkspace.Archetype",
            "darkspace.ShipArmor",
            "darkspace.ShipClass",
            "darkspace.ShipComponent",
            "darkspace.ShipRole",
            "darkspace.ShipWeapon",
            "darkspace.Species",
            "darkspace.Weapon",
        ];
        return _origItemCreateDialog.call(this, data, createOptions, options);
    };

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
    Items.registerSheet("darkspace", sheets.ArchetypeSheet, {
        types: ["darkspace.Archetype"],
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

    Items.registerSheet("darkspace", sheets.ShipWeaponSheet, {
        types: ["darkspace.ShipWeapon"],
        makeDefault: true,
    });

    Items.registerSheet("darkspace", sheets.SpeciesSheet, {
        types: ["darkspace.Species"],
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
        // UI primitives
        "ui/ds-box":             "modules/darkspace/templates/ui/ds-box.hbs",
        "items/item-header":     "modules/darkspace/templates/items/_partials/item-header.hbs",
        "ship/component-section": "modules/darkspace/templates/actors/ship/_partials/component-section.hbs",
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
