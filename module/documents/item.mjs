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
    const itemData = this.data;
    const data = itemData.data;
    const config = CONFIG.LOGHORIZONTRPG;
    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    // abilities

    if (data.limit != undefined && data.limit.type != "None") {
        if (data.limit.addsr == "x") {
            data.limit.max = data.sr.value * data.limit.bonus;
        }
        else if (data.limit.addsr == "+") {
            data.limit.max = data.sr.value + data.limit.bonus;
        }
        else {
            data.limit.max = data.limit.bonus;
        }
    }

    if (data.hatecost != undefined) {
        if (data.hatecost.value != undefined && data.hatecost.value != "Refer" && parseInt(data.hatecost.value) != NaN) {
            data.hatecost.total = parseInt(data.hatecost.value) + (data.hatecost.addsr ? data.sr.value : 0);
        } else {
            data.hatecost.total = 0;
        }
    }
    if (data.target != undefined) {
        const targetTypesMulti = config.targetTypesMulti;
        if (targetTypesMulti.includes(data.target.type)) {
            data.target.total = data.target.value + (data.target.addsr ? data.sr.value : 0);
        } else {
            data.target.total = 0;
        }
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
    rollData.item = foundry.utils.deepClone(this.data.data);


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
    if (!this.data.data.formula) {
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
      const item = this.data;

      // Initialize chat data.
      const speaker = ChatMessage.getSpeaker({ actor: this.actor });
      const rollMode = game.settings.get('core', 'rollMode');
      const label = `[${item.type}] ${item.name}`;

      return this.displayCard(rollMode);
  }

  async displayCard(rollMode) {
      const token = this.actor.token;
      const config = CONFIG.LOGHORIZONTRPG;
      const itemData = this.data.data;

      let checkType = game.i18n.format(config.checkTypes[itemData.check.type]);
      if (["basic", "opposed"].includes(itemData.check.type)){
          let casterCheck = game.i18n.format(config.attributes[itemData.check.caster]);
          let targetCheck = "";
          if (itemData.check.type == "basic") {
              targetCheck = game.i18n.format(config.difficultyTypes[itemData.check.target]);
          } else {
              targetCheck = game.i18n.format(config.attributes[itemData.check.target]);
          }
          if ((itemData.check.bonus != null && itemData.check.bonus != 0) || itemData.check.addsr) {
              casterCheck = `${casterCheck} + ${itemData.check.bonus + (itemData.check.addsr ? itemData.sr.value : 0)}`;
          }

          if (itemData.check.targetbonus != null && itemData.check.targetbonus != 0) {
              targetCheck = `${targetCheck} + ${itemData.check.targetbonus}`;
          }
          if (itemData.check.target == "static") {
              targetCheck = `${itemData.check.targetbonus}`;
          }

          checkType = game.i18n.format("LOGHORIZONTRPG.ActionCheckVs", {type: checkType, caster: casterCheck, target: targetCheck});
      }

      const templateData = {
      actor: this.actor,
      tokenId: token?.uuid || null,
      item: this.data,
      data: this.getChatData(),
      labels: this.labels,
      hasFormula: this.hasFormula,
      hasCasterCheck: this.hasCasterCheck,
      hasTargetCheck: this.hasTargetCheck,
      hasSecondFormula: this.hasSecondFormula,
      checkTypeMessage: checkType,
      config: CONFIG.LOGHORIZONTRPG
    };
    const html = await renderTemplate("systems/loghorizontrpg/templates/chat/item-card.html", templateData);


    const chatData = {
      user: game.user._id,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: html,
      flavor: this.data.data.chatFlavor || this.name,
      speaker: ChatMessage.getSpeaker({actor: this.actor, token}),
      flags: {"core.canPopout": true}
    };

    if ( (this.data.type === "consumable") && !this.actor.items.has(this.id) ) {
      chatData.flags["loghorizontrpg.itemData"] = this.data;
    }

    ChatMessage.applyRollMode(chatData, game.settings.get("core", "rollMode"));

    return ChatMessage.create(chatData);
  }

  getChatData(htmlOptions={}){
    const data = foundry.utils.deepClone(this.data.data);
    const labels = this.labels;
    data.description = TextEditor.enrichHTML(data.description, htmlOptions);

    const props = [];
    const fn = this[`_${this.data.type}ChatData`];
    if ( fn ) fn.bind(this)(data, labels, props);

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
        await item.rollFormula(item.data.data.formula, {event});
      break;

      case "secondformula":
        await item.rollFormula(item.data.data.secondformula, {event});
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
    const itemData = this.data.data;
    const actorData = this.actor.data.data;
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

    const roll = new Roll(finalFormula, data);
    try {
        roll.roll();
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
    return ["basic", "opposed"].includes(this.data.data.check.type);
  }

  get hasTargetCheck() {
    return ["opposed"].includes(this.data.data.check.type);
  }

  get hasFormula() {
    return this.data.data.formula.value != "";
  }

  get hasSecondFormula() {
    return this.data.data.secondformula.value != "";
  }

  async toggleEquipped() {
    const itemData = this.data;
    const actorData = this.actor.data;

    const effects = actorData.effects?.filter((e => e.data.origin === `Actor.${actorData._id}.Item.${itemData._id}`));
    for ( let e of effects ) {
        // If an ActiveConfig sheet is attached the object is too large to expand
        e._sheet = null;
        e.disabled = itemData.data.equipped;
    }

    const changes = this.actor.updateEmbeddedDocuments("ActiveEffect", effects);
    const itemupdate = this.update({"data.equipped": !itemData.data.equipped});

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
}
