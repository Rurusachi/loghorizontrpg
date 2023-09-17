export let _characterSpec = { system: {}, flags: {} };
export class ValidSpec {
    constructor(fs, sv, forcedMode = -1) {
        this._fieldSpec = fs;
        this._sampleValue = sv;
        this._name = fs;
        this._forcedMode = forcedMode;
    }
    get fieldSpec() { return this._fieldSpec; }
    ;
    set fieldSpec(spec) { this._fieldSpec = spec; }
    get sampleValue() { return this._sampleValue; }
    set sampleValue(value) { this._sampleValue = value; }
    get name() { return this._name; }
    set name(name) { this._name = name; }
    get forcedMode() { return this._forcedMode; }
    set forcedMode(mode) { this._forcedMode = mode; }
    static createValidMods(characterSpec = game.system.model.Actor.character) {
        _characterSpec["system"] = duplicate(characterSpec);
        let baseValues = flattenObject(_characterSpec);
        if (game.modules.get("gm-notes")?.active) {
            baseValues["flags.gm-notes.notes"] = "";
        }
        const ACTIVE_EFFECT_MODES = CONST.ACTIVE_EFFECT_MODES;
        var specials = {
            "system.hp.max": [0, -1],
            "system.hp.basemax": [0, -1],
            "system.hp.min": [0, -1],
            "system.fate.max": [0, -1],
            "system.abilities.str.mod": [0, ACTIVE_EFFECT_MODES.CUSTOM],
            "system.abilities.str.base": [0, ACTIVE_EFFECT_MODES.CUSTOM],
            "system.abilities.dex.mod": [0, ACTIVE_EFFECT_MODES.CUSTOM],
            "system.abilities.dex.base": [0, ACTIVE_EFFECT_MODES.CUSTOM],
            "system.abilities.pow.mod": [0, ACTIVE_EFFECT_MODES.CUSTOM],
            "system.abilities.pow.base": [0, ACTIVE_EFFECT_MODES.CUSTOM],
            "system.abilities.int.mod": [0, ACTIVE_EFFECT_MODES.CUSTOM],
            "system.abilities.int.base": [0, ACTIVE_EFFECT_MODES.CUSTOM]
        };
        Object.keys(specials).forEach(key => {
            delete baseValues[key];
        });
        // baseSpecs are all those fields defined in template.json game.system.model and are things the user can directly change
        this.baseSpecs = Object.keys(baseValues).map(spec => {
            let validSpec = new ValidSpec(spec, baseValues[spec], -1);
            if (spec.includes(`flags.${game.system.id}`))
                validSpec.forcedMode = ACTIVE_EFFECT_MODES.CUSTOM;
            this.baseSpecsObj[spec] = validSpec;
            return validSpec;
        });

        Object.keys(_characterSpec.system.abilities).forEach(ablKey => {
            let abl = _characterSpec.system.abilities[ablKey];
            this.derivedSpecs.push(new ValidSpec(`system.abilities.${ablKey}.mod`, 0));
            this.derivedSpecs.push(new ValidSpec(`system.abilities.${ablKey}.base`, 0));
        });
        Object.keys(_characterSpec.system.attributes).forEach(attrKey => {
            let skl = _characterSpec.system.attributes[attrKey];
            this.derivedSpecs.push(new ValidSpec(`system.attributes.${attrKey}.total`, 0));
            this.derivedSpecs.push(new ValidSpec(`system.attributes.${attrKey}.mod`, 0));
        });
        Object.keys(_characterSpec.system.combatstats).forEach(cmbKey => {
            let skl = _characterSpec.system.combatstats[cmbKey];
            this.derivedSpecs.push(new ValidSpec(`system.combatstats.${cmbKey}.total`, 0));
        });
        Object.entries(specials).forEach(special => {
            let validSpec = new ValidSpec(special[0], special[1][0], special[1][1]);
            this.derivedSpecs.push(validSpec);
        });

        this.allSpecs = this.baseSpecs.concat(this.derivedSpecs);

        this.allSpecs.sort((a, b) => { return a._fieldSpec < b._fieldSpec ? -1 : 1; });
        this.baseSpecs.sort((a, b) => { return a._fieldSpec < b._fieldSpec ? -1 : 1; });
        this.derivedSpecs.sort((a, b) => { return a._fieldSpec < b._fieldSpec ? -1 : 1; });
        this.allSpecs.forEach(ms => this.allSpecsObj[ms._fieldSpec] = ms);
        this.baseSpecs.forEach(ms => this.baseSpecsObj[ms._fieldSpec] = ms);
        this.derivedSpecs.forEach(ms => this.derivedSpecsObj[ms._fieldSpec] = ms);
    }
}
ValidSpec.allSpecs = [];
ValidSpec.allSpecsObj = {};
ValidSpec.baseSpecs = [];
ValidSpec.derivedSpecsObj = {};
ValidSpec.baseSpecsObj = {};
ValidSpec.derivedSpecs = [];

export function applyLhrpgEffects(specList, completedSpecs, allowAllSpecs) {
    const overrides = {};
    let effects = this.appliedEffects;
    if (!effects || effects.size === 0)
        return this.overrides || {};
    // Organize non-disabled effects by their application priority
    const changes = effects.reduce((changes, effect) => {
        if (effect.disabled)
            return changes;
        return changes.concat(effect.changes
            .filter(c => { return !completedSpecs[c.key] && (allowAllSpecs || specList[c.key] !== undefined); })
            .map(c => {
            c = duplicate(c);
            c.effect = effect;
            c.priority = c.priority ?? (c.mode * 10);
            return c;
        }));
    }, []);
    changes.sort((a, b) => a.priority - b.priority);
    // Apply all changes
    for (let c of changes) {
        if (typeof c.value === "string" && c.value.includes("@system.")) {
            c.value = c.value.replace(/@system./g, "@");
        }
        if (c.mode !== CONST.ACTIVE_EFFECT_MODES.CUSTOM) {
            if (typeof specList[c.key]?.sampleValue === "number" && typeof c.value === "string") {
                let sourceData = c.effect.parent?.getRollData() ?? this.getRollData();
                let value = replaceAtFields(c.value, sourceData);
                
                try { // Roll parser no longer accepts some expressions it used to so we will try and avoid using it
                    //@ts-ignore - this will throw an error if there are roll expressions
                    c.value = Roll.safeEval(value);
                }
                catch (err) { // safeEval failed try a roll
                    try {
                        c.value = new Roll(value).evaluate({ async: false }).total;
                    }
                    catch (err) {
                        console.warn("change value calculation failed for", this, c);
                        console.warn(err);
                    }
                }
            }
        }
        const result = c.effect.apply(this, c);
        if (result !== null)
            overrides[c.key] = result;
    }
    // Expand the set of final overrides
    this.overrides = mergeObject(this.overrides || {}, expandObject(overrides) || {}, { inplace: true, overwrite: true });
}

export function replaceAtFields(value, context, maxIterations = 4) {
    if (typeof value !== "string")
        return value;
    let count = 0;
    if (!value.includes("@"))
        return value;
    let re = /@[\w\.]+/g;
    let result = duplicate(value);
    // Remove @data references allow a little bit of recursive lookup
    do {
        count += 1;
        for (let match of result.match(re) || []) {
            result = result.replace(match.replace("@system.", "@"), getProperty(context, match.slice(1)));
        }
    } while (count < maxIterations && result.includes("@"));
    return result;
}
