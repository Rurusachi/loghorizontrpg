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

import '../scss/loghorizontrpg.scss';
import '@yaireo/tagify/src/tagify.scss';


import RestDialog from "./apps/rest.mjs";
import CompendiumBrowserDialog from "./apps/compendium-browser.mjs";
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

  game.settings.register("loghorizontrpg", "systemMigrationVersion", {
    name: "System Migration Version",
    scope: "world",
    config: true,
    type: String,
    default: ""
  });

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

  // ActiveEffect transfer setting
  CONFIG.ActiveEffect.legacyTransferral = false;


  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

Hooks.on('renderCompendiumDirectory', async function() {
  console.log('renderCompendiumDirectory ');
  addCompendiumButton();
});

Hooks.once('ready', async function() {
  
  if ( !game.user.isGM ) return;

  const compendium = game.modules.get("loghorizontrpg-compendium")
  if (compendium === undefined) {
    ui.notifications.warn(`"Log Horizon Compendium module" not installed. Go to this system's github page for more information (https://github.com/Rurusachi/loghorizontrpg)`, {permanent: true});
    showLatestVersionInfo();
  } else if (compendium.active === false) {
    ui.notifications.warn(`"Log Horizon Compendium" module not enabled. It can be enabled in Manage Modules`, {permanent: true});
  }

  // Determine whether to migrate (based on 5e system code)
  const cv = game.settings.get("loghorizontrpg", "systemMigrationVersion") 
  const totalDocuments = game.actors.size + game.scenes.size + game.items.size;
  if ( !cv && totalDocuments === 0 ) return game.settings.set("loghorizontrpg", "systemMigrationVersion", game.system.version); // Set version if new world
  if ( cv && !isNewerVersion(game.system.flags.needsMigrationVersion, cv) ) return; // Only migrate if version is older than needsMigrationVersion
  
  // Show info about new version
  showLatestVersionInfo();
  // Migrate
  ui.notifications.info(`Migrating world from version ${cv} to version ${game.system.version}`, {permanent: true});
  await migrateWorld(cv);
});

async function addCompendiumButton() {
  const compendiumBrowserButton = `<button class="compendium-browser-button">${game.i18n.format(CONFIG.LOGHORIZONTRPG.compendium["browser"])}</button>`
  const footer = $("#compendium > footer");
  footer.append(compendiumBrowserButton);

  // TODO: Bind function for the Compendium Browser
  footer.find("button.compendium-browser-button").click(ev => {return new CompendiumBrowserDialog().render(true);});
}

async function showLatestVersionInfo() {
  try {
    const infopage = await fromUuid("Compendium.loghorizontrpg.system-info.JournalEntry.yy2znlPUR5mO59Rl");
    infopage.show();
  } catch (error) {
    console.log(error);
  }
}

async function migrateWorld(fromVersion) {

  // Migrate items with actions if v0.5.0 or older
  if (!fromVersion || !isNewerVersion(fromVersion, "0.5.0")) {
    await migrateHasActionItems();
    console.log("Migrated all items with actions");
  }

  // Migrate tags and effects if v0.4.0 or older
  if (!fromVersion || !isNewerVersion(fromVersion, "0.4.0")) {
    // Migrate actor tags
    await migrateAllActorTags();
    console.log("Migrated all actors");
  
    // Migrate item tags
    await migrateAllItemTags();
    console.log("Migrated all items");
  
    // Migrate effect origins
    await migrateAllEffectOrigins();
    console.log("Migrated all effects");
  }

  // Migration finished
  game.settings.set("loghorizontrpg", "systemMigrationVersion", game.system.version);
  ui.notifications.info(`Migrated world to version ${game.system.version}`, {permanent: true});
}

async function migrateHasActionItems() {
  // HasAction was misspelled as "hasaction" in some places. This means the value was never stored in "hasAction" so it needs to be migrated.
  for (const item of game.items) {
    const hasAction = item.system?.hasaction;
    if (hasAction) {
      console.log(`Migrating hasAction for ${item.name}`);
      
      await item.update({"system.hasAction": hasAction})
    }
  }
}

async function migrateAllActorTags() {
  for (const actor of game.actors) {
    const tags = actor.system?.tags;
    if (typeof tags === "string") {
      console.log(`Migrating tags for ${actor.name}`);
      
      let tagsList;
      if (typeof tags === "string") {
          tagsList = tags.split(",").map(s => s.trim());
      } else {
          tagsList = tags;
      }
      console.log(tagsList);
      await actor.update({"system.tags": tagsList})
    }

    // Migrate owned item tags
    for (const item of actor.items) {
      const tags = item.system?.tags;
      if (typeof tags === "string") {
        console.log(`Migrating tags for ${item.name}`);
        
        let tagsList;
        if (typeof tags === "string") {
            tagsList = tags.split(",").map(s => s.trim());
        } else {
            tagsList = tags;
        }
        console.log(tagsList);
        await item.update({"system.tags": tagsList})
      }
    }
  }

  for (const scene of game.scenes) {
    for (const token of scene.tokens) {
      if (token.isLinked) continue // Skip linked tokens (Should already be migrated)
      console.log("Migrating tags for unlinked token");
      const actor = token.actor
      
      const tags = actor.system?.tags;
      if (typeof tags === "string") {
        console.log(`Migrating tags for ${actor.name}`);
        
        let tagsList;
        if (typeof tags === "string") {
            tagsList = tags.split(",").map(s => s.trim());
        } else {
            tagsList = tags;
        }
        console.log(tagsList);
        await actor.update({"system.tags": tagsList})
      }

      // Migrate owned item tags
      for (const item of actor.items) {
        const tags = item.system?.tags;
        if (typeof tags === "string") {
          console.log(`Migrating tags for ${item.name}`);
          
          let tagsList;
          if (typeof tags === "string") {
              tagsList = tags.split(",").map(s => s.trim());
          } else {
              tagsList = tags;
          }
          console.log(tagsList);
          await item.update({"system.tags": tagsList})
        }
      }
    }
  }
}

async function migrateAllItemTags() {
  for (const item of game.items) {
    const tags = item.system?.tags;
    if (typeof tags === "string") {
      console.log(`Migrating tags for ${item.name}`);
      
      let tagsList;
      if (typeof tags === "string") {
          tagsList = tags.split(",").map(s => s.trim());
      } else {
          tagsList = tags;
      }
      console.log(tagsList);
      await item.update({"system.tags": tagsList})
    }
  }
}


async function migrateAllEffectOrigins() {
  for (const item of game.items) {
    for (const effect of item.effects) {
      console.log(effect);
      const oldOrigin = effect.origin
      if (oldOrigin === null) {
        console.log("NULL ORIGIN");
        continue
      }
      const newOrigin = oldOrigin.replace("loghorizontrpg.", "loghorizontrpg-compendium.")
      console.log(newOrigin);
      await effect.update({"origin": newOrigin})
    }
  }

  
  for (const actor of game.actors) {
    
    for (const effect of actor.effects) {
      console.log(effect);
      const oldOrigin = effect.origin;
      if (oldOrigin === null) {
        console.log("NULL ORIGIN");
        continue
      }
      const newOrigin = oldOrigin.replace("loghorizontrpg.", "loghorizontrpg-compendium.")
      console.log(newOrigin);
      await effect.update({"origin": newOrigin})
    }

    // Migrate owned item's effects
    for (const item of actor.items) {
      for (const effect of item.effects) {
        console.log(effect);
        const oldOrigin = effect.origin
        if (oldOrigin === null) {
          console.log("NULL ORIGIN");
          continue
        }
        const newOrigin = oldOrigin.replace("loghorizontrpg.", "loghorizontrpg-compendium.")
        console.log(newOrigin);
        await effect.update({"origin": newOrigin})
      }
    }
  }

  for (const scene of game.scenes) {
    for (const token of scene.tokens) {
      if (token.isLinked) continue // Skip linked tokens (Should already be migrated)
      console.log("Migrating effects for unlinked token");
      const actor = token.actor
      for (const effect of actor.effects) {
        console.log(effect);
        const oldOrigin = effect.origin;
        if (oldOrigin === null) {
          console.log("NULL ORIGIN");
          continue
        }
        const newOrigin = oldOrigin.replace("loghorizontrpg.", "loghorizontrpg-compendium.")
        console.log(newOrigin);
        await effect.update({"origin": newOrigin})
      }
  
      // Migrate owned item's effects
      for (const item of actor.items) {
        for (const effect of item.effects) {
          console.log(effect);
          const oldOrigin = effect.origin
          if (oldOrigin === null) {
            console.log("NULL ORIGIN");
            continue
          }
          const newOrigin = oldOrigin.replace("loghorizontrpg.", "loghorizontrpg-compendium.")
          console.log(newOrigin);
          await effect.update({"origin": newOrigin})
        }
      }
    }
  }
}

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

Handlebars.registerHelper('ifAnyInArray', function(list1, list2, options) {
    return (list1.some(str => list2.includes(str))) ? options.fn(this) : options.inverse(this);
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

Handlebars.registerHelper('equals', function(arg1, arg2) {
  return (arg1 === arg2);
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
