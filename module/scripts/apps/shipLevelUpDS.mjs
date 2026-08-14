import { default as LevelUpSD } from "/systems/shadowdark/src/apps/LevelUpSD.mjs";

// Ship level advancement. Ships level like any other Shadowdark character, but
// they have no XP, no spells and no patron boons, and they roll hit points from
// their ship class' hit die instead of a class hit point formula.
export default class ShipLevelUpDS extends LevelUpSD {

    /** @inheritdoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["darkspace", "shadowdark", "level-up", "ship"],
        });
    }


    /** @inheritdoc */
    get template() {
        return "modules/darkspace/templates/apps/ship-level-up.hbs";
    }


    /** @inheritdoc */
    get title() {
        return game.i18n.localize("DARKSPACE.apps.ship-level-up.title");
    }


    /**
     * @override
     * The base setup resolves a player class, patron and spells known table,
     * none of which a ship has, so the first run is built from scratch.
     */
    async getData(options) {
        if (this.firstrun) {
            this.firstrun = false;

            const system = this.data.actor.system;

            this.data.class = await system.getShipClass();
            this.data.talentTable = this.data.class?.system.talentTable
                ? await fromUuid(this.data.class.system.talentTable).catch(() => null)
                : null;

            this.data.hitPoints = `1${this.data.class?.system.hpDie ?? "d6"}`;
            this.data.currentLevel = system.level.value;
            this.data.targetLevel = this.data.currentLevel + 1;
            this.data.crewLevel = system.getCrewLevel();
            this.data.talentGained = (this.data.targetLevel % 2 !== 0);

            // Ships have no patron and cast no spells.
            this.data.canRollBoons = false;
            this.data.totalSpellsToChoose = 0;
        }

        this.data.talentsRolled = this.data.rolls.talent;
        this.data.talentsChosen = this.data.talents.length > 0;

        // get HP advantage
        const hpRollKey = this.data.actor.system._getActiveEffectKeys("system.roll.hp.advantage", 0);
        this.data.hp = {
            advantage: hpRollKey.value,
            tooltips: hpRollKey.tooltips,
        };

        return this.data;
    }


    /** @override */
    async _viewTalentTable() {
        if (!this.data.talentTable) return this._warnMissingTalentTable();
        this.data.talentTable.sheet.render(true);
    }


    /** @override */
    async _onRollHP({isReroll = false}) {
        const label = isReroll
            ? game.i18n.localize("SHADOWDARK.dialog.hp_re_roll.title")
            : game.i18n.localize("SHADOWDARK.dialog.hp_roll.title");

        const config = {
            skipPrompt: true,
            mainRoll: {
                formula: this.data.hitPoints,
                advantage: this.data.hp.advantage,
                label: label,
            },
            actorUuid: this.data.actor.uuid,
        };

        const result = await shadowdark.dice.rollFromConfig(config);
        this.data.rolls.hp = result.total;
        ui.sidebar.changeTab("chat", "primary");
        this.render();
    }


    /** @override */
    async _onRollTalent() {
        if (!this.data.talentTable) return this._warnMissingTalentTable();

        await this.data.talentTable.draw();
        ui.sidebar.changeTab("chat", "primary");

        this.data.rolls.talent = true;
        this.render();
    }


    /**
     * @override
     * Ships gain no XP, so levelling only banks the rolled hit points, any
     * chosen talents and the new level.
     */
    async _finalizeLevelUp() {
        const actor = this.data.actor;

        await actor.createEmbeddedDocuments("Item", this.data.talents);

        await actor.update({
            "system.attributes.hp.max": actor.system.attributes.hp.max + this.data.rolls.hp,
            "system.attributes.hp.value": actor.system.attributes.hp.value + this.data.rolls.hp,
            "system.level.value": this.data.targetLevel,
        });

        this.close();
    }


    _warnMissingTalentTable() {
        ui.notifications.warn(
            game.i18n.localize("DARKSPACE.apps.ship-level-up.errors.missing_talent_table")
        );
    }
}
