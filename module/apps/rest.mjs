export default class RestDialog extends DocumentSheet {

  /** @inheritdoc */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
        id: "rest",
        template: "systems/loghorizontrpg/templates/apps/rest.html",
        classes: ["loghorizontrpg", "rest"],
        title: "Rest",
        choices: {},
        config: {}
    });
  }

  /** @override */
  getData() {
      const data = super.getData();

      const config = CONFIG.LOGHORIZONTRPG;
      const choices = {};

      return {
          config: config,
          choices: choices
      };
  }

/** @override */
async _updateObject(event, formData) {
  const o = this.options;

  const restOptions = [];
  for ( let [k, v] of Object.entries(formData) ) {
    if ( v ) restOptions.push(k);
  }
  this.object.rest(restOptions);
}
}
