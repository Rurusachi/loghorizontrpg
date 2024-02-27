import Tagify from "@yaireo/tagify";

export default class CompendiumBrowserDialog extends Application {
    defaultFilters = {skill: {text: "", tags: {mode: "or", tags: []}, timings:[], limits:[], compendiumSources: []},
                       item: {text: "", tags: {mode: "or", tags: []}, timings:[], limits:[], itemrank: {min: 0, max: 0}, compendiumSources: []}};
    tagFilterModes = {and: "All", or: "Any"};

    compendiumData;
    filteredCompendiumData;
    tabData;
    hiddenFilters;

    constructor(options={}) {
        super(options);

        /**
        * Store a reference to the Item entity being used
        * @type {LogHorizonTRPGItem}
        */
        this.tabData = {skills: {filters: {}, scrollPositions: {filter: 0, list: 0}, refilter: true, listWindow: [0, 50]},
                         items: {filters: {}, scrollPositions: {filter: 0, list: 0}, refilter: true, listWindow: [0, 50]}};
        
        this.tabData.skills.filters = foundry.utils.deepClone(this.defaultFilters.skill);
        this.tabData.items.filters = foundry.utils.deepClone(this.defaultFilters.item);
        this.hiddenFilters = [];
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
        this.tabData.skills.scrollPositions.filter = skillFilters.length > 0 ? this.tabData.skills.scrollPositions.filter = skillFilters.scrollTop() : 0;

        let itemFilters = $(".items > .compendium-browser-content > .compendium-browser-filters");
        this.tabData.items.scrollPositions.filter = itemFilters.length > 0 ? this.tabData.items.scrollPositions.filter = itemFilters.scrollTop() : 0;

        let hidden = $(".hideable-content.item-hidden");
        this.hiddenFilters = hidden.parents(".hideable-parent").map((i, e) => {
            return e.id
        });

        if (options.resetItemWindow) {
            this.tabData.items.listWindow = [0, 50];
            this.tabData.items.scrollPositions.list = 0;
        } else {
            let itemList = $(".items > .compendium-browser-content > .items-list");
            this.tabData.items.scrollPositions.list = itemList.scrollTop()
        }

        if (options.resetSkillWindow) {
            this.tabData.skills.listWindow = [0, 50];
            this.tabData.skills.scrollPositions.list = 0;
        } else {
            let skillList = $(".skills > .compendium-browser-content > .items-list");
            this.tabData.skills.scrollPositions.list = skillList.scrollTop()
        }
        
        super.render(force, options);
    }

    /** @override */
    async _onDragStart(event) {
        const li = event.currentTarget;
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
            this.compendiumData = await this.loadCompendiums();
        }
        if (this.filteredCompendiumData === undefined) {
            this.filteredCompendiumData = foundry.utils.deepClone(this.compendiumData)
        }

        if (this.tabData.items.refilter) {
            const compendiumItems = foundry.utils.deepClone(this.compendiumData.items);
            this.filteredCompendiumData.items = this.filterItems(compendiumItems)
        }

        if (this.tabData.skills.refilter) {
            const compendiumSkills = foundry.utils.deepClone(this.compendiumData.skills);
            this.filteredCompendiumData.skills = this.filterSkills(compendiumSkills)
        }

        let skillListSlice = this.filteredCompendiumData.skills.slice(this.tabData.skills.listWindow[0], this.tabData.skills.listWindow[1]);
        let itemListSlice = this.filteredCompendiumData.items.slice(this.tabData.items.listWindow[0], this.tabData.items.listWindow[1]);
        

        return {
            config: config,
            choices: choices,
            activeTab: this._tabs[0].active,
            skills: skillListSlice,
            items: itemListSlice,
            compendiums: this.filteredCompendiumData.compendiums,
            skillFilters: this.tabData.skills.filters,
            itemFilters: this.tabData.items.filters,
            tagFilterModes: this.tagFilterModes,
            itemTypes: ["item", "weapon", "equipment", "consumable"],
            skillFilterTags: JSON.stringify(this.tabData.skills.filters.tags.tags),
            itemFilterTags: JSON.stringify(this.tabData.items.filters.tags.tags)
        };
    }

    /** @override **/
    activateListeners(html) {
        super.activateListeners(html);

        this.activateSkillListeners(html)

        this.activateItemListeners(html)


        // Set scroll positions
        let skillFilters = $(".skills > .compendium-browser-content > .compendium-browser-filters");
        skillFilters.scrollTop(this.tabData.skills.scrollPositions.filter);

        let itemFilters = $(".items > .compendium-browser-content > .compendium-browser-filters");
        itemFilters.scrollTop(this.tabData.items.scrollPositions.filter);

        let skillList = html.find(".skills > .compendium-browser-content > .items-list");
        skillList.scrollTop(this.tabData.skills.scrollPositions.list);

        let itemList = html.find(".items > .compendium-browser-content > .items-list");
        itemList.scrollTop(this.tabData.items.scrollPositions.list);
        // Set hidden filter icons

        let hideables = $(".compendium-browser-content .hideable");
        hideables.on("click", async ev => {
            const parent = $(ev.currentTarget).parent(".hideable-parent")
            const div = parent.children(".hideable-content");
            const icon = parent.find(".hideable-icon");
    
            // Toggle visibility
            this._toggleHide(div, icon)
        })
        
        for (let x of this.hiddenFilters) {
            let hideableParent = $(`#${x}`)
            let hideableContent = hideableParent.find(".hideable-content")
            let hideableIcon = hideableParent.find(".hideable-icon")
            this._toggleHide(hideableContent, hideableIcon, 0)
        }
        this.hiddenFilters = []
        
    }

    _toggleHide(div, icon, speed=200) {
        if ( div.hasClass("item-hidden") ) {
            icon.removeClass("fa-plus")
            icon.addClass("fa-minus")
            div.slideDown(speed);
        } else {
            icon.removeClass("fa-minus")
            icon.addClass("fa-plus")
            div.slideUp(speed);
        }
        div.toggleClass("item-hidden");

    }

    activateSkillListeners(html) {
        let skillClearFiltersButton = html.find('.skills .compendium-clear-filters-button')
        skillClearFiltersButton.on("click", () => {
            this.tabData.skills.filters = foundry.utils.deepClone(this.defaultFilters.skill);
            this.tabData.skills.refilter = true;
            this.render(undefined, {resetSkillWindow: true})
        })
        
        let skillList = html.find(".skills > .compendium-browser-content > .items-list");
        skillList.on("scroll", () => {
            let scroller = skillList.get(0);
            if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 5) {
                if (this.tabData.skills.listWindow[1] < this.filteredCompendiumData.skills.length) {
                    this.tabData.skills.listWindow[1] += 10;
                    this.render();
                }
            }
        })

        let skillSearchInput = html.find('.skills .compendium-text-search input');
        skillSearchInput.on("change", () => {
            this.tabData.skills.filters.text = skillSearchInput.val();
            this.tabData.skills.refilter = true;
            this.render(undefined, {resetSkillWindow: true});
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
                let foundTag = this.tabData.skills.filters.tags.tags.find(tag => tag.value == clickedTag.value);
                foundTag.not = !foundTag.not;
                this.tabData.skills.refilter = true;
                this.render(undefined, {resetSkillWindow: true});
            }
        });
        
        skillTagInput.on("change", e => {
            let values = skillTagify.value;
            this.tabData.skills.filters.tags.tags = values;
            this.tabData.skills.refilter = true;
            this.render(undefined, {resetSkillWindow: true});
        });
        
        let skillTagMode = html.find('.skills .compendium-tag-search .checkbox input');
        skillTagMode.on("change", () => {
            let newChecked = html.find('.skills .compendium-tag-search .checkbox :checked');
            this.tabData.skills.filters.tags.mode = newChecked.val();
            this.tabData.skills.refilter = true;
            this.render(undefined, {resetSkillWindow: true});
        });

        let skillTimingInputs = html.find('.skills .compendium-timing-filter input');
        skillTimingInputs.on("change", () => {
            let allChecked = html.find('.skills .compendium-timing-filter :checked');
            let allValues = allChecked.map((_, html) => $(html).val()).get();
            this.tabData.skills.filters.timings = allValues;
            this.tabData.skills.refilter = true;
            this.render(undefined, {resetSkillWindow: true});
        });

        let skillLimitInputs = html.find('.skills .compendium-limit-filter input');
        skillLimitInputs.on("change", () => {
            let allChecked = html.find('.skills .compendium-limit-filter :checked');
            let allValues = allChecked.map((_, html) => $(html).val()).get();
            this.tabData.skills.filters.limits = allValues;
            this.tabData.skills.refilter = true;
            this.render(undefined, {resetSkillWindow: true});
        });

        let skillSourceInputs = html.find('.skills .compendium-source-filter input');
        skillSourceInputs.on("change", () => {
            let allChecked = html.find('.skills .compendium-source-filter :checked');
            let allValues = allChecked.map((_, html) => $(html).val()).get();
            this.tabData.skills.filters.compendiumSources = allValues;
            this.tabData.skills.refilter = true;
            this.render(undefined, {resetSkillWindow: true});
        });
    }

    activateItemListeners(html) {
        let itemClearFiltersButton = html.find('.items .compendium-clear-filters-button')
        itemClearFiltersButton.on("click", () => {
            this.tabData.items.filters = foundry.utils.deepClone(this.defaultFilters.item);
            this.tabData.items.refilter = true;
            this.render(undefined, {resetItemWindow: true})
        })
        
        let itemList = html.find(".items > .compendium-browser-content > .items-list");
        itemList.on("scroll", () => {
            let scroller = itemList.get(0);
            if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 5) {
                if (this.tabData.items.listWindow[1] < this.filteredCompendiumData.items.length) {
                    this.tabData.items.listWindow[1] += 10;
                    this.render();
                }
            }
        })

        let itemSearchInput = html.find('.items .compendium-text-search input');
        itemSearchInput.on("change", () => {
            this.tabData.items.filters.text = itemSearchInput.val();
            this.tabData.items.refilter = true;
            this.render(undefined, {resetItemWindow: true});
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
                let foundTag = this.tabData.items.filters.tags.tags.find(tag => tag.value == clickedTag.value);
                foundTag.not = !foundTag.not;
                this.tabData.items.refilter = true;
                this.render(undefined, {resetItemWindow: true});
            }
        });
        
        itemTagInput.on("change", e => {
            let values = itemTagify.value;
            this.tabData.items.filters.tags.tags = values;
            this.tabData.items.refilter = true;
            this.render(undefined, {resetItemWindow: true});
        });
        
        let itemTagMode = html.find('.items .compendium-tag-search .checkbox input');
        itemTagMode.on("change", () => {
            let newChecked = html.find('.items .compendium-tag-search .checkbox :checked');
            this.tabData.items.filters.tags.mode = newChecked.val();
            this.tabData.items.refilter = true;
            this.render(undefined, {resetItemWindow: true});
        });

        let itemTimingInputs = html.find('.items .compendium-timing-filter input');
        itemTimingInputs.on("change", () => {
            let allChecked = html.find('.items .compendium-timing-filter :checked');
            let allValues = allChecked.map((_, html) => $(html).val()).get();
            this.tabData.items.filters.timings = allValues;
            this.tabData.items.refilter = true;
            this.render(undefined, {resetItemWindow: true});
        });

        let itemLimitInputs = html.find('.items .compendium-limit-filter input');
        itemLimitInputs.on("change", () => {
            let allChecked = html.find('.items .compendium-limit-filter :checked');
            let allValues = allChecked.map((_, html) => $(html).val()).get();
            this.tabData.items.filters.limits = allValues;
            this.tabData.items.refilter = true;
            this.render(undefined, {resetItemWindow: true});
        });

        let itemRankFilter = html.find('.items .compendium-rank-filter input');
        itemRankFilter.on("change", e => {
            if (e.target.name === "itemFilters.itemrank.min") {
                let value = parseInt(e.target.value);
                if (Number.isInteger(value) && value >= 0) {
                    this.tabData.items.filters.itemrank.min = value;
                } else {
                    this.tabData.items.filters.itemrank.min = 0;
                }
                if (this.tabData.items.filters.itemrank.min != 0 && this.tabData.items.filters.itemrank.max != 0 && this.tabData.items.filters.itemrank.min > this.tabData.items.filters.itemrank.max) {
                    this.tabData.items.filters.itemrank.max = this.tabData.items.filters.itemrank.min;
                }
            } else if (e.target.name === "itemFilters.itemrank.max") {
                let value = parseInt(e.target.value);
                if (Number.isInteger(value) && value >= 0) {
                    this.tabData.items.filters.itemrank.max = value;
                } else {
                    this.tabData.items.filters.itemrank.max = 0;
                }
                if (this.tabData.items.filters.itemrank.min != 0 && this.tabData.items.filters.itemrank.max != 0 && this.tabData.items.filters.itemrank.min > this.tabData.items.filters.itemrank.max) {
                    this.tabData.items.filters.itemrank.min = this.tabData.items.filters.itemrank.max;
                }
            } else {
                return;
            }
            this.tabData.items.refilter = true;
            this.render(undefined, {resetItemWindow: true});
        });

        let itemSourceInputs = html.find('.items .compendium-source-filter input');
        itemSourceInputs.on("change", () => {
            let allChecked = html.find('.items .compendium-source-filter :checked');
            let allValues = allChecked.map((_, html) => $(html).val()).get();
            this.tabData.items.filters.compendiumSources = allValues;
            this.tabData.items.refilter = true;
            this.render(undefined, {resetItemWindow: true});
        });


        let itemNames = html.find('.item-name');
        itemNames.on("click", async ev => {
            const li = $(ev.currentTarget).parents(".item");
            const item = await fromUuid(li.data("itemId"));
            item.sheet.render(true);
        })
    }

    /* 
    _onHideable(event) {
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
    */

    filterItems(compendiumItems) {
        this.tabData.items.refilter = false;

        // FILTER ITEM RANK
        if (this.tabData.items.filters.itemrank) {
            compendiumItems = compendiumItems.filter((item, index) => {
                if ((this.tabData.items.filters.itemrank.min == 0 || item.system.ir >= this.tabData.items.filters.itemrank.min) && (this.tabData.items.filters.itemrank.max == 0 || item.system.ir <= this.tabData.items.filters.itemrank.max)) return true;
                return false;
            });
        };
        // FILTER COMPENDIUMS
        if (this.tabData.items.filters.compendiumSources.length > 0) {
            compendiumItems = compendiumItems.filter((item, index) => {
                if (this.tabData.items.filters.compendiumSources.includes(item.compendiumSource)) return true;
                return false;
            });
        };
        // FILTER TIMINGS
        if (this.tabData.items.filters.timings.length > 0) {
            compendiumItems = compendiumItems.filter((item, index) => {
                if (item.hasAction && this.tabData.items.filters.timings.includes(item.system.timing)) return true;
                return false;
            });
        };
        // FILTER LIMITS
        if (this.tabData.items.filters.limits.length > 0) {
            compendiumItems = compendiumItems.filter((item, index) => {
                if (item.hasAction && this.tabData.items.filters.limits.includes(item.system.limit.type)) return true;
                return false;
            });
        };
        // FILTER TAGS INCLUDES
        const itemIncludeTags = this.tabData.items.filters.tags.tags.filter(tag => !tag.not).map(t => t.value.toLowerCase());
        if (itemIncludeTags.length > 0) {
            if (this.tabData.items.filters.tags.mode == "and") {
                compendiumItems = compendiumItems.filter((item, index) => {
                    let loweredMap = item.system.tags.map(t => t.toLowerCase());
                    return itemIncludeTags.every(tag => {
                        return loweredMap.includes(tag);
                    });
                });
            } else if (this.tabData.items.filters.tags.mode == "or") {
                compendiumItems = compendiumItems.filter((item, index) => {
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
        const itemExcludeTags = this.tabData.items.filters.tags.tags.filter(tag => tag.not).map(t => t.value.toLowerCase());
        if (itemExcludeTags.length > 0) {
            compendiumItems = compendiumItems.filter((item, index) => {
                let loweredMap = item.system.tags.map(t => t.toLowerCase());
                return itemExcludeTags.some(tag => {
                    return !loweredMap.includes(tag);
                });
            });
        }
        // FILTER TEXT
        if (this.tabData.items.filters.text != "") {
            compendiumItems = compendiumItems.filter((item, index) => {
                if (item.name.toLowerCase().search(this.tabData.items.filters.text.toLowerCase()) != -1) return true;
                if (item.system.description.toLowerCase().search(this.tabData.items.filters.text.toLowerCase()) != -1) return true;
                return false;
            });
        }

        // SORT
        //compendiumItems.sort((a, b) => a.name.localeCompare(b.name));
        compendiumItems.sort((a, b) => a.compendiumSource.localeCompare(b.compendiumSource));
        compendiumItems.sort((a, b) => a.system.ir - b.system.ir);
        return compendiumItems
    }

    filterSkills(compendiumSkills) {
        this.tabData.skills.refilter = false;
        // FILTER COMPENDIUMS
        if (this.tabData.skills.filters.compendiumSources.length > 0) {
            compendiumSkills = compendiumSkills.filter((skill, index) => {
                if (this.tabData.skills.filters.compendiumSources.includes(skill.compendiumSource)) return true;
                return false;
            });
        };
        // FILTER TIMINGS
        if (this.tabData.skills.filters.timings.length > 0) {
            compendiumSkills = compendiumSkills.filter((skill, index) => {
                if (this.tabData.skills.filters.timings.includes(skill.system.timing)) return true;
                return false;
            });
        };
        // FILTER LIMITS
        if (this.tabData.skills.filters.limits.length > 0) {
            compendiumSkills = compendiumSkills.filter((skill, index) => {
                if (this.tabData.skills.filters.limits.includes(skill.system.limit.type)) return true;
                return false;
            });
        };
        // FILTER TAGS INCLUDES
        const skillIncludeTags = this.tabData.skills.filters.tags.tags.filter(tag => !tag.not).map(t => t.value.toLowerCase());
        if (skillIncludeTags.length > 0) {
            if (this.tabData.skills.filters.tags.mode == "and") {
                compendiumSkills = compendiumSkills.filter((skill, index) => {
                    let loweredMap = skill.system.tags.map(t => t.toLowerCase());
                    return skillIncludeTags.every(tag => {
                        return loweredMap.includes(tag);
                    });
                });
            } else if (this.tabData.skills.filters.tags.mode == "or") {
                compendiumSkills = compendiumSkills.filter((skill, index) => {
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
        const skillExcludeTags = this.tabData.skills.filters.tags.tags.filter(tag => tag.not).map(t => t.value.toLowerCase());
        if (skillExcludeTags.length > 0) {
            compendiumSkills = compendiumSkills.filter((skill, index) => {
                let loweredMap = skill.system.tags.map(t => t.toLowerCase());
                return skillExcludeTags.some(tag => {
                    return !loweredMap.includes(tag);
                });
            });
        }
        
        // FILTER TEXT
        if (this.tabData.skills.filters.text != "") {
            compendiumSkills = compendiumSkills.filter((skill, index) => {
                if (skill.name.toLowerCase().search(this.tabData.skills.filters.text.toLowerCase()) != -1) return true;
                if (skill.system.description.toLowerCase().search(this.tabData.skills.filters.text.toLowerCase()) != -1) return true;
                return false;
            });
        }

        // SORT
        compendiumSkills.sort((a, b) => a.name.localeCompare(b.name));
        compendiumSkills.sort((a, b) => a.system.timing.localeCompare(b.system.timing));
        compendiumSkills.sort((a, b) => {
            let intA, intB;
            intA = a.system.tags.includes("Combat") ? 1 : 2;
            intB = b.system.tags.includes("Combat") ? 1 : 2;
            return intA - intB;
        });
        compendiumSkills.sort((a, b) => a.compendiumSource.localeCompare(b.compendiumSource));
        return compendiumSkills
    }

    async loadCompendiums() {
        const skills = [];
        const items = [];
        const classes = [];
        const races = [];
        const compendiums = [];
        const skillTags = [];
        const itemTags = [];

        
        SceneNavigation.displayProgressBar({label:"Loading Compendiums", pct:0});
        let nPacks = game.packs.size;
        let current = 0;
        for (let pack of game.packs) {
            let progress = Math.floor((current/nPacks) * 100);
            SceneNavigation.displayProgressBar({label:`Loading ${current} of ${nPacks}`, pct: progress});
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
            current += 1;
        }
        SceneNavigation.displayProgressBar({label:`Loaded ${current} of ${nPacks}`, pct: 100});
        
        return {skills: skills, items: items, classes: classes, races: races, compendiums: compendiums, skillTags: skillTags, itemTags: itemTags}
    }
  }
  