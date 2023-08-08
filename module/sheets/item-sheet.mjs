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

    // Create drag data
    let dragData;

    // Active Effect
    if ( li.dataset.effectId ) {
      const effect = this.item.effects.get(li.dataset.effectId);
      dragData = effect.toDragData();
    }

    if ( !dragData ) return;

    // Set data transfer
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }
  /*
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
  */

  /** @override */
  _onDrop(event) {
    console.log("_onDrop");
    console.log(event);
    // Try to extract the data
    const data = TextEditor.getDragEventData(event);
    const item = this.item;
    console.log(data);
    
    if (data.type == "ActiveEffect") {
      return this._onDropActiveEffect(event, data);
    }
    if (data.type == "Item") {
      return this._onDropItem(event, data);
    }
    return false;
  }
  /* 
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
      console.log(this);
      if (theItem.system.magicgrade != undefined) {
        return this._onDropEnchantment(event, theItem);
      }
      if (this.item.type == "class" && theItem.type == "skill") {
        return this._onDropSkill(event, theItem);
      }
      return false;
    }
    return false;
  }
  */

  async _onDropItem(event, data) {
    const droppedItem = await Item.implementation.fromDropData(data)
    //const theItem = game.items.get(data.uuid);
    console.log(droppedItem);
    console.log(this);
    if (droppedItem.system.magicgrade != undefined) {
      return this._onDropEnchantment(event, droppedItem);
    }
    if (this.item.type == "class" && droppedItem.type == "skill") {
      return this._onDropSkill(event, droppedItem);
    }
    return false;
  }

  async _onDropSkill(event, droppedItem) {
    console.log("_onDropSkill: enter");
    console.log(droppedItem);
    const item = this.item;
    if ( !this.isEditable || !droppedItem ) return false;
    console.log("_onDropSkill: editable");
    if (droppedItem.uuid === item.uuid) return false;
    console.log("_onDropSkill: not same item");

    let skills = duplicate(item.system.skills);
    let skillData = {"type": "skill", "uuid": droppedItem.uuid};
    console.log(skillData);
    //skills.push(new Item(droppedItem));
    skills.push(skillData);
    return item.update({['system.skills']: skills});
    //return Item.create(data.data, {parent: item});
    //return ActiveEffect.create(data.data, {parent: item})
  }


  async _onDropActiveEffect(event, data) {
    console.log("_onDropActiveEffect: enter");
    const effect = await ActiveEffect.implementation.fromDropData(data);
    const item = this.item;
    if ( !this.isEditable || !effect ) return false;
    console.log("_onDropActiveEffect: editable");
    if (effect.parent.uuid === item.uuid || effect.origin === item.uuid) return false;
    console.log("_onDropActiveEffect: not same item");
    return ActiveEffect.create({
      ...effect.toObject(),
      origin: this.item.uuid
    }, {parent: this.item});
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
    changes[`data.tags`] =  `${item.system.tags}, [M${enchantmentData.data.magicgrade}], ${enchantmentData.data.tags}`;
    changes[`data.description`] = item.system.description + "<p>&nbsp;</p>" + enchantmentData.data.description;

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
    if (true || !item.isOwned) {
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
    return `${path}/item-${this.item.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    // Retrieve base data structure.
    const context = super.getData();

    // Use a safe clone of the item data for further operations.
    const item = context.item;
    context.config = CONFIG.LOGHORIZONTRPG;

    // Retrieve the roll data for TinyMCE editors.
    context.rollData = {};
    let actor = this.object?.parent ?? null;
    if (actor) {
      context.rollData = actor.getRollData();
    }
    
    if (context.item.type == "class") {
      await this._prepareSkills(context)
    }
    
    context.effects = prepareActiveEffectCategories(this.item.effects, this);
    
    // Add the actor's data to context.system for easier access, as well as flags.
    context.system = item.system;
    context.flags = item.flags;

    // Enrich description text for editor
    context.enrichedDescription = await TextEditor.enrichHTML(context.system.description, {async: true});
    
    return context;
  }

  async _prepareSkills(context) {
      const skills = {
        "Combat": [],
        "General": [],
        "Basic": [],
        "Other": []
      };

      for (let i of context.item.system.skills) {
        let skill = await fromUuid(i.uuid);
        console.log(i)
        console.log(skill)
        skill.img = skill.img || DEFAULT_TOKEN;
        if (skill.type === 'skill') {
          if (skill.system.tags) {
            if (skill.system.tags.includes("General")) {
                skills["General"].push(skill);
            }
            else if (skill.system.tags.includes("Combat")) {
                skills["Combat"].push(skill);
            }
            else if (skill.system.tags.includes("Basic")) {
                skills["Basic"].push(skill);
            }
            else {
                skills["Other"].push(skill);
            }
          }
          else {
              skills["Other"].push(skill);
          }
        }
      }

      context.skills = skills;
      console.log(context.skills);
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      //const item = this.item.system.skills.get(li.data("itemId"));
      const skill = this.item.system.skills.find(i => i.uuid == li.data("itemId"));
      console.log(skill);
      skill.sheet.render(true);
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    //html.find('.item-create').click(this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      if (this.item.isOwned) return ui.notifications.warn("Cannot delete skills from owned class");
      //const skill = this.item.system.skills.get(li.data("itemId"));
      console.log(this);
      console.log(li.data("itemId"));
      const skills = this.item.system.skills.filter(i => i.uuid != li.data("itemId"));
      console.log(skills);
      //skill.delete();
      this.item.update({['data.skills']: skills});
      //li.slideUp(200, () => this.render(false));
    });

    html.find(".effect-control").click(async ev => {await onManageActiveEffect(ev, this.item); this.render()});

    // Roll handlers, click handlers, etc. would go here.
  }

  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      data: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.data["type"];
    // Finally, create the item!


    let skills = duplicate(this.item.system.skills);
    skills.push(new Item(itemData));
    return await this.item.update({['data.skills']: skills});

    //return await Item.create(itemData, {parent: this.actor});
  }
}
