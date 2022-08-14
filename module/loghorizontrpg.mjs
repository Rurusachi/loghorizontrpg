// Import document classes.
import { LogHorizonTRPGActor } from "./documents/actor.mjs";
import { LogHorizonTRPGItem } from "./documents/item.mjs";
// Import sheet classes.
import { LogHorizonTRPGActorSheet } from "./sheets/actor-sheet.mjs";
import { LogHorizonTRPGItemSheet } from "./sheets/item-sheet.mjs";
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { LOGHORIZONTRPG } from "./helpers/config.mjs";
import { measureDistances } from "./helpers/canvas.mjs";
import { ValidSpec } from "./ActiveEffects.mjs";


import RestDialog from "./apps/rest.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function() {

  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.loghorizontrpg = {
    LogHorizonTRPGActor,
    LogHorizonTRPGItem,
    RestDialog,
    rollItemMacro
  };

  // Add custom constants for configuration.
  CONFIG.LOGHORIZONTRPG = LOGHORIZONTRPG;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "@combatstats.initiative.total",
    decimals: 2
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = LogHorizonTRPGActor;
  CONFIG.Item.documentClass = LogHorizonTRPGItem;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("loghorizontrpg", LogHorizonTRPGActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("loghorizontrpg", LogHorizonTRPGItemSheet, { makeDefault: true });

  ValidSpec.createValidMods();

  const originalNextRound = Combat.prototype.nextRound;
  Combat.prototype.nextRound = () => {const value = originalNextRound.apply(game.combat); Hooks.callAll("nextRound", value); return value};

  const originalStartCombat = Combat.prototype.startCombat;
  Combat.prototype.startCombat = () => {const value = originalStartCombat.apply(game.combat); Hooks.callAll("startCombat", value); return value};

  // Sort combatants by Initiative > (Player before NPC) > Name > Id
  Combat.prototype._sortCombatants = (a, b) => {
    const ia = Number.isNumeric(a.initiative) ? a.initiative : -9999;
    const ib = Number.isNumeric(b.initiative) ? b.initiative : -9999;
    let ci = ib - ia;
    if ( ci !== 0 ) return ci;
    if (!a.isNPC && b.isNPC) return -1; // a is player
    if (a.isNPC && !b.isNPC) return 1; // b is player
    let cn = a.name.localeCompare(b.name);
    if ( cn !== 0 ) return cn;
    return a.id - b.id;
  };

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

Hooks.on("nextRound", function(combat) {
  combat.then(result => {
    console.log("Resetting limit/round skills");
    result.combatants.forEach((item, i) => {
        try {
            item.actor?.rest(["round"]);
        } catch (e) {
            console.log(e);
        }
    });

  });
});

Hooks.on("startCombat", function(combat) {
  combat.then(result => {
    console.log("Creating Setup and Cleanup combatants");
    const newCombatants = result.createEmbeddedDocuments("Combatant", [{name: "Setup", initiative: 100},{name: "Cleanup", initiative: -1}]);
    console.log(result);
    console.log(newCombatants);
  });
});

Hooks.on("canvasInit", function() {
  SquareGrid.prototype.measureDistances = measureDistances;
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here are a few useful examples:
Handlebars.registerHelper('concat', function() {
  var outStr = '';
  for (var arg in arguments) {
    if (typeof arguments[arg] != 'object') {
      outStr += arguments[arg];
    }
  }
  return outStr;
});

Handlebars.registerHelper('toLowerCase', function(str) {
  return str.toLowerCase();
});

Handlebars.registerHelper('ifEquals', function(str1, str2, options) {
    return (str1 == str2) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('ifNotEquals', function(str1, str2, options) {
    return (str1 != str2) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('ifNotInArray', function(str1, str2, options) {
    return (!str2.includes(str1)) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('ifInArray', function(str1, list, options) {
    return (list.includes(str1)) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('asIndex', function(arg1, arg2, options) {
    let i = 0;
    let current = options.data.root;
    let paths = arg1.split(".");

    for (i = 0; i < paths.length; ++i) {
        current = current[paths[i]];
    }

    return current[arg2];
});

Handlebars.registerHelper('asIndexMiddle', function(arg1, arg2, options) {
    let i = 0;
    let current = options.data.root;
    let paths = arg1.replace("$arg", arg2).split(".");

    for (i = 0; i < paths.length; ++i) {
        current = current[paths[i]];
    }

    return current;
});

Handlebars.registerHelper('and', function(arg1, arg2) {
    return (arg1 && arg2);
});

Handlebars.registerHelper('or', function(arg1, arg2) {
    return (arg1 || arg2);
});

Handlebars.registerHelper('lequal', function(arg1, arg2) {
    return (arg1 <= arg2);
});

Handlebars.registerHelper('greaterthan', function(arg1, arg2) {
    return (arg1 > arg2);
});

Handlebars.registerHelper('add', function(arg1, arg2) {
    return (arg1 + arg2);
});

Handlebars.registerHelper('localizeTargetType', function(type, number) {
    const typesplit = game.i18n.format(CONFIG.LOGHORIZONTRPG.targetTypes[type]).split(" ");
    return game.i18n.format("LOGHORIZONTRPG.ActionTargetString", {type1: typesplit[0], number: number, type2: typesplit[1]});
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function() {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
});

Hooks.on("renderChatLog", (app, html, data) => LogHorizonTRPGItem.chatListeners(html));
Hooks.on("renderChatPopout", (app, html, data) => LogHorizonTRPGItem.chatListeners(html));
/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  if (data.type !== "Item") return;
  if (!("data" in data)) return ui.notifications.warn("You can only create macro buttons for owned Items");
  const item = data.data;

  // Create the macro command
  const command = `game.loghorizontrpg.rollItemMacro("${item.name}");`;
  let macro = game.macros.entities.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "loghorizontrpg.itemMacro": true }
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemName
 * @return {Promise}
 */
function rollItemMacro(itemName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  const item = actor ? actor.items.find(i => i.name === itemName) : null;
  if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`);

  // Trigger the item roll
  return item.roll();
}
