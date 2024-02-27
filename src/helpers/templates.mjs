/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
 export const preloadHandlebarsTemplates = async function() {
  return loadTemplates([

    // Actor partials.
    "systems/loghorizontrpg/templates/actor/parts/actor-ability.html",
    "systems/loghorizontrpg/templates/actor/parts/actor-combatstat.html",
    "systems/loghorizontrpg/templates/actor/parts/actor-attribute.html",
    "systems/loghorizontrpg/templates/actor/parts/actor-attributes-abilities-editable.html",
    "systems/loghorizontrpg/templates/actor/parts/actor-attributes-abilities.html",
    "systems/loghorizontrpg/templates/actor/parts/actor-features.html",
    "systems/loghorizontrpg/templates/actor/parts/actor-items.html",
    "systems/loghorizontrpg/templates/actor/parts/actor-skills.html",
    "systems/loghorizontrpg/templates/actor/parts/actor-effects.html",
    "systems/loghorizontrpg/templates/actor/parts/actor-status.html",
    "systems/loghorizontrpg/templates/item/parts/item-combatstats.html",
    "systems/loghorizontrpg/templates/item/parts/item-attributes.html",
    "systems/loghorizontrpg/templates/item/parts/item-action.html",
    "systems/loghorizontrpg/templates/item/parts/item-startingskills.html",
    "systems/loghorizontrpg/templates/apps/compendium-browser/parts/settings.html",
    "systems/loghorizontrpg/templates/apps/compendium-browser/parts/classes.html",
    "systems/loghorizontrpg/templates/apps/compendium-browser/parts/items.html",
    "systems/loghorizontrpg/templates/apps/compendium-browser/parts/item-filters.html",
    "systems/loghorizontrpg/templates/apps/compendium-browser/parts/races.html",
    "systems/loghorizontrpg/templates/apps/compendium-browser/parts/skills.html",
    "systems/loghorizontrpg/templates/apps/compendium-browser/parts/skill-filters.html",
  ]);
};
