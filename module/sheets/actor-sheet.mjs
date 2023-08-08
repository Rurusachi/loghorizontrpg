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
    return `systems/loghorizontrpg/templates/actor/actor-${this.actor.type}-sheet.html`;
  }

  /** @override */
  async _onDropItemCreate(itemData) {
    console.log(itemData);
    if ( itemData.type === "class" ) {
        const actor = this.actor;
        
        const skillIds = itemData.system.skills;
        let skills = [];
        for (const x of skillIds) {
          let skill = await fromUuid(x.uuid);
          skills.push(skill);
        }
        console.log(skills);
        
        await actor.createEmbeddedDocuments("Item", skills, {parent: actor})
    }
    // Default drop handling if levels were not added
    return super._onDropItemCreate(itemData);
  }

  async _onDropClass(event, data) {
    console.log("_onDropClass: enter");
    console.log(data)
    const actor = this.actor;
    if ( !this.isEditable || !data.data ) return;
    console.log("_onDropClass: editable");
    let sameItem = (data.itemId === item.id);
    if ( sameItem ) return;
    console.log("_onDropClass: not same item");

    const skillIds = item.system.skills;
    let skills = {};
    for (const x of skillIds) {
      let skill = await fromUuid(x.uuid);
      skills.push(skill);
    }
    console.log(skills);
    return await actor.createEmbeddedDocuments("Item", skills, {parent: actor})
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actor = context.actor;
    context.config = CONFIG.LOGHORIZONTRPG;

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actor.system;
    context.flags = actor.flags;

    // Prepare character data and items.
    if (actor.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actor.type == 'npc') {
      this._prepareItems(context);
      this._prepareNpcData(context);
    }

    // Add roll data for TinyMCE editors.
    context.rollData = actor.getRollData();
    // Enrich description text for editor

    context.enrichedBiography = await TextEditor.enrichHTML(context.system.biography, {async: true});

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(Array.from(this.actor.allApplicableEffects()), this);

    context.edit_mode = this.edit_mode;
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
      for (let [k, v] of Object.entries(context.system.difficulties)) {
          v.label = game.i18n.localize(CONFIG.LOGHORIZONTRPG.difficultyTypes[k]) ?? k;
      }
  }
  _prepareActorData(context) {
      for (let [k, v] of Object.entries(context.system.abilities)) {
          v.label = game.i18n.localize(CONFIG.LOGHORIZONTRPG.abilities[k]) ?? k;
      }
      for (let [k, v] of Object.entries(context.system.attributes)) {
          v.label = game.i18n.localize(CONFIG.LOGHORIZONTRPG.attributes[k]) ?? k;
      }
      for (let [k, v] of Object.entries(context.system.combatstats)) {
          v.label = game.i18n.localize(CONFIG.LOGHORIZONTRPG.combatstats[k]) ?? k;
      }
      // Status
      for (let [k, v] of Object.entries(context.system.status.combat)) {
          v.label = game.i18n.localize(CONFIG.LOGHORIZONTRPG.status[k]) ?? k;
      }
      for (let [k, v] of Object.entries(context.system.status.life)) {
          v.label = game.i18n.localize(CONFIG.LOGHORIZONTRPG.status[k]) ?? k;
      }
      for (let [k, v] of Object.entries(context.system.status.bad)) {
          v.label = game.i18n.localize(CONFIG.LOGHORIZONTRPG.status[k]) ?? k;
      }
      for (let [k, v] of Object.entries(context.system.status.other)) {
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
        if (i.system.tags) {
          if (i.system.tags.includes("General")) {
              skills["General"].push(i);
          }
          else if (i.system.tags.includes("Combat")) {
              skills["Combat"].push(i);
          }
          else if (i.system.tags.includes("Basic")) {
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

    html.keypress(
      function(event){
        if (event.which == '13') {
          event.preventDefault();
        }
    });

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
    html.find('.edit-mode').click(this._onEditMode.bind(this));
    // Numeric changes
    const inputs = html.find("input");
    inputs.focus(ev => ev.currentTarget.select());
    inputs.addBack().find('[data-dtype="Number"]').change(this._onChangeInputDelta.bind(this));

    // Active Effect management
    html.find(".effect-control").click(async ev => {await onManageActiveEffect(ev, this.actor); this.render()});

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

  async _onEditMode(event) {
      event.preventDefault();

      const divs = $(event.currentTarget).parents(`.${this.actor.type}`).find(".edit-mode-only");
      //console.log(divs);
      this.edit_mode = this.edit_mode == undefined ? true : !this.edit_mode;
      if (this.edit_mode) {
        divs.show()
      } else {
        divs.hide()
      }
  }

  /**
 * Handle input changes to numeric form fields, allowing them to accept delta-typed inputs
 * @param {Event} event  Triggering event.
 * @private
 */
  _onChangeInputDelta(event) {
    const input = event.target;
    const value = input.value;
    if (["+", "-"].includes(value[0])) {
      let delta = parseFloat(value);
      input.value = getProperty(this.actor, input.name) + delta;
    } else if (value[0] === "=") {
      input.value = value.slice(1);
    }
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

  async _onItemSummary(event) {
    event.preventDefault();
    let li = $(event.currentTarget).parents(".item"),
        item = this.actor.items.get(li.data("item-id")),
        chatData = await item.getChatData({secrets: this.actor.isOwner});
        console.log(chatData);

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
  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return await item.roll();
      }
      if (dataset.rollType == 'attribute') {
          this.actor.rollAttributeCheck(dataset.attribute);
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `[ability] ${dataset.label}` : '';
      let roll = await new Roll(dataset.roll, this.actor.getRollData()).roll();
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }
  }
}
