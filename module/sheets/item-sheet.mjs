import {onManageActiveEffect, prepareActiveEffectCategories} from "../helpers/effects.mjs";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class LogHorizonTRPGItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["loghorizontrpg", "sheet", "item"],
      width: 520,
      height: 480,
      dragDrop: [{dragSelector: ".item-list .item", dropSelector: null}],
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  /* -------------------------------------------- */
  /*  Drag and Drop                               */
  /* -------------------------------------------- */

  /** @override */
  _canDragStart(selector) {
    return this.isEditable;
  }

  /** @override */
  _canDragDrop(selector) {
    return this.isEditable;
  }

  /** @override */
  _onDragStart(event) {
    const li = event.currentTarget;
    if ( event.target.classList.contains("entity-link") ) return;

    console.log(this);
    console.log(li);
    // Create drag data
    const dragData = {
      actorId: this.actor?.id,
      itemId: this.item.id
    };

    // Active Effect
    if ( li.dataset.effectId ) {
      const effect = this.item.effects.get(li.dataset.effectId);
      dragData.type = "ActiveEffect";
      dragData.data = effect.data;
    }

    // Set data transfer
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  /** @override */
  async _onDrop(event) {
    console.log("_onDrop");
    console.log(event);
    // Try to extract the data
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch (err) {
      return false;
    }
    console.log(data);

    if (data.type == "ActiveEffect") {
      return this._onDropActiveEffect(event, data);
    }
    if (data.type == "Item") {
      const theItem = game.items.get(data.id);
      console.log(theItem);
      if (theItem.data.data.magicgrade != undefined) {
          return this._onDropEnchantment(event, theItem);
      }
      return false;
    }
    return false;
  }

  async _onDropActiveEffect(event, data) {
    console.log("_onDropActiveEffect: enter");
    const item = this.item;
    if ( !this.isEditable || !data.data || item.isOwned ) return;
    console.log("_onDropActiveEffect: editable");
    let sameItem = (data.itemId === item.id);
    if ( sameItem ) return;
    console.log("_onDropActiveEffect: not same item");
    return ActiveEffect.create(data.data, {parent: item})
  }

  async _onDropEnchantment(event, data) {
    console.log("_onDropEnchantment: enter");
    const item = this.item;
    const enchantmentData = data.data;
    console.log(enchantmentData);
    console.log(item);
    if ( !this.isEditable || !data.data) return;
    console.log("_onDropEnchantment: editable");
    let sameItem = (data.id === item.id);
    if ( sameItem ) return;
    console.log("_onDropEnchantment: not same item");

    const changes = []
    for (let [key, combatstat] of Object.entries(enchantmentData.data.combatstats)) {
        if (combatstat?.bonus != undefined) {
            changes[`data.combatstats.${key}.bonus`] = combatstat.bonus + item.data.data.combatstats[key].bonus
            //item.data.data.combatstats[key].bonus += combatstat.bonus;
        }
    }
    //console.log(changes);
    for (let [key, attribute] of Object.entries(enchantmentData.data.attributes)) {
        if (attribute?.bonus != undefined) {
            changes[`data.attributes.${key}.bonus`] = attribute.bonus + item.data.data.attributes[key].bonus
            //item.data.data.attributes[key].bonus += attribute.bonus;
        }
        if (attribute?.dice != undefined) {
            changes[`data.attributes.${key}.dice`] = attribute.dice + item.data.data.attributes[key].dice
            //item.data.data.attributes[key].dice += attribute.dice;
        }
    }
    if (enchantmentData.data.other?.inventoryslots != undefined) {
        changes[`data.other.inventoryslots`] = enchantmentData.data.other.inventoryslots + item.data.data.other.inventoryslots;
        //item.data.data.other.inventoryslots += enchantmentData.data.other.inventoryslots;
    }
    changes[`name`] =  `${data.name} ${item.name}`;
    changes[`data.tags`] =  `${item.data.data.tags}, [M${enchantmentData.data.magicgrade}], ${enchantmentData.data.tags}`;
    changes[`data.description`] = item.data.data.description + "<p>&nbsp;</p>" + enchantmentData.data.description;

    // Action data
    changes[`data.check`] = enchantmentData.data.check;
    changes[`data.limit`] = enchantmentData.data.limit;
    changes[`data.timing`] = enchantmentData.data.timing;
    changes[`data.range`] = enchantmentData.data.range;
    changes[`data.target`] = enchantmentData.data.target;
    changes[`data.hatecost`] = enchantmentData.data.hatecost;
    changes[`data.fatecost`] = enchantmentData.data.fatecost;
    changes[`data.formula`] = enchantmentData.data.formula;
    changes[`data.secondformula`] = enchantmentData.data.secondformula;

    //item.name = data.name + item.name;
    console.log(changes);
    if (!item.isOwned) {
        console.log("enterEffects");
        for (const effect of enchantmentData.effects) {
            console.log(effect);
            await ActiveEffect.create(effect.data, {parent: item});
        }
        console.log("leaveEffects");
    }
    return item.update(changes);
  }

  /** @override */
  get template() {
    const path = "systems/loghorizontrpg/templates/item";
    // Return a single sheet for all item types.
    // return `${path}/item-sheet.html`;

    // Alternatively, you could use the following return statement to do a
    // unique item sheet by type, like `weapon-sheet.html`.
    return `${path}/item-${this.item.data.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve base data structure.
    const context = super.getData();

    // Use a safe clone of the item data for further operations.
    const itemData = context.item.data;
    context.config = CONFIG.LOGHORIZONTRPG;

    // Retrieve the roll data for TinyMCE editors.
    context.rollData = {};
    let actor = this.object?.parent ?? null;
    if (actor) {
      context.rollData = actor.getRollData();
    }

    context.effects = prepareActiveEffectCategories(this.item.effects);

    // Add the actor's data to context.data for easier access, as well as flags.
    context.data = itemData.data;
    context.flags = itemData.flags;

    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    html.find(".effect-control").click(ev => {
        if ( this.item.isOwned ) return ui.notifications.warn("Managing Active Effects within an Owned Item is not currently supported")
        onManageActiveEffect(ev, this.item)
      });

    // Roll handlers, click handlers, etc. would go here.
  }
}
