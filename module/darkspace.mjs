//import registerSettings from "./scripts/settings.mjs";
import * as sheets from "./scripts/sheets/_module.mjs";
import * as models from "./scripts/models/_module.mjs";

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
        "darkspace.Archetype":  models.Archetype,
        "darkspace.Component":  models.Component,
        "darkspace.ShipArmor":  models.ShipArmor,
        "darkspace.ShipClass":  models.ShipClass,
        "darkspace.ShipWeapon": models.ShipWeapon,
        "darkspace.Species":    models.Species,
        "darkspace.Weapon":     models.Weapon,
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
        options.types ??= ["darkspace.Archetype", "darkspace.Component", "darkspace.ShipArmor", "darkspace.ShipClass", "darkspace.ShipWeapon", "darkspace.Species", "darkspace.Weapon"];
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

    Items.registerSheet("darkspace", sheets.ComponentSheet, {
        types: ["darkspace.Component"],
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

    // load templates
    loadTemplates({
        stats:   "modules/darkspace/templates/actors/partials/stats.hbs",
        attacks: "modules/darkspace/templates/actors/partials/attacks.hbs",
        crew:    "modules/darkspace/templates/actors/partials/crew.hbs",
    });

});

// -----------------------------------------------
// Triggers once the module is fully loaded
// -----------------------------------------------
Hooks.on("ready", async () => {

});
