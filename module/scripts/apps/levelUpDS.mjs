import { default as LevelUpSD } from "/systems/shadowdark/src/apps/LevelUpSD.mjs";

// Spacer level advancement. Spacers embed their archetype as an item instead of
// linking a uuid, so the base setup resolves no class at all, and DarkSpace has
// neither patrons nor spellcasting — the first run is built here instead, and
// the rest of the app is reused as-is.
export default class LevelUpDS extends LevelUpSD {

    /** @inheritdoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["darkspace", "shadowdark", "level-up"],
        });
    }


    /** @override */
    async getData(options) {
        if (this.firstrun) {
            this.firstrun = false;

            const system = this.data.actor.system;

            this.data.class = await system.getClass();
            this.data.talentTable = this.data.class?.system.classTalentTable
                ? await fromUuid(this.data.class.system.classTalentTable).catch(() => null)
                : null;

            this.data.currentLevel = system.level.value;
            this.data.targetLevel = this.data.currentLevel + 1;
            this.data.talentGained = (this.data.targetLevel % 2 !== 0);

            // Spacers have no patron and cast no spells.
            this.data.canRollBoons = false;
            this.data.totalSpellsToChoose = 0;
        }

        // The first run block above is done, so this only tops up the roll state
        // and HP advantage.
        return super.getData(options);
    }


    /** @override */
    async _onRollHP(options) {
        if (!this.data.class) {
            return ui.notifications.warn(
                game.i18n.localize("DARKSPACE.sheet.spacer.level.noArchetype")
            );
        }
        return super._onRollHP(options);
    }


    /** @override */
    async _viewTalentTable() {
        if (!this.data.talentTable) return this._warnMissingTalentTable();
        return super._viewTalentTable();
    }


    /** @override */
    async _onRollTalent() {
        if (!this.data.talentTable) return this._warnMissingTalentTable();
        return super._onRollTalent();
    }


    _warnMissingTalentTable() {
        ui.notifications.warn(
            game.i18n.localize("DARKSPACE.apps.level-up.errors.missing_talent_table")
        );
    }
}
