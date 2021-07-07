/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
 export const preloadHandlebarsTemplates = async function() {
  return loadTemplates([

    // Actor partials.
    "systems/loghorizontrpg/templates/actor/parts/actor-features.html",
    "systems/loghorizontrpg/templates/actor/parts/actor-items.html",
    "systems/loghorizontrpg/templates/actor/parts/actor-skills.html",
    "systems/loghorizontrpg/templates/actor/parts/actor-effects.html",
    "systems/loghorizontrpg/templates/actor/parts/actor-status.html",
    "systems/loghorizontrpg/templates/item/parts/item-combatstats.html",
    "systems/loghorizontrpg/templates/item/parts/item-action.html",
  ]);
};
