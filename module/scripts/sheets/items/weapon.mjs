export default class WeaponSheet extends shadowdark.sheets.ItemSheetSD {
    get template() {
        return "modules/darkspace/templates/items/weapon.hbs";
    }

    /** @override */
    async getData(options) {
        const context = await super.getData(options);
        // The Shadowdark sheet only gathers these for its native "Weapon"
        // type, so provide them for "darkspace.Weapon" ourselves.
        context.propertyItems = await this.item.getPropertyItems();
        context.ammunition = await shadowdark.utils.getSlugifiedItemList(
            await shadowdark.compendiums.ammunition()
        );
        return context;
    }
}
