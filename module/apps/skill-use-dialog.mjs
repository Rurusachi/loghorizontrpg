export default class SkillUseDialog extends Dialog {
  constructor(item, dialogData={}, options={}) {
    super(dialogData, options);
    this.options.classes = ["loghorizontrpg", "dialog"];

    /**
     * Store a reference to the Item entity being used
     * @type {LogHorizonTRPGItem}
     */
    this.item = item;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * A constructor function which displays the Spell Cast Dialog app for a given Actor and Item.
   * Returns a Promise which resolves to the dialog FormData once the workflow has been completed.
   * @param {LogHorizonTRPGItem} item
   * @return {Promise}
   */
  static async create(item) {
    if ( !item.isOwned ) throw new Error("You cannot display a skill usage dialog for an unowned item");

    // Prepare data
    const actorData = item.actor.system;
    const itemData = item.system;
    const limit = itemData.limit
    const hatecost = itemData.hatecost.total;
    const fatecost = itemData.fatecost.value;
    const quantity = itemData.quantity || 0;
    const sufficientUses = (quantity > 0 && item.type == "consumable") || limit.value > 0;

    // Prepare dialog form data
    const data = {
      item: item,
      title: `${item.type.capitalize()}: ${item.name}`,
      note: this._getSkillUseNote(item, quantity),
      consumeLimit: limit.type != "None" && (limit.max > 0),
      consumeItem: item.type === "consumable",
      hatecost: hatecost,
      fatecost: fatecost != null ? fatecost : 0,
      canUse: sufficientUses,
      errors: []
    };

    // Render the skill usage template
    const html = await renderTemplate("systems/loghorizontrpg/templates/apps/skill-use.html", data);

    // Create the Dialog and return data as a Promise
    const icon = "fa-magic";
    const label = `Use ${item.type}`;
    return new Promise((resolve) => {
      const dlg = new this(item, {
        title: `${item.name}: Usage configuration`,
        content: html,
        buttons: {
          use: {
            icon: `<i class="fas ${icon}"></i>`,
            label: label,
            callback: html => {
              const fd = new FormDataExtended(html[0].querySelector("form"));
              resolve(fd.object);
            }
          }
        },
        default: "use",
        close: () => resolve(null)
      });
      dlg.render(true);
    });
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Get the skill usage note that is displayed
   * @private
   */
  static _getSkillUseNote(item, quantity) {

    // Zero quantity
    if (quantity <= 0 && item.type === "consumable") return "No uses left";
    else if (quantity > 0 && item.type === "consumable") {
        return `You have ${quantity} ${item.name} left`
    }
    // Does not use any resource
    if ( item.system.limit.type === "None" ) return "";

    // Other Items
    else {
      return `${item.type.capitalize()} has ${item.system.limit.value} of ${item.system.limit.max} per ${game.i18n.localize(CONFIG.LOGHORIZONTRPG.limitTypes[item.system.limit.type])} left`
    }
  }
}
