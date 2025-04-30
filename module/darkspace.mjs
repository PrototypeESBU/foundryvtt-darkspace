//import registerSettings from "./scripts/settings.mjs";
import * as sheets from "./scripts/sheets/_module.mjs";
import * as models from "./scripts/models/_module.mjs";

// -----------------------------------------------
// Triggered when the module is first initialized
// -----------------------------------------------
Hooks.on("init", () => {

    // load combat and combatant data model sub-types
    Object.assign(CONFIG.Actor.dataModels, {"darkspace.Spacer": models.Spacer});
    Object.assign(CONFIG.Actor.dataModels, {"darkspace.Ship": models.Ship});
    Object.assign(CONFIG.Item.dataModels, {"darkspace.Component": models.Component});

    Actors.registerSheet("darkspace", sheets.SpacerSheet, {
        types: ["Player", "darkspace.Spacer"],
        makeDefault: true,
    });

    Actors.registerSheet("darkspace", sheets.ShipSheet, {
        types: ["darkspace.Ship"],
        makeDefault: true,
    });

    // load templates
    loadTemplates({
        stats:"modules/darkspace/templates/actors/partials/stats.hbs"
    });

});

// -----------------------------------------------
// Triggers once the module is fully loaded
// -----------------------------------------------
Hooks.on("ready", async () => {
   
});
