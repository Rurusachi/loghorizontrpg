export default class TagEditorDialog extends DocumentSheet {

    /** @inheritdoc */
    static get defaultOptions() {
      return mergeObject(super.defaultOptions, {
          id: "tag-editor",
          template: "systems/loghorizontrpg/templates/apps/tag-editor.html",
          classes: ["loghorizontrpg", "tag-editor"],
          title: "Tag Editor",
          resizable: true,
          choices: {},
          config: {}
      });
    }
  
    /** @override */
    getData() {
        const data = super.getData();
        
        console.log(this);
        console.log(data);
        let tags = data.data.system.tags;
        let tagsList;
        if (typeof tags === "string") {
            tagsList = tags.split(",").map(s => s.trim());
        } else {
            tagsList = tags;
        }
        console.log(tagsList);


        return {
            name: data.data.name,
            tags: tagsList
        };
    }
    
    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        html.find(".addTag").click(async ev => {
            console.log(this);
            
            const div = $(ev.currentTarget).parents(".dialog-content").children(`.tag-list`);
            let props = $(`<div class="">
                            <input type="text" name="${div.children().length}" value="" data-dtype="String"/>
                        </div>`);
            div.append(props);
            this.setPosition({height: "auto"});
          });
    }
  
  /** @override */
  async _updateObject(event, formData) {
        console.log(formData);
        const newTags = formData;
        if (newTags === null) return;
        const tagArray = Object.values(newTags).filter(x => x !== "");
        console.log(tagArray.join(", "));
        //this.object.system.tags = tagArray.join(", ");
        await this.object.update({"system.tags": tagArray});
        this.object.render();
  }
  }
  