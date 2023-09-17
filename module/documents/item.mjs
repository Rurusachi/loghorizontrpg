import SkillUseDialog from "../apps/skill-use-dialog.mjs";

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class LogHorizonTRPGItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */

  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();

  }

  prepareDerivedData() {
    const data = this.system;
    const config = CONFIG.LOGHORIZONTRPG;
    const labels = this.labels = {};
    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    // abilities

    if (data.limit != undefined && data.limit.type != "None") {
        if (data.limit.addsr == "x" && data.sr?.value != undefined) {
            data.limit.max = data.sr.value * data.limit.bonus;
        }
        else if (data.limit.addsr == "+" && data.sr?.value != undefined) {
            data.limit.max = data.sr.value + data.limit.bonus;
        }
        else {
            data.limit.max = data.limit.bonus;
        }
    }

    if (data.hatecost != undefined) {
        if (data.hatecost.value != undefined && data.hatecost.value != "Refer" && parseInt(data.hatecost.value) != NaN) {
            data.hatecost.total = parseInt(data.hatecost.value) + (data.hatecost.addsr && data.sr?.value != undefined ? data.sr.value : 0);
        } else {
            data.hatecost.total = 0;
        }
    }
    if (data.target != undefined) {
        const targetTypesMulti = config.targetTypesMulti;
        if (targetTypesMulti.includes(data.target.type)) {
            data.target.total = data.target.value + (data.target.addsr && data.sr?.value != undefined ? data.sr.value : 0);
        } else {
            data.target.total = 0;
        }
    }
    if (this.hasAction) {
        labels.check = `Check: ${this.getCheckString}`;
        labels.target = data.target != undefined ? `Target: ${this.getTargetString}` : "";
        labels.range = `Range: ${data.range.value}`;
        labels.hatecost = data.hatecost.total != 0 ? `Hate: ${data.hatecost.total}`: "";
        labels.fatecost = data.fatecost.value != 0 && data.fatecost.value != undefined ? `Fate: ${data.fatecost.value}` : "";
        if (data.sr != undefined) {
          labels.sr = `SR: ${data.sr.value}/${data.sr.max}`;
        }
    }

        
    if (typeof data.tags === "string"){
      console.log(this);
      console.log("STRING TAG!!");
    }

  }
  /**
   * Prepare a data object which is passed to any Roll formulas which are created related to this Item
   * @private
   */
   getRollData() {
    // If present, return the actor's roll data.
    if ( !this.actor ) return null;
    const rollData = this.actor.getRollData();
    rollData.item = foundry.utils.deepClone(this.system);


    return rollData;
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  /**
  async roll() {
    const item = this.data;

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[${item.type}] ${item.name}`;

    // If there's no roll data, send a chat message.
    if (!this.system.formula) {
      ChatMessage.create({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
        content: item.data.description ?? ''
      });
    }
    // Otherwise, create a roll and send a chat message from it.
    else {
      // Retrieve roll data.
      const rollData = this.getRollData();

      // Invoke the roll and submit it to chat.
      const roll = new Roll(rollData.item.formula.value, rollData).roll();
      roll.toMessage({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
      });
      return roll;
    }
  }
**/

  async roll() {
      const configureDialog = true;
      const item = this;

      const id = this.system;                // Item system data
      const actor = this.actor;
      const ad = actor.system;               // Actor system data

      // Reference aspects of the item data necessary for usage
      const limit = id.limit;              // Limited uses

      // Define follow-up actions resulting from the item usage
      let consumeLimit = limit.type != "None";
      let consumeHate = id.hatecost.total > 0;
      let consumeFate = id.fatecost.value > 0;
      let consumeItem = item.type === "consumable";
      let hateChange = 0;
      let fateChange = 0;
      const hasAction = this.hasAction;
      //const hasAction = item.type === "skill" || item.type === "weapon" || item.type === "equipment" || item.type === "consumable" || item.type === "item"

      if (configureDialog && hasAction) {
          const configuration = await SkillUseDialog.create(this);
          if (!configuration) return;

          // Determine consumption preferences
          consumeLimit = Boolean(configuration.consumeLimit);
          consumeHate = Boolean(configuration.consumeHate);
          consumeFate = Boolean(configuration.consumeFate);
          consumeItem = Boolean(configuration.consumeItem);
          hateChange = Number(configuration.hateChange);
          fateChange = Number(configuration.fateChange);

      }

      // Determine whether the item can be used by testing for resource consumption
      const usage = this._getUsageUpdates({consumeLimit, consumeHate, consumeFate, consumeItem, hateChange, fateChange});
      if ( !usage ) return;
      const {actorUpdates, itemUpdates} = usage;

      // Commit pending data updates
      if ( !foundry.utils.isEmpty(itemUpdates) ) await this.update(itemUpdates);
      //if ( consumeQuantity && (item.system.quantity === 0) ) await item.delete();
      if ( !foundry.utils.isEmpty(actorUpdates) ) await actor.update(actorUpdates);


      // Initialize chat data.
      const speaker = ChatMessage.getSpeaker({ actor: this.actor });
      const rollMode = game.settings.get('core', 'rollMode');
      const label = `[${item.type}] ${item.name}`;

      return this.displayCard(rollMode);
  }

  _getUsageUpdates({consumeLimit, consumeHate, consumeFate, consumeItem, hateChange, fateChange}) {

    // Reference item data
    const id = this.system;
    const actorUpdates = {};
    const itemUpdates = {};

    if ( consumeLimit ) {
        const limit = id.limit;
        let used = false;

        if (limit.value > 0) {
          used = true;
          itemUpdates["data.limit.value"] = limit.value - 1;
        }
    }

    if ( consumeHate && this.actor.system.hate != undefined) {
        const hatecost = id.hatecost;

        actorUpdates["data.hate.value"] = Math.max(this.actor.system.hate.value + hatecost.total + hateChange, 0);
    }

    if ( consumeFate ) {
        const fatecost = id.fatecost;
        if (this.actor.system.fate.value > 0) {
            actorUpdates["data.fate.value"] = Math.max(this.actor.system.fate.value - fatecost.value - fateChange, 0);
        }
    }

    if ( consumeItem ) {
        if (id.quantity > 0) {
            itemUpdates["data.quantity"] = id.quantity - 1;
        }
    }

    // Return the configured usage
    return {itemUpdates, actorUpdates};
  }



  async displayCard(rollMode) {
      const token = this.actor.token;
      const config = CONFIG.LOGHORIZONTRPG;
      const itemData = this.system;

      const checkType = this.getCheckString;
      const targetType = this.getTargetString;

      const templateData = {
      actor: this.actor,
      tokenId: token?.uuid || null,
      item: this,
      data: await this.getChatData(),
      labels: this.labels,
      hasFormula: this.hasFormula,
      hasCasterCheck: this.hasCasterCheck,
      hasTargetCheck: this.hasTargetCheck,
      hasSecondFormula: this.hasSecondFormula,
      checkTypeMessage: checkType,
      targetTypeMessage: targetType,
      config: CONFIG.LOGHORIZONTRPG
    };
    const html = await renderTemplate("systems/loghorizontrpg/templates/chat/item-card.html", templateData);


    const chatData = {
      user: game.user.id,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: html,
      flavor: this.system.chatFlavor || this.name,
      speaker: ChatMessage.getSpeaker({actor: this.actor, token}),
      flags: {"core.canPopout": true}
    };

    if ( (this.type === "consumable") && !this.actor.items.has(this.id) ) {
      chatData.flags["loghorizontrpg.itemData"] = this;
    }

    ChatMessage.applyRollMode(chatData, game.settings.get("core", "rollMode"));

    return ChatMessage.create(chatData);
  }

  async getChatData(htmlOptions={}){
    const data = foundry.utils.deepClone(this.system);
    const labels = this.labels;
    data.description = await TextEditor.enrichHTML(data.description, htmlOptions);

    const props = [];
    const fn = this[`_${this.type}ChatData`];
    if ( fn ) fn.bind(this)(data, labels, props);

    if (this.hasAction) {
      props.push(
        labels.check,
        labels.target,
        labels.range,
        labels.hatecost,
        labels.fatecost
      );
      if (labels.sr != undefined) {
          props.push(labels.sr);
      }
    }

    data.properties = props.filter(p => !!p);
    return data;
  }

  static chatListeners(html) {
    html.on('click', '.card-buttons button', this._onChatCardAction.bind(this));
    html.on('click', '.item-name', this._onChatCardToggleContent.bind(this));
  }

  static async _onChatCardAction(event) {
    event.preventDefault();


    const button = event.currentTarget;
    button.disabled = true;
    const card = button.closest(".chat-card");
    const messageId = card.closest(".message").dataset.messageId;
    const message =  game.messages.get(messageId);
    const action = button.dataset.action;

    // You must be owner, GM, or rolling a target check
    const isTargetted = action === "targetcheck";
    if ( !( isTargetted || game.user.isGM || message.isAuthor ) ) return;

    const actor = await this._getChatCardActor(card);
    if ( !actor ) return;

    const storedData = message.getFlag("loghorizontrpg", "itemData");
    const item = storedData ? new this(storedData, {parent: actor}) : actor.items.get(card.dataset.itemId);
    if ( !item ) {
      return ui.notifications.error("No Item")
    }

    switch ( action ) {
      case "castercheck":
        await actor.rollAttributeCheck(button.dataset.attribute, false, { event, item });
      break;

      case "targetcheck":
        const targets = this._getChatCardTargets(card);
        for ( let token of targets ) {
            const speaker = ChatMessage.getSpeaker({scene: canvas.scene, token: token});
            await token.actor.rollAttributeCheck(button.dataset.attribute, true, { event, item, speaker });
          }
      break;

      case "formula":
        await item.rollFormula(item.system.formula, {event});
      break;

      case "secondformula":
        await item.rollFormula(item.system.secondformula, {event});
      break;
    }

    button.disabled = false;
  }

  static _onChatCardToggleContent(event) {
  event.preventDefault();
  const header = event.currentTarget;
  const card = header.closest(".chat-card");
  const content = card.querySelector(".card-content");
  content.style.display = content.style.display === "none" ? "block" : "none";
}


async rollFormula(formula, options={}) {
    const itemData = this.system;
    const actorData = this.actor.system;
    const config = CONFIG.LOGHORIZONTRPG;
    const localized = {};
    Object.entries(config.combatstats).map(v => localized[v[0]] = game.i18n.localize(v[1]));
    Object.entries(config.abilities).map(v => {
        localized[`${v[0]}base`] = `Base ${game.i18n.localize(v[1])}`;
        localized[`${v[0]}mod`] = `${game.i18n.localize(v[1])} Mod`;
    });
    localized["cr"] = "CR";

    const parts = [];
    const data = {};

    for (let [k, v] of Object.entries(formula.bonus)) {
        if (v) {
            parts.push(`@${k}`);
            if (k == "sr") {
                data[k] = `${formula.bonusmultiplier[k] * itemData.sr.value}[SR]`;
            }
            else if (k == "srd") {
                data[k] = `${formula.bonusmultiplier[k] * itemData.sr.value}d6[SRD]`;
            }
            else if (["patk", "matk", "recovery"].includes(k)) {
                data[k] = `${formula.bonusmultiplier[k] * actorData.combatstats[k].total}[${localized[k]}]`;
            }
            else if (["strmod", "dexmod", "powmod", "intmod"].includes(k)) {
                data[k] = `${formula.bonusmultiplier[k] * actorData.abilities[k.slice(0,3)].mod}[${localized[k]}]`;
            }
            else if (["strbase", "dexbase", "powbase", "intbase"].includes(k)) {
                data[k] = `${formula.bonusmultiplier[k] * actorData.abilities[k.slice(0,3)].base}[${localized[k]}]`;
            }
            else if (k == "cr") {
                data[k] = `${formula.bonusmultiplier[k] * actorData.cr}[CR]`;
            }
            else {
                console.log(k);
            }
        }
    }

    if (options.parts?.length > 0) {
      parts.push(...options.parts);
    }

    if (options.data?.length > 0) {
      data.push(...options.data);
    }

    let finalFormula = formula.value;

    for (let [k, v] of Object.entries(parts)) {
        if (data[v.slice(1)]){
            finalFormula = finalFormula + " + " + v;
        }
    }

    const finalData = mergeObject(this.getRollData(), data);

    const roll = new Roll(finalFormula, finalData);
    try {
        await roll.roll();
        roll.toMessage({
          speaker: options.speaker || ChatMessage.getSpeaker({actor: this}),
          flavor: `${this.name} - Formula`,
        });
        return roll;
    } catch (e) {
        console.log(e);
        roll.toMessage({
          speaker: options.speaker || ChatMessage.getSpeaker({actor: this}),
          flavor: `${this.name} - Formula - ${e}`,
        });
    }

    return null;
}

  get hasCasterCheck() {
    return ["basic", "opposed"].includes(this.system.check.type);
  }

  get hasTargetCheck() {
    return ["opposed"].includes(this.system.check.type);
  }

  get hasFormula() {
    return this.system.formula.value != "";
  }

  get hasSecondFormula() {
    return this.system.secondformula.value != "";
  }

  get hasAction() {
      return (this.system?.hasaction == true ?? false) || this.type === "skill" || this.type === "consumable";
  }

  async toggleEquipped() {
    const itemData = this;
    const actorData = this.actor;

    const effects = actorData.effects?.filter((e => e.origin === `Actor.${actorData.id}.Item.${itemData.id}`));
    for ( let e of effects ) {
        // If an ActiveConfig sheet is attached the object is too large to expand
        e._sheet = null;
        e.disabled = itemData.system.equipped;
    }

    const changes = await this.actor.updateEmbeddedDocuments("ActiveEffect", effects);
    const itemupdate = await this.update({"data.equipped": !itemData.system.equipped});

    return itemupdate;
  }

  static async _getChatCardActor(card) {
    // Case 1 - a synthetic actor from a Token
    if ( card.dataset.tokenId ) {
      const token = await fromUuid(card.dataset.tokenId);
      if ( !token ) return null;
      return token.actor;
    }

    // Case 2 - use Actor ID directory
    const actorId = card.dataset.actorId;
    return game.actors.get(actorId) || null;
  }

  static _getChatCardTargets(card) {
      let targets = canvas.tokens.controlled.filter(t => !!t.actor);
      if ( !targets.length && game.user.character ) targets = targets.concat(game.user.character.getActiveTokens());
      if ( !targets.length ) ui.notifications.warn("No token selected");
      return targets;
  }

  get getTargetString() {
      const itemData = this.system;
      const config = CONFIG.LOGHORIZONTRPG;

      if (itemData.target.total == 0) {
          return game.i18n.format(config.targetTypes[itemData.target.type]);
      }
      else if (itemData.target.type != "multiple") {
          const typesplit = game.i18n.format(config.targetTypes[itemData.target.type]).split(" ");
          return game.i18n.format("LOGHORIZONTRPG.ActionTargetString", {type1: typesplit[0], number: itemData.target.value, type2: typesplit[1]});
      }
      else {
          return itemData.target.total;
      }
  }

  get getCheckString() {
      const itemData = this.system;
      const config = CONFIG.LOGHORIZONTRPG;

      if (!this.hasAction) {
          return "";
      }

      let checkType = game.i18n.format(config.checkTypes[itemData.check.type]);
      if (["basic", "opposed"].includes(itemData.check.type)){
          let casterCheck = ""
          if (itemData.check.caster != "none") {
              casterCheck = game.i18n.format(config.attributes[itemData.check.caster]);
          }
          let targetCheck = "";
          if (itemData.check.type == "basic") {
              targetCheck = game.i18n.format(config.difficultyTypes[itemData.check.target]);
          } else {
              targetCheck = game.i18n.format(config.attributes[itemData.check.target]);
          }
          if ((itemData.check.bonus != null && itemData.check.bonus != 0) || itemData.check.addsr) {
              if (casterCheck == "") {
                  casterCheck = `${itemData.check.bonus + (itemData.check.addsr ? itemData.sr.value : 0)} + 2d6`;
              }
              else {
                  casterCheck = `${casterCheck} + ${itemData.check.bonus + (itemData.check.addsr ? itemData.sr.value : 0)}`;
              }
          }

          if (itemData.check.targetbonus != null && itemData.check.targetbonus != 0) {
              targetCheck = `${targetCheck} + ${itemData.check.targetbonus}`;
          }
          if (itemData.check.target == "static") {
              targetCheck = `${itemData.check.targetbonus}`;
          }

          checkType = game.i18n.format("LOGHORIZONTRPG.ActionCheckVs", {type: checkType, caster: casterCheck, target: targetCheck});
      }
      return checkType;
  }
}
