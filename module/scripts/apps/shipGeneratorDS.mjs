import { default as CharacterGeneratorSD } from "/systems/shadowdark/src/apps/CharacterGeneratorSD.mjs";

// DarkSpace ship generator. Follows the Ship Design rules: roll base stats,
// roll a design budget, pick a classification and start with the systems every
// ship needs to be operational. Reuses the Shadowdark generator's form
// plumbing, stat rolling and dice controls. Outputs a darkspace.Ship actor.
export default class ShipGeneratorDS extends CharacterGeneratorSD {

    // A ship is not operational without these three systems.
    BASE_SYSTEM_UUIDS = [
        "Compendium.darkspace.ship-components.Item.w0SvjgWKoi3hiWHM", // Sublight Drive
        "Compendium.darkspace.ship-components.Item.i6MzhYGa7PllEuyW", // Communications Array
        "Compendium.darkspace.ship-components.Item.ZXvUJgu4Ta8FnVHI", // Memory Bank
    ];

    DESIGN_BUDGET_FORMULA = "(1d10 + 5) * 1000";

    constructor() {
        super();

        this.shipClass = null;

        this.formData.actor.type = "darkspace.Ship";
        this.formData.actor.system.level.value = 1;

        this.formData.baseSystems = [];
        this.formData.shipClasses = new foundry.utils.Collection();
        this.formData.shipClass = this._emptyShipClassData();
    }


    /** @inheritdoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["darkspace", "shadowdark", "character-generator", "ship-generator"],
        });
    }


    /** @inheritdoc */
    get template() {
        return "modules/darkspace/templates/apps/ship-generator.hbs";
    }


    /** @inheritdoc */
    get title() {
        return game.i18n.localize("DARKSPACE.apps.ship-generator.title");
    }


    /**
     * @override
     * A ship has no species, background, deity, patron or languages, so none of
     * the base class' compendium loading applies — the first run is built here
     * instead.
     */
    async getData(options) {
        if (this.firstrun) {
            this.firstrun = false;

            // Put up a loading screen as compendium searching can take a while
            const loadingDialog = new shadowdark.apps.LoadingSD().render(true);

            // setup ability range as 3-18
            this.formData.statRange = [];
            for (let i = 3; i < 19; i++) {
                this.formData.statRange.push(i);
            }

            // set all ship ability scores to 10
            CONFIG.SHADOWDARK.ABILITY_KEYS.forEach(x => {
                this.formData.actor.system.abilities[x] = { value: 10, mod: 0 };
            });

            this.formData.shipClasses = await shadowdark.compendiums._documents(
                "Item", "darkspace.ShipClass"
            );
            this.formData.baseSystems = await this._loadBaseSystems();

            // loading is finished, pull down the loading screen
            loadingDialog.close({ force: true });
        }

        // a new ship has 10 hit points plus its CON modifier
        this.formData.hitPoints = 10 + this.formData.actor.system.abilities.con.mod;

        return this.formData;
    }


    _emptyShipClassData() {
        return {
            description: "",
            featureSlots: 0,
            freeComponents: [],
            hpDie: "",
            systemSlots: 0,
            talents: [],
        };
    }


    /** The systems every ship must have to be operational. */
    async _loadBaseSystems() {
        const baseSystems = [];

        for (const uuid of this.BASE_SYSTEM_UUIDS) {
            const systemItem = await fromUuid(uuid).catch(() => null);
            if (systemItem) baseSystems.push(systemItem);
        }

        return baseSystems;
    }


    /**
     * Loads the free components and talents linked to a classification. Clears
     * the classification details if the uuid is missing.
     * @param {string} uuid
     */
    async _loadShipClass(uuid) {
        const classObj = uuid ? await fromUuid(uuid).catch(() => null) : null;

        this.shipClass = classObj;
        this.formData.shipClass = this._emptyShipClassData();

        if (!classObj) return;

        // the free starting components do not count against the design budget
        for (const componentUuid of classObj.system.freeComponents ?? []) {
            const componentObj = await fromUuid(componentUuid).catch(() => null);
            if (componentObj) this.formData.shipClass.freeComponents.push(componentObj);
        }

        for (const talentUuid of classObj.system.classTalents ?? []) {
            const talentObj = await fromUuid(talentUuid).catch(() => null);
            if (!talentObj) continue;
            talentObj.formattedDescription =
                await this._formatDescription(talentObj.system.description);
            this.formData.shipClass.talents.push(talentObj);
        }

        this.formData.shipClass.description = classObj.system.description
            ? await this._formatDescription(classObj.system.description)
            : "";
        this.formData.shipClass.featureSlots = classObj.system.featureSlots ?? 0;
        this.formData.shipClass.hpDie = classObj.system.hpDie ?? "";
        this.formData.shipClass.systemSlots = classObj.system.systemSlots ?? 0;
    }


    /** @override */
    _getRandomizationTasks(eventStr) {
        const randomizationTasks = {
            "randomize-budget": false,
            "randomize-class": false,
            "randomize-stats": false,
        };

        if (eventStr === "randomize-all") {
            Object.keys(randomizationTasks).forEach(
                key => randomizationTasks[key] = true
            );
        }
        else {
            randomizationTasks[eventStr] = true;
        }

        return randomizationTasks;
    }


    /** @override */
    async _randomizeHandler(event) {
        const randomizationTasks = this._getRandomizationTasks(event.target.name);

        if (randomizationTasks["randomize-budget"]) await this._randomizeBudget();
        if (randomizationTasks["randomize-class"]) await this._randomizeClass();
        if (randomizationTasks["randomize-stats"]) await this._randomizeStats();

        shadowdark.utils.diceSound();

        this.render();
    }


    async _randomizeBudget() {
        this.formData.actor.system.coins.gp = await this._roll(this.DESIGN_BUDGET_FORMULA);
    }


    /** @override No ship classifications may exist yet; skip rather than crash. */
    async _randomizeClass() {
        if (!this.formData.shipClasses.size) return;

        const tempInt = this._getRandom(this.formData.shipClasses.size);
        const classUuid = [...this.formData.shipClasses][tempInt].uuid;

        this.formData.actor.system.class = classUuid;
        await this._loadShipClass(classUuid);
    }


    /**
     * @override
     * Ships have no level 0, no species and no patron, so only the stats and
     * the classification need handling.
     */
    async _updateObject(event, data) {
        // expand incoming data for compatibility with formData
        const expandedData = foundry.utils.expandObject(data);

        // convert incoming stat data from string to int
        if (expandedData.actor.system.abilities) {
            CONFIG.SHADOWDARK.ABILITY_KEYS.forEach(x => {
                const value = parseInt(expandedData.actor.system.abilities[x].value);
                expandedData.actor.system.abilities[x].value = value;
            });
        }

        // merge incoming data into the main formData object
        this.formData = foundry.utils.mergeObject(this.formData, expandedData);

        // if stats were changed, calculate new modifiers
        if (event.target.id === "stat") {
            this._calculateModifiers();
        }

        // if the classification was changed, load its linked items
        if (event.target.name === "actor.system.class") {
            await this._loadShipClass(event.target.value);
        }

        this.render();
    }


    // -----------------------------------------------
    // Actor creation
    // -----------------------------------------------

    /**
     * @override
     * The classification, its free components and the mandatory base systems
     * are all embedded on the new ship, and the design budget is banked as its
     * credits — components carry no price, so the crew spends what is left over
     * from the ship sheet.
     */
    async _createCharacter() {

        // Check for Name
        if (this.formData.actor.name === "") {
            ui.notifications.error(game.i18n.localize("DARKSPACE.apps.ship-generator.error.name"));
            return;
        }

        const allItems = [];

        for (const systemItem of this.formData.baseSystems) {
            allItems.push(systemItem.toObject());
        }

        for (const componentItem of this.formData.shipClass.freeComponents) {
            allItems.push(componentItem.toObject());
        }

        for (const talentItem of this.formData.shipClass.talents) {
            const talentObj = await shadowdark.effects.createItemWithEffect(talentItem);
            if (talentObj) allItems.push(talentObj);
        }

        // The classification is embedded like a spacer's archetype is, so the
        // uuid link is left empty and resolved from the embedded item instead.
        if (this.shipClass) allItems.push(this.shipClass.toObject());
        this.formData.actor.system.class = "";

        // Calculate initial HP
        const hitPoints = 10 + this.formData.actor.system.abilities.con.mod;
        this.formData.actor.system.attributes.hp.max = hitPoints;
        this.formData.actor.system.attributes.hp.value = hitPoints;

        const newShip = await Actor.create(this.formData.actor);

        if (!newShip) {
            return ui.notifications.error(
                game.i18n.localize("DARKSPACE.apps.ship-generator.error.create")
            );
        }

        await newShip.createEmbeddedDocuments("Item", allItems);

        newShip.sheet.render(true);

        ui.notifications.info(
            game.i18n.localize("DARKSPACE.apps.ship-generator.success"),
            { permanent: false }
        );

        this.close();
    }
}
