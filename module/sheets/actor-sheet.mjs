import {onManageActiveEffect, prepareActiveEffectCategories} from "../helpers/effects.mjs";
import RestDialog from "../apps/rest.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class LogHorizonTRPGActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["loghorizontrpg", "sheet", "actor"],
      template: "systems/loghorizontrpg/templates/actor/actor-sheet.html",
      width: 600,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "features" }]
    });
  }

  /** @override */
  get template() {
    return `systems/loghorizontrpg/templates/actor/actor-${this.actor.data.type}-sheet.html`;
  }

  /** @override */
  async _onDropItemCreate(itemData) {
    console.log(itemData);
    if ( itemData.type === "class" ) {
        const actor = this.actor;
        const skills = itemData.data.skills;
        await actor.createEmbeddedDocuments("Item", skills, {parent: actor})
    }
    // Default drop handling if levels were not added
    return super._onDropItemCreate(itemData);
  }

  async _onDropClass(event, data) {
    console.log("_onDropClass: enter");
    const actor = this.actor;
    if ( !this.isEditable || !data.data ) return;
    console.log("_onDropClass: editable");
    let sameItem = (data.itemId === item.id);
    if ( sameItem ) return;
    console.log("_onDropClass: not same item");

    const skills = item.data.data.skills;
    return await actor.createEmbeddedDocuments("Item", skills, {parent: actor})
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = context.actor.data;
    context.config = CONFIG.LOGHORIZONTRPG;

    // Add the actor's data to context.data for easier access, as well as flags.
    context.data = actorData.data;
    context.flags = actorData.flags;

    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this._prepareItems(context);
      this._prepareNpcData(context);
    }

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);

    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {
      this._prepareActorData(context);
  }
  _prepareNpcData(context) {
      this._prepareActorData(context);
      for (let [k, v] of Object.entries(context.data.difficulties)) {
          v.label = game.i18n.localize(CONFIG.LOGHORIZONTRPG.difficultyTypes[k]) ?? k;
      }
  }
  _prepareActorData(context) {
      for (let [k, v] of Object.entries(context.data.abilities)) {
          v.label = game.i18n.localize(CONFIG.LOGHORIZONTRPG.abilities[k]) ?? k;
      }
      for (let [k, v] of Object.entries(context.data.attributes)) {
          v.label = game.i18n.localize(CONFIG.LOGHORIZONTRPG.attributes[k]) ?? k;
      }
      for (let [k, v] of Object.entries(context.data.combatstats)) {
          v.label = game.i18n.localize(CONFIG.LOGHORIZONTRPG.combatstats[k]) ?? k;
      }
      // Status
      for (let [k, v] of Object.entries(context.data.status.combat)) {
          v.label = game.i18n.localize(CONFIG.LOGHORIZONTRPG.status[k]) ?? k;
      }
      for (let [k, v] of Object.entries(context.data.status.life)) {
          v.label = game.i18n.localize(CONFIG.LOGHORIZONTRPG.status[k]) ?? k;
      }
      for (let [k, v] of Object.entries(context.data.status.bad)) {
          v.label = game.i18n.localize(CONFIG.LOGHORIZONTRPG.status[k]) ?? k;
      }
      for (let [k, v] of Object.entries(context.data.status.other)) {
          v.label = game.i18n.localize(CONFIG.LOGHORIZONTRPG.status[k]) ?? k;
      }
  }
  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    // Initialize containers.
    const items = [];
    const weapons = [];
    const equipments = [];
    const consumables = [];
    const featureRace = [];
    const featureClass = [];
    const skills = {
      "Combat": [],
      "General": [],
      "Basic": [],
      "Other": []
    };

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || DEFAULT_TOKEN;
      // Append to gear.
      if (i.type === 'item' ||i.type === 'enchantment') {
        items.push(i);
      }
      else if (i.type === 'weapon') {
        weapons.push(i);
      }
      else if (i.type === 'equipment') {
        equipments.push(i);
      }
      else if (i.type === 'consumable') {
        consumables.push(i);
      }
      // Append to features.
      else if (i.type === 'race') {
        featureRace.push(i);
      }

      else if (i.type === 'class') {
        featureClass.push(i);
      }
      // Append to skills.
      else if (i.type === 'skill') {
        if (i.data.tags) {
          if (i.data.tags.includes("General")) {
              skills["General"].push(i);
          }
          else if (i.data.tags.includes("Combat")) {
              skills["Combat"].push(i);
          }
          else if (i.data.tags.includes("Basic")) {
              skills["Basic"].push(i);
          }
          else {
              skills["Other"].push(i);
          }
        }
        else {
            skills["Other"].push(i);
        }
      }
    }

    // Assign and return
    context.items = items;
    context.weapons = weapons;
    context.equipments = equipments;
    context.consumables = consumables;
    context.featureRace = featureRace;
    context.featureClass = featureClass;
    context.skills = skills;
   }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // Expand summary on click
    html.find('.item .item-name.rollable h4').click(event => this._onItemSummary(event));

    html.find('.items-list .items-header .item-name.hideable').click(event => this._onItemHeader(event));

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    html.find('.item-equip').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.toggleEquipped();
    });

    html.find('.rest').click(this._onRest.bind(this));

    // Active Effect management
    html.find(".effect-control").click(ev => onManageActiveEffect(ev, this.actor));

    // Rollable abilities.
    html.find('.rollable').click(this._onRoll.bind(this));

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  async _onRest(event) {
      event.preventDefault();

      return new RestDialog(this.actor).render(true)
  }

  _onItemHeader(event) {
    event.preventDefault();
    const tag = event.currentTarget.innerText.split(" ")[0];
    const div = $(event.currentTarget).parents(".items-list").children(`.items-in-list.${tag}`);

    // Toggle visibility
    if ( div.hasClass("item-hidden") ) {
      div.slideDown(200);
    } else {
      div.slideUp(200);
    }
    div.toggleClass("item-hidden");
  }

  _onItemSummary(event) {
    event.preventDefault();
    let li = $(event.currentTarget).parents(".item"),
        item = this.actor.items.get(li.data("item-id")),
        chatData = item.getChatData({secrets: this.actor.isOwner});

    // Toggle summary
    if ( li.hasClass("expanded") ) {
      let summary = li.children(".item-summary");
      summary.slideUp(200, () => summary.remove());
    } else {
      let div = $(`<div class="item-summary">${chatData.description}</div>`);
      let props = $(`<div class="item-properties"></div>`);
      chatData.properties.forEach(p => props.append(`<span class="tag">${p}</span>`));
      div.append(props);
      li.append(div.hide());
      div.slideDown(200);
    }
    li.toggleClass("expanded");
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
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
    return await Item.create(itemData, {parent: this.actor});
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
      if (dataset.rollType == 'attribute') {
          this.actor.rollAttributeCheck(dataset.attribute);
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `[ability] ${dataset.label}` : '';
      let roll = new Roll(dataset.roll, this.actor.getRollData()).roll();
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }
  }
}
