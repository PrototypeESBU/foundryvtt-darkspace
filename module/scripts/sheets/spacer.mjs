export default class SpacerSheet extends shadowdark.sheets.PlayerSheetSD {

    /** @inheritdoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            scrollY: [".ds-talents-section .content", ".ds-gear-list"],
            width: 1000,
            height: 700,
            tabs: [{ navSelector: ".SD-nav", contentSelector: ".SD-content-body", initial: "tab-details" }],
        });
    }

    /** @inheritdoc */
    get template() {
        return "modules/darkspace/templates/actors/spacer.hbs";
    }

    /** @override */
    async getData(options) {
        const context = await super.getData(options);

        const system = this.actor.system;

        // Resolve archetype (uses inherited PlayerSD.class field)
        if (system.class) {
            const archetype = await fromUuid(system.class);
            context.archetypeName = archetype?.name ?? "";
            context.archetypeUuid = system.class;
        }

        // Resolve species (uses inherited PlayerSD.ancestry field)
        if (system.ancestry) {
            const species = await fromUuid(system.ancestry);
            context.speciesName = species?.name ?? "";
            context.speciesUuid = system.ancestry;
        }

        // Resolve linked ship
        if (system.shipUuid) {
            const ship = await fromUuid(system.shipUuid);
            context.shipName = ship?.name ?? "";
            context.shipId   = system.shipUuid;
        }

        context.shipRoles = system.shipRoles ?? [];

        context.motivationChoices = [
            { value: "survivor", label: game.i18n.localize("DARKSPACE.motivation.survivor") },
            { value: "vile",     label: game.i18n.localize("DARKSPACE.motivation.vile") },
            { value: "virtuous", label: game.i18n.localize("DARKSPACE.motivation.virtuous") },
        ].map(m => ({ ...m, selected: system.motivation === m.value }));

        return context;
    }
}
