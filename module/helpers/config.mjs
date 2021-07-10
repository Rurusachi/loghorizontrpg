export const LOGHORIZONTRPG = {};

/**
 * The set of Ability Scores used within the sytem.
 * @type {Object}
 */
 LOGHORIZONTRPG.abilities = {
  "str": "LOGHORIZONTRPG.AbilityStr",
  "dex": "LOGHORIZONTRPG.AbilityDex",
  "pow": "LOGHORIZONTRPG.AbilityPow",
  "int": "LOGHORIZONTRPG.AbilityInt"
};

LOGHORIZONTRPG.abilityAbbreviations = {
  "str": "LOGHORIZONTRPG.AbilityStrAbbr",
  "dex": "LOGHORIZONTRPG.AbilityDexAbbr",
  "pow": "LOGHORIZONTRPG.AbilityPowAbbr",
  "int": "LOGHORIZONTRPG.AbilityIntAbbr"
};

LOGHORIZONTRPG.attributes = {
    "athletics": "LOGHORIZONTRPG.AttributeAthletics",
    "endurance": "LOGHORIZONTRPG.AttributeEndurance",
    "disable": "LOGHORIZONTRPG.AttributeDisable",
    "operate": "LOGHORIZONTRPG.AttributeOperate",
    "perception": "LOGHORIZONTRPG.AttributePerception",
    "negotiation": "LOGHORIZONTRPG.AttributeNegotiation",
    "knowledge": "LOGHORIZONTRPG.AttributeKnowledge",
    "analyze": "LOGHORIZONTRPG.AttributeAnalyze",
    "accuracy": "LOGHORIZONTRPG.AttributeAccuracy",
    "evasion": "LOGHORIZONTRPG.AttributeEvasion",
    "resistance": "LOGHORIZONTRPG.AttributeResistance"
};

LOGHORIZONTRPG.combatstats = {
    "patk": "LOGHORIZONTRPG.CombatstatPatk",
    "matk": "LOGHORIZONTRPG.CombatstatMatk",
    "pdef": "LOGHORIZONTRPG.CombatstatPdef",
    "mdef": "LOGHORIZONTRPG.CombatstatMdef",
    "initiative": "LOGHORIZONTRPG.CombatstatInitiative",
    "speed": "LOGHORIZONTRPG.CombatstatSpeed",
    "recovery": "LOGHORIZONTRPG.CombatstatRecovery"
};

LOGHORIZONTRPG.tags = {
    "human": "LOGHORIZONTRPG.Tags.Human",
    "elf": "LOGHORIZONTRPG.Tags.Elf",
    "dwarf": "LOGHORIZONTRPG.Tags.Dwarf",
    "foxtail": "LOGHORIZONTRPG.Tags.FoxTail"
};

LOGHORIZONTRPG.checkTypes = {
    "none": "LOGHORIZONTRPG.ActionCheckNone",
    "automatic": "LOGHORIZONTRPG.ActionCheckAutomatic",
    "basic": "LOGHORIZONTRPG.ActionCheckBasic",
    "opposed": "LOGHORIZONTRPG.ActionCheckOpposed",
    "refer": "LOGHORIZONTRPG.ActionCheckRefer"
};

LOGHORIZONTRPG.limitTypes = {
    "None": "LOGHORIZONTRPG.ActionLimitNone",
    "scene": "LOGHORIZONTRPG.ActionLimitScene",
    "scenario": "LOGHORIZONTRPG.ActionLimitScenario",
    "round": "LOGHORIZONTRPG.ActionLimitRound",
    "party": "LOGHORIZONTRPG.ActionLimitParty",
    "other": "LOGHORIZONTRPG.ActionLimitOther"
};

LOGHORIZONTRPG.restOptionsLimits = {
    "scene": "LOGHORIZONTRPG.RestScene",
    "scenario": "LOGHORIZONTRPG.RestScenario",
    "round": "LOGHORIZONTRPG.RestRound",
    "party": "LOGHORIZONTRPG.RestParty",
    "other": "LOGHORIZONTRPG.RestOther"
};

LOGHORIZONTRPG.restOptionsResources = {
    "hp": "LOGHORIZONTRPG.RestHP",
    "fatigue": "LOGHORIZONTRPG.RestFatigue",
    "hate": "LOGHORIZONTRPG.RestHate",
    "fate": "LOGHORIZONTRPG.RestFate"
};

LOGHORIZONTRPG.restOptions = {
    "limits": "LOGHORIZONTRPG.RestLimits",
    "resources": "LOGHORIZONTRPG.RestResources",
    "alltitle": "LOGHORIZONTRPG.RestAllTitle",
    "all": "LOGHORIZONTRPG.RestAll"
}

LOGHORIZONTRPG.timingTypes = {
    "constant": "LOGHORIZONTRPG.ActionTimingConstant",
    "preplay": "LOGHORIZONTRPG.ActionTimingPrePlay",
    "interlude": "LOGHORIZONTRPG.ActionTimingInterlude",
    "briefing": "LOGHORIZONTRPG.ActionTimingBriefing",
    "resttime": "LOGHORIZONTRPG.ActionTimingRest",
    "major": "LOGHORIZONTRPG.ActionTimingMajor",
    "minor": "LOGHORIZONTRPG.ActionTimingMinor",
    "move": "LOGHORIZONTRPG.ActionTimingMove",
    "instant": "LOGHORIZONTRPG.ActionTimingInstant",
    "mainprocess": "LOGHORIZONTRPG.ActionTimingMainProcess",
    "setup": "LOGHORIZONTRPG.ActionTimingSetup",
    "initiative": "LOGHORIZONTRPG.ActionTimingInitiative",
    "cleanup": "LOGHORIZONTRPG.ActionTimingCleanup",
    "beforecheck": "LOGHORIZONTRPG.ActionTimingBeforeCheck",
    "aftercheck": "LOGHORIZONTRPG.ActionTimingAfterCheck",
    "damageroll": "LOGHORIZONTRPG.ActionTimingDamageRoll",
    "beforedamage": "LOGHORIZONTRPG.ActionTimingBeforeDamage",
    "afterdamage": "LOGHORIZONTRPG.ActionTimingAfterDamage",
    "action": "LOGHORIZONTRPG.ActionTimingAction",
    "refer": "LOGHORIZONTRPG.ActionTimingRefer"
};

LOGHORIZONTRPG.difficultyTypes = {
    "detection": "LOGHORIZONTRPG.ActionCheckDifficultyDetection",
    "identification": "LOGHORIZONTRPG.ActionCheckDifficultyIdentification",
    "analysis": "LOGHORIZONTRPG.ActionCheckDifficultyAnalysis",
    "disable": "LOGHORIZONTRPG.ActionCheckDifficultyDisable",
    "static": "LOGHORIZONTRPG.ActionCheckDifficultyStatic",
    "refer": "LOGHORIZONTRPG.ActionCheckDifficultyRefer"
};

LOGHORIZONTRPG.targetTypes = {
    "Self": "LOGHORIZONTRPG.ActionTargetSelf",
    "single": "LOGHORIZONTRPG.ActionTargetSingle",
    "multiple": "LOGHORIZONTRPG.ActionTargetMultiple",
    "areap": "LOGHORIZONTRPG.ActionTargetAreaP",
    "areaa": "LOGHORIZONTRPG.ActionTargetAreaA",
    "widep": "LOGHORIZONTRPG.ActionTargetWideP",
    "widea": "LOGHORIZONTRPG.ActionTargetWideA",
    "linep": "LOGHORIZONTRPG.ActionTargetLineP",
    "linea": "LOGHORIZONTRPG.ActionTargetLineA",
    "refer": "LOGHORIZONTRPG.ActionTargetRefer"
};

LOGHORIZONTRPG.status = {
    "regen": "LOGHORIZONTRPG.StatusRegen",
    "barrier": "LOGHORIZONTRPG.StatusBarrier",
    "cancel": "LOGHORIZONTRPG.StatusCancel",
    "weakness": "LOGHORIZONTRPG.StatusWeakness",
    "incapacitated": "LOGHORIZONTRPG.StatusIncapacitated",
    "dead": "LOGHORIZONTRPG.StatusDead",
    "staggered": "LOGHORIZONTRPG.StatusStaggered",
    "dazed": "LOGHORIZONTRPG.StatusDazed",
    "rigor": "LOGHORIZONTRPG.StatusRigor",
    "confusion": "LOGHORIZONTRPG.StatusConfusion",
    "decay": "LOGHORIZONTRPG.StatusDecay",
    "pursuit": "LOGHORIZONTRPG.StatusPursuit",
    "afflicted": "LOGHORIZONTRPG.StatusAfflicted",
    "overconfident": "LOGHORIZONTRPG.StatusOverconfident",
    "other": "LOGHORIZONTRPG.StatusOther"
};

LOGHORIZONTRPG.targetTypesMulti = ["multiple", "widep", "widea", "linep", "linea"];

LOGHORIZONTRPG.actionBonus = {
    "srd": "LOGHORIZONTRPG.ActionBonusSRD",
    "sr": "LOGHORIZONTRPG.ActionBonusSR",
    "strbase": "LOGHORIZONTRPG.ActionBonusStrBase",
    "dexbase": "LOGHORIZONTRPG.ActionBonusDexBase",
    "powbase": "LOGHORIZONTRPG.ActionBonusPowBase",
    "intbase": "LOGHORIZONTRPG.ActionBonusIntBase",
    "strmod": "LOGHORIZONTRPG.ActionBonusStrMod",
    "dexmod": "LOGHORIZONTRPG.ActionBonusDexMod",
    "powmod": "LOGHORIZONTRPG.ActionBonusPowMod",
    "intmod": "LOGHORIZONTRPG.ActionBonusIntMod",
    "patk": "LOGHORIZONTRPG.ActionBonusPatk",
    "matk": "LOGHORIZONTRPG.ActionBonusMatk",
    "recovery": "LOGHORIZONTRPG.ActionBonusRecovery",
    "cr": "LOGHORIZONTRPG.ActionBonusCR"
};
