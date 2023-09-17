import RestDialog from "../apps/rest.mjs";
import { applyLhrpgEffects, ValidSpec } from "../ActiveEffects.mjs";

/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class LogHorizonTRPGActor extends Actor {

    // Add basic skills on creation maybe?
//  /** @inheritdoc */
//  async _preCreate(data, options, userId) {
//    await super._preCreate(data, options, userId);
//    // Add baseskills?
//  }

  /** @override */
  applyActiveEffects() {
    applyLhrpgEffects.bind(this)(ValidSpec.baseSpecsObj, {}, false);
  }

  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();

    applyLhrpgEffects.bind(this)(ValidSpec.derivedSpecsObj, ValidSpec.baseSpecsObj, false);
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the basic actor data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this;
    const data = actorData.system;
    const flags = actorData.flags.loghorizontrpg || {};

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.

    // race (Technically allows for multiple races)
    const raceList = this.items?.filter((s => s.type === "race"));
    for (let i of raceList) {
        // hp
        data.hp.base += i.system.hp.value;
        // fate
        data.fate.max += i.system.fate.value;
        // abilities
        for (let [key, ability] of Object.entries(i.system.abilities)) {
            if (ability?.value != undefined) {
                data.abilities[key].bonus += ability.value;
            }
        }
    }


    if (typeof data.tags === "string"){
        console.log(this);
        console.log("STRING TAG!!");
    }
    
    
    const Tags = new Set();
    
    // class (Technically allows for multiple races)
    const classList = this.items?.filter((s => s.type === "class"));
    for (let i of classList) {
        // hp
        data.hp.base += i.system.hp.value;
        data.hp.mod += i.system.hp.modifier;
        
        // abilities
        for (let [key, ability] of Object.entries(i.system.abilities)) {
            if (ability?.value != undefined) {
                data.abilities[key].bonus += ability.value;
            }
        }
        
        // equippabletags
        if (typeof i.system.equippabletags === "string") {
            for (let tag of i.system.equippabletags.split(" ")) {   
                Tags.add(tag);
            }
        }
    }
    data.equippabletags = Array.from(Tags).join(" ");
    
    
    // abilities
    for (let [key, ability] of Object.entries(data.abilities)) {
        ability.base = ability.value + ability.bonus + (actorData.type === 'character' ? (1 * (data.cr -1)) : 0); // adds cr if player
        ability.mod = Math.floor((ability.base) / 3);
    }

    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;

    // Make modifications to data here. For example:
    const data = actorData.system;

    // equipment
    const itemList = this.items?.filter((s => s.system?.equipped == true));
    for ( let i of itemList ) {
        for (let [key, combatstat] of Object.entries(i.system.combatstats)) {
            if (combatstat?.bonus != undefined) {
                data.combatstats[key].bonus += combatstat.bonus;
            }
        }
        for (let [key, attribute] of Object.entries(i.system.attributes)) {
            if (attribute?.bonus != undefined) {
                data.attributes[key].bonus += attribute.bonus;
            }
            if (attribute?.dice != undefined) {
                data.attributes[key].dice += attribute.dice;
            }
        }
        if (i.system.other?.inventoryslots != undefined) {
            data.inventory.max += i.system.other.inventoryslots
        }
    }

    // attributes
    for (let [key, attribute] of Object.entries(data.attributes)) {
        if (CONFIG.LOGHORIZONTRPG.attributes[key] == undefined) {
            console.log("Unexpected attribute found: " + key);
            continue;
        }
        if (attribute.ability == "highest") {
            attribute.mod = Math.max(data.abilities["str"].mod, data.abilities["dex"].mod, data.abilities["pow"].mod, data.abilities["int"].mod)
        } else {
            attribute.mod = data.abilities[attribute.ability].mod;
        }
        attribute.total = (attribute.mod + attribute.bonus);
    }

    // combatstats
    data.combatstats["pdef"].mod = data.abilities["str"].mod * 2;
    data.combatstats["pdef"].total = data.combatstats["pdef"].mod + data.combatstats["pdef"].bonus + data.combatstats["pdef"].value;

    data.combatstats["mdef"].mod = data.abilities["int"].mod * 2;
    data.combatstats["mdef"].total = data.combatstats["mdef"].mod + data.combatstats["mdef"].bonus + data.combatstats["mdef"].value;

    data.combatstats["initiative"].mod = data.abilities["str"].mod + data.abilities["int"].mod;
    data.combatstats["initiative"].total = data.combatstats["initiative"].mod + data.combatstats["initiative"].bonus + data.combatstats["initiative"].value;

    for (let [key, combatstat] of Object.entries(data.combatstats)) {
        if (combatstat == data.combatstats["pdef"] || combatstat == data.combatstats["mdef"] || combatstat == data.combatstats["initiative"]) {
            continue;
        } else if (combatstat == data.combatstats["speed"]) {
            combatstat.total = 2 + combatstat.bonus + combatstat.value;
        } else {
            combatstat.total = combatstat.bonus + combatstat.value;
        }
    }



    // Max HP calculation
    data.hp.maxbase = data.hp.base + (data.hp.mod * (data.cr -1));
    data.fatigue.max = data.hp.maxbase;
    data.hp.max = data.hp.maxbase - data.fatigue.value;

  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== 'npc') return;

    // Make modifications to data here. For example:
    const data = actorData.system;

    // attributes
    for (let [key, attribute] of Object.entries(data.attributes)) {
        attribute.total = attribute.bonus;
    }
    // combatstats
    for (let [key, combatstat] of Object.entries(data.combatstats)) {
          combatstat.total = combatstat.bonus + combatstat.value;
    }
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    const data = super.getRollData();

    if (data.abilities) {
      for (let [k, v] of Object.entries(data.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    if (data.attributes) {
      for (let [k, v] of Object.entries(data.attributes)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    if (data.combatstats) {
      for (let [k, v] of Object.entries(data.combatstats)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    // Add level for easier access, or fall back to 0.
    /*
    if (data.base.cr) {
      data.cr = data.base.cr ?? 0;
    }
    */

    // Prepare character roll data.

    this._getCharacterRollData(data);
    this._getNpcRollData(data);

    return data;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.type !== 'character') return;

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.

  }

  /**
   * Prepare NPC roll data.
   */
  _getNpcRollData(data) {
    if (this.type !== 'npc') return;

    // Process additional NPC data here.
  }

  async onRest() {
      return RestDialog.restDialog({actor: this});
  }

  async rest(options) {
      const actorData = this.system;

      let all = false;
      if (options.includes("all")) {
          all = true;
      }

      const actionList = this.items?.filter((s => s.system.limit != undefined));
      for ( let s of actionList ) {
          if (options.includes(s.system.limit.type) || all) {
              await s.update({"system.limit.value": s.system.limit.max})
          }
      }

      const updates = {};
      if (options.includes("hp") || all) {
          updates["system.hp.value"] = actorData.hp.maxbase;
      }
      if (options.includes("fatigue") || all) {
          updates["system.fatigue.value"] = actorData.fatigue.min;
      }
      if (options.includes("hate") || all) {
          updates["system.hate.value"] = actorData.hate.min;
      }
      if (options.includes("fate") || all) {
          updates["system.fate.value"] = actorData.fate.max;
      }
      return await this.update(updates);
  }

  async rollAttributeCheck(attributeId, target=false, options={}) {
      let label = "";
      let attribute = Object
      let parts = [];
      let data = {};
      if (attributeId != "none"){
          label = CONFIG.LOGHORIZONTRPG.attributes[attributeId];
          attribute = this.system.attributes[attributeId];
          parts = ["@value", "@total"];
          data = {value: attribute.value, total: attribute.total};
      }

      if (options.item != undefined && target == false) {
          parts.push("@bonus", "@addsr");
          data["bonus"] = options.item.system.check.bonus;
          data["addsr"] = (options.item.system.check.addsr ? `${options.item.system.sr.value}[SR]` : 0);
      }
      else if (options.item != undefined && target == true) {
          parts.push("@bonus");
          data["bonus"] = options.item.system.check.targetbonus;
      }

      if (attribute.dice) {
          parts.push("@dice");
          data["dice"] = `${attribute.dice}d6`;
      }
      if (options.parts?.length > 0) {
        parts.push(...options.parts);
      }

      if (options.data?.length > 0) {
        data.push(...options.data);
      }

      let formula = "2d6";

      if (attribute.static != undefined && attribute.static == "true") {
          formula = "@value";
      } else {
          for (let [k, v] of Object.entries(parts)) {

              if (data[v.slice(1)]){
                  formula = formula + " + " + v;
              }
          }
      }

      const roll = new Roll(formula, data);
      try {
          await roll.roll();
          roll.toMessage({
              speaker: options.speaker || ChatMessage.getSpeaker({actor: this}),
              flavor: `${this.name} - ${game.i18n.localize(label)} Check`,
          });
          return roll;
      } catch (e) {
          console.log(e);
          roll.toMessage({
              speaker: options.speaker || ChatMessage.getSpeaker({actor: this}),
              flavor: `${this.name} - ${game.i18n.localize(label)} Check - ${e}`,
          });
      }

      return null;
  }
}
