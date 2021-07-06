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
          const casterCheck = game.i18n.format(config.attributes[itemData.check.caster]);
          let targetCheck = "";
          if (itemData.check.type == "basic") {
              targetCheck = game.i18n.format(config.difficultyTypes[itemData.check.target]);
          } else {
              targetCheck = game.i18n.format(config.attributes[itemData.check.target]);
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
      checkTypeMessage: checkType
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
        await actor.rollAttributeCheck(button.dataset.attribute, { event, item });
      break;

      case "targetcheck":
        const targets = this._getChatCardTargets(card);
        for ( let token of targets ) {
            const speaker = ChatMessage.getSpeaker({scene: canvas.scene, token: token});
            await token.actor.rollAttributeCheck(button.dataset.attribute, { event, item, speaker });
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

    const parts = [];
    const data = {};

    for (let [k, v] of Object.entries(formula.bonus)) {
        if (v) {
            parts.push(`@${k}`);
            if (k == "sr") {
                data[k] = `${formula.bonusmultiplier[k] * itemData.sr.value}`;
            }
            else if (k == "srd") {
                data[k] = `${formula.bonusmultiplier[k] * itemData.sr.value}d6`;
            }
            else if (["patk", "matk", "recovery"].includes(k)) {
                data[k] = `${formula.bonusmultiplier[k] * actorData.combatstats[k].total}`;
            }
            else if (["strmod", "dexmod", "powmod", "intmod"].includes(k)) {
                data[k] = `${formula.bonusmultiplier[k] * actorData.abilities[k.slice(0,3)].mod}`;
            }
            else if (["strbase", "dexbase", "powbase", "intbase"].includes(k)) {
                data[k] = `${formula.bonusmultiplier[k] * actorData.abilities[k.slice(0,3)].base}`;
            }
            else if (k == "cr") {
                data[k] = `${formula.bonusmultiplier[k] * actorData.cr}`;
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

    const roll = new Roll(finalFormula, data).roll();
    roll.toMessage({
      speaker: options.speaker || ChatMessage.getSpeaker({actor: this}),
      flavor: `${this.name} - Formula`,
    });
    return roll;
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
    //console.log("Toggling equipment");
    const itemData = this.data;
    const actorData = this.actor.data;

    console.log(itemData.data.equipped);

    const effects = actorData.effects?.filter((e => e.data.origin === `Actor.${actorData._id}.Item.${itemData._id}`));

    for ( let e of effects ) {
          //console.log(`Setting effect to ${!itemData.data.equipped}`);
          //console.log(e);
          e.disabled = itemData.data.equipped;
          //lastOne = e.update({disabled: itemData.data.equipped});
    }

    const changes = this.actor.updateEmbeddedDocuments("ActiveEffect", effects);


    const itemupdate = this.update({"data.equipped": !itemData.data.equipped})


    return itemupdate;
      //effect.update({disabled: !effect.data.disabled});
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
