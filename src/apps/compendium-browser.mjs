import Tagify from "@yaireo/tagify";

export default class CompendiumBrowserDialog extends Application {
    skillFilters;
    itemFilters;
    tagFilterModes = {and: "All", or: "Any"};
    compendiumData;
    skillFilterScrollPos;
    itemFilterScrollPos;

    constructor(options={}) {
        super(options);

        /**
        * Store a reference to the Item entity being used
        * @type {LogHorizonTRPGItem}
        */
        this.skillFilters = {text: "", tags: {mode: "or", tags: []}, timings:[], limits:[], compendiumSources: []};
        this.itemFilters = {text: "", tags: {mode: "or", tags: []}, timings:[], limits:[], itemrank: {min: 0, max: 0}, compendiumSources: []};
        this.skillFilterScrollPos = 0;
        this.itemFilterScrollPos = 0;
    }

    /** @inheritdoc */
    static get defaultOptions() {
      return mergeObject(super.defaultOptions, {
          id: "compendium-browser",
          template: "systems/loghorizontrpg/templates/apps/compendium-browser/compendium-browser.html",
          classes: ["loghorizontrpg", "compendium-browser"],
          title: "Compendium Browser",
          tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "skills" }],
          dragDrop: [{dragSelector: ".items-list .item", dropSelector: null}],
          height: 600,
          width: 800,
          resizable: true,
          choices: {},
          config: {}
      });
    }

    /** @override */
    render(force=false, options={}) {
        // Save scroll positions
        let skillFilters = $(".skills > .compendium-browser-content > .compendium-browser-filters");
        this.skillFilterScrollPos = skillFilters.length > 0 ? this.skillFilterScrollPos = skillFilters.scrollTop() : 0;

        let itemFilters = $(".items > .compendium-browser-content > .compendium-browser-filters");
        this.itemFilterScrollPos = itemFilters.length > 0 ? this.itemFilterScrollPos = itemFilters.scrollTop() : 0;

        super.render(force, options);
    }

    /** @override */
    async _onDragStart(event) {
        const li = event.currentTarget;
        console.log(event);
        if ( event.target.classList.contains("entity-link") ) return;

        // Create drag data
        let dragData;

        // Active Effect
        if ( li.dataset.itemId ) {
        const item = await fromUuid(li.dataset.itemId);
        dragData = item.toDragData();
        }

        if ( !dragData ) return;

        // Set data transfer
        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    }
  
    /** @override */
    async getData() {
        const data = super.getData();

        const config = CONFIG.LOGHORIZONTRPG;
        const choices = {};

        if (this.compendiumData === undefined) {
            console.log("Load first time only");
            this.compendiumData = await this.loadCompendiums();
        }
        const compendiumData = foundry.utils.deepClone(this.compendiumData);


        // Sort/Filter
        // ITEMS
        // FILTER
        // FILTER ITEM RANK
        if (this.itemFilters.itemrank) {
            compendiumData.items = compendiumData.items.filter((item, index) => {
                if ((this.itemFilters.itemrank.min == 0 || item.system.ir >= this.itemFilters.itemrank.min) && (this.itemFilters.itemrank.max == 0 || item.system.ir <= this.itemFilters.itemrank.max)) return true;
                return false;
            });
        };
        // FILTER COMPENDIUMS
        if (this.itemFilters.compendiumSources.length > 0) {
            compendiumData.items = compendiumData.items.filter((item, index) => {
                if (this.itemFilters.compendiumSources.includes(item.compendiumSource)) return true;
                return false;
            });
        };
        // FILTER TIMINGS
        if (this.itemFilters.timings.length > 0) {
            compendiumData.items = compendiumData.items.filter((item, index) => {
                if (item.hasAction && this.itemFilters.timings.includes(item.system.timing)) return true;
                return false;
            });
        };
        // FILTER LIMITS
        if (this.itemFilters.limits.length > 0) {
            compendiumData.items = compendiumData.items.filter((item, index) => {
                if (item.hasAction && this.itemFilters.limits.includes(item.system.limit.type)) return true;
                return false;
            });
        };
        // FILTER TAGS INCLUDES
        const itemIncludeTags = this.itemFilters.tags.tags.filter(tag => !tag.not).map(t => t.value.toLowerCase());
        if (itemIncludeTags.length > 0) {
            if (this.itemFilters.tags.mode == "and") {
                compendiumData.items = compendiumData.items.filter((item, index) => {
                    let loweredMap = item.system.tags.map(t => t.toLowerCase());
                    return itemIncludeTags.every(tag => {
                        return loweredMap.includes(tag);
                    });
                });
            } else if (this.itemFilters.tags.mode == "or") {
                compendiumData.items = compendiumData.items.filter((item, index) => {
                    let loweredMap = item.system.tags.map(t => t.toLowerCase());
                    return itemIncludeTags.some(tag => {
                        return loweredMap.includes(tag);
                    })
                });
            } else {
                console.log("Invalid tag mode set");
            }
        }
        // FILTER TAGS EXCLUDES
        const itemExcludeTags = this.itemFilters.tags.tags.filter(tag => tag.not).map(t => t.value.toLowerCase());
        if (itemExcludeTags.length > 0) {
            compendiumData.items = compendiumData.items.filter((item, index) => {
                let loweredMap = item.system.tags.map(t => t.toLowerCase());
                return itemExcludeTags.some(tag => {
                    return !loweredMap.includes(tag);
                });
            });
        }
        // FILTER TEXT
        if (this.itemFilters.text != "") {
            compendiumData.items = compendiumData.items.filter((item, index) => {
                if (item.name.toLowerCase().search(this.itemFilters.text.toLowerCase()) != -1) return true;
                if (item.system.description.toLowerCase().search(this.itemFilters.text.toLowerCase()) != -1) return true;
                return false;
            });
        }

        // SORT
        //compendiumData.items.sort((a, b) => a.name.localeCompare(b.name));
        compendiumData.items.sort((a, b) => a.compendiumSource.localeCompare(b.compendiumSource));
        compendiumData.items.sort((a, b) => a.system.ir - b.system.ir);

        // SKILLS
        // FILTER
        // FILTER COMPENDIUMS
        if (this.skillFilters.compendiumSources.length > 0) {
            compendiumData.skills = compendiumData.skills.filter((skill, index) => {
                if (this.skillFilters.compendiumSources.includes(skill.compendiumSource)) return true;
                return false;
            });
        };
        // FILTER TIMINGS
        if (this.skillFilters.timings.length > 0) {
            compendiumData.skills = compendiumData.skills.filter((skill, index) => {
                if (this.skillFilters.timings.includes(skill.system.timing)) return true;
                return false;
            });
        };
        // FILTER LIMITS
        if (this.skillFilters.limits.length > 0) {
            compendiumData.skills = compendiumData.skills.filter((skill, index) => {
                if (this.skillFilters.limits.includes(skill.system.limit.type)) return true;
                return false;
            });
        };
        // FILTER TAGS INCLUDES
        const skillIncludeTags = this.skillFilters.tags.tags.filter(tag => !tag.not).map(t => t.value.toLowerCase());
        if (skillIncludeTags.length > 0) {
            if (this.skillFilters.tags.mode == "and") {
                compendiumData.skills = compendiumData.skills.filter((skill, index) => {
                    let loweredMap = skill.system.tags.map(t => t.toLowerCase());
                    return skillIncludeTags.every(tag => {
                        return loweredMap.includes(tag);
                    });
                });
            } else if (this.skillFilters.tags.mode == "or") {
                compendiumData.skills = compendiumData.skills.filter((skill, index) => {
                    let loweredMap = skill.system.tags.map(t => t.toLowerCase());
                    return skillIncludeTags.some(tag => {
                        return loweredMap.includes(tag);
                    })
                });
            } else {
                console.log("Invalid tag mode set");
            }
        }
        // FILTER TAGS EXCLUDES
        const skillExcludeTags = this.skillFilters.tags.tags.filter(tag => tag.not).map(t => t.value.toLowerCase());
        if (skillExcludeTags.length > 0) {
            compendiumData.skills = compendiumData.skills.filter((skill, index) => {
                let loweredMap = skill.system.tags.map(t => t.toLowerCase());
                return skillExcludeTags.some(tag => {
                    return !loweredMap.includes(tag);
                });
            });
        }
        
        // FILTER TEXT
        if (this.skillFilters.text != "") {
            compendiumData.skills = compendiumData.skills.filter((skill, index) => {
                if (skill.name.toLowerCase().search(this.skillFilters.text.toLowerCase()) != -1) return true;
                if (skill.system.description.toLowerCase().search(this.skillFilters.text.toLowerCase()) != -1) return true;
                return false;
            });
        }

        // SORT
        compendiumData.skills.sort((a, b) => a.name.localeCompare(b.name));
        compendiumData.skills.sort((a, b) => a.system.timing.localeCompare(b.system.timing));
        compendiumData.skills.sort((a, b) => {
            let intA, intB;
            intA = a.system.tags.includes("Combat") ? 1 : 2;
            intB = b.system.tags.includes("Combat") ? 1 : 2;
            return intA - intB;
        });
        compendiumData.skills.sort((a, b) => a.compendiumSource.localeCompare(b.compendiumSource));

        return {
            config: config,
            choices: choices,
            activeTab: this._tabs[0].active,
            skills: compendiumData.skills,
            items: compendiumData.items,
            classes: compendiumData.classes,
            races: compendiumData.races,
            compendiums: compendiumData.compendiums,
            skillFilters: this.skillFilters,
            itemFilters: this.itemFilters,
            tagFilterModes: this.tagFilterModes,
            itemTypes: ["item", "weapon", "equipment", "consumable"],
            skillFilterTags: JSON.stringify(this.skillFilters.tags.tags),
            itemFilterTags: JSON.stringify(this.itemFilters.tags.tags)
        };
    }

    /** @override **/
    activateListeners(html) {
        super.activateListeners(html);

        // SKILLS
        let skillSearchInput = html.find('.skills .compendium-text-search input');
        skillSearchInput.on("change", () => {
            this.skillFilters.text = skillSearchInput.val();
            this.render();
        });

        
        // TAGIFY STUFF
        let skillTagInput = html.find('.skills .compendium-tag-search > input');
        let skillTagify = new Tagify(skillTagInput[0], {
            whitelist: this.compendiumData.skillTags,
            editTags: false,
            transformTag(tag) {
                if (tag.not === undefined) tag.not = false;
            }
        });

        let skillTagElements = $(skillTagify.getTagElms())

        skillTagElements.each((i, elem) => {
            if (elem.__tagifyTagData.not) {
                $(elem).find(".tagify__tag-text").addClass("tag_negated")
            }
        });

        skillTagElements.append('<button class="tag_negate_button">!</button>');

        skillTagElements.on("click", e => {
            let target = $(e.target);
            if (target.hasClass("tag_negate_button")) {
                let clickedTag = e.currentTarget.__tagifyTagData;
                let foundTag = this.skillFilters.tags.tags.find(tag => tag.value == clickedTag.value);
                foundTag.not = !foundTag.not;
                this.render();
            }
        });
        
        skillTagInput.on("change", e => {
            let values = skillTagify.value;
            this.skillFilters.tags.tags = values;
            this.render();
        });



        
        let skillTagMode = html.find('.skills .compendium-tag-search .checkbox input');
        skillTagMode.on("change", () => {
            let newChecked = html.find('.skills .compendium-tag-search .checkbox :checked');
            this.skillFilters.tags.mode = newChecked.val();
            this.render();
        });

        let skillTimingInputs = html.find('.skills .compendium-timing-filter input');
        skillTimingInputs.on("change", () => {
            let allChecked = html.find('.skills .compendium-timing-filter :checked');
            let allValues = allChecked.map((_, html) => $(html).val()).get();
            this.skillFilters.timings = allValues;
            this.render();
        });

        let skillLimitInputs = html.find('.skills .compendium-limit-filter input');
        skillLimitInputs.on("change", () => {
            let allChecked = html.find('.skills .compendium-limit-filter :checked');
            let allValues = allChecked.map((_, html) => $(html).val()).get();
            this.skillFilters.limits = allValues;
            this.render();
        });

        let skillSourceInputs = html.find('.skills .compendium-source-filter input');
        skillSourceInputs.on("change", () => {
            let allChecked = html.find('.skills .compendium-source-filter :checked');
            let allValues = allChecked.map((_, html) => $(html).val()).get();
            this.skillFilters.compendiumSources = allValues;
            this.render();
        });


        // ITEMS
        let itemSearchInput = html.find('.items .compendium-text-search input');
        itemSearchInput.on("change", () => {
            this.itemFilters.text = itemSearchInput.val();
            this.render();
        });
        // TAGIFY STUFF
        let itemTagInput = html.find('.items .compendium-tag-search > input');
        let itemTagify = new Tagify(itemTagInput[0], {
            whitelist: this.compendiumData.itemTags,
            editTags: false,
            transformTag(tag) {
                if (tag.not === undefined) tag.not = false;
            }
        });

        let itemTagElements = $(itemTagify.getTagElms())

        itemTagElements.each((i, elem) => {
            if (elem.__tagifyTagData.not) {
                $(elem).find(".tagify__tag-text").addClass("tag_negated")
            }
        });

        itemTagElements.append('<button class="tag_negate_button">!</button>');

        itemTagElements.on("click", e => {
            let target = $(e.target);
            if (target.hasClass("tag_negate_button")) {
                let clickedTag = e.currentTarget.__tagifyTagData;
                let foundTag = this.itemFilters.tags.tags.find(tag => tag.value == clickedTag.value);
                foundTag.not = !foundTag.not;
                this.render();
            }
        });
        
        itemTagInput.on("change", e => {
            let values = itemTagify.value;
            this.itemFilters.tags.tags = values;
            this.render();
        });
        
        let itemTagMode = html.find('.items .compendium-tag-search .checkbox input');
        itemTagMode.on("change", () => {
            let newChecked = html.find('.items .compendium-tag-search .checkbox :checked');
            this.itemFilters.tags.mode = newChecked.val();
            this.render();
        });

        let itemTimingInputs = html.find('.items .compendium-timing-filter input');
        itemTimingInputs.on("change", () => {
            let allChecked = html.find('.items .compendium-timing-filter :checked');
            let allValues = allChecked.map((_, html) => $(html).val()).get();
            this.itemFilters.timings = allValues;
            this.render();
        });

        let itemLimitInputs = html.find('.items .compendium-limit-filter input');
        itemLimitInputs.on("change", () => {
            let allChecked = html.find('.items .compendium-limit-filter :checked');
            let allValues = allChecked.map((_, html) => $(html).val()).get();
            this.itemFilters.limits = allValues;
            this.render();
        });

        let itemRankFilter = html.find('.items .compendium-rank-filter input');
        itemRankFilter.on("change", e => {
            if (e.target.name === "itemFilters.itemrank.min") {
                let value = parseInt(e.target.value);
                if (Number.isInteger(value) && value >= 0) {
                    this.itemFilters.itemrank.min = value;
                } else {
                    this.itemFilters.itemrank.min = 0;
                }
                if (this.itemFilters.itemrank.min != 0 && this.itemFilters.itemrank.max != 0 && this.itemFilters.itemrank.min > this.itemFilters.itemrank.max) {
                    this.itemFilters.itemrank.max = this.itemFilters.itemrank.min;
                }
            } else if (e.target.name === "itemFilters.itemrank.max") {
                let value = parseInt(e.target.value);
                if (Number.isInteger(value) && value >= 0) {
                    this.itemFilters.itemrank.max = value;
                } else {
                    this.itemFilters.itemrank.max = 0;
                }
                if (this.itemFilters.itemrank.min != 0 && this.itemFilters.itemrank.max != 0 && this.itemFilters.itemrank.min > this.itemFilters.itemrank.max) {
                    this.itemFilters.itemrank.min = this.itemFilters.itemrank.max;
                }
            } else {
                return;
            }
            this.render();
        });

        let itemSourceInputs = html.find('.items .compendium-source-filter input');
        itemSourceInputs.on("change", () => {
            let allChecked = html.find('.items .compendium-source-filter :checked');
            let allValues = allChecked.map((_, html) => $(html).val()).get();
            this.itemFilters.compendiumSources = allValues;
            this.render();
        });


        let itemNames = html.find('.item-name');
        itemNames.on("click", async ev => {
            const li = $(ev.currentTarget).parents(".item");
            const item = await fromUuid(li.data("itemId"));
            console.log(item);
            item.sheet.render(true);
        })

        
        // Set scroll positions
        let skillFilters = $(".skills > .compendium-browser-content > .compendium-browser-filters");
        skillFilters.scrollTop(this.skillFilterScrollPos);

        let itemFilters = $(".items > .compendium-browser-content > .compendium-browser-filters");
        itemFilters.scrollTop(this.itemFilterScrollPos);
        
    }

    async loadCompendiums() {
        const skills = [];
        const items = [];
        const classes = [];
        const races = [];
        const compendiums = [];
        const skillTags = [];
        const itemTags = [];
        for (let pack of game.packs) {
            if (pack.metadata.type === "Item") {
                let itemTypes = [];

                let itemDocuments = await pack.getDocuments();
                itemDocuments.forEach(item => {
                    if (!itemTypes.includes(item.type)) {
                        itemTypes.push(item.type);
                    }
                    switch (item.type) {
                        case "skill":
                            item.compendiumSource = pack.metadata.label;
                            item.system.limit.value = item.system.limit.max;
                            item.system.tags.forEach(tag => {
                                if (!skillTags.includes(tag)) skillTags.push(tag);
                            });
                            skills.push(item);
                            break;
                        
                        case "item":
                        case "weapon":
                        case "equipment":
                        case "consumable":
                            item.compendiumSource = pack.metadata.label;
                            item.system.tags.forEach(tag => {
                                if (!itemTags.includes(tag)) itemTags.push(tag);
                            });
                            items.push(item);
                            break;
                        
                        case "class":
                            item.compendiumSource = pack.metadata.label;
                            classes.push(item);
                            break;
                        
                        case "race":
                            item.compendiumSource = pack.metadata.label;
                            races.push(item);
                            break;
                    
                        default:
                            break;
                    }
                });
            
                let compendiumInfo = {name: pack.metadata.label, types: itemTypes}
                compendiums.push(compendiumInfo);
            }
        }
        
        return {skills: skills, items: items, classes: classes, races: races, compendiums: compendiums, skillTags: skillTags, itemTags: itemTags}
    }
  }
  