const fields = foundry.data.fields;

export const ac = () => ({
    ac: new fields.SchemaField({
        value: new fields.NumberField({integer: true, initial: 10, min: 0})
    })
});

export const hp = () => ({
    value: new fields.NumberField({ integer: true, initial: 0, min: 0}),
    max: new fields.NumberField({ integer: true, initial: 0, min: 0})
});

export const level = () => ({
    level: new fields.SchemaField({
        value: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
        xp: new fields.NumberField({ integer: true, initial: 0, min: 0 })
    })
});

export const notes = () => ({
    notes: new fields.HTMLField()
})