# Log Horizon TRPG System

This is a Log Horizon TRPG game system for Foundry VTT.

This system is built on the Boilerplate System by Asacolips.
Some code is based on Atropos' dnd5e system.
Extended active effect functionality adapted from Tim Posney's Dynamic Active Effects.
They have been very helpful resources to understand how Foundry works.


Active effects can reference character stats using "@". (example: @abilities.pow.mod)
Calculated stats such as ability modifiers have no effect if added to ".bonus" since calculated values are all calculated at the same time.

For all:
Do not change ".value" through active effects.

For combatstats:
".total" is calculated from ".value" and ".bonus".

For attributes:
".total" is calculated from ".bonus" and the relevant ability's ".mod". (example: athletics.total = athletics.bonus + abilities.str.mod)
".dice" adds d6s to rolls. Attribute rolls are "2d6 + (value) + (total) + (dice)d6"


List of referencable values in active effects and skills:
data.combatstats.patk.value (Do not change)
data.combatstats.patk.bonus
data.combatstats.patk.total (calculated)

data.combatstats.matk.value (Do not change)
data.combatstats.matk.bonus
data.combatstats.matk.total (calculated)

data.combatstats.pdef.value (Do not change)
data.combatstats.pdef.bonus
data.combatstats.pdef.total (calculated)

data.combatstats.mdef.value (Do not change)
data.combatstats.mdef.bonus
data.combatstats.mdef.total (calculated)

data.combatstats.initiative.value (Do not change)
data.combatstats.initiative.bonus
data.combatstats.initiative.total (calculated)

data.combatstats.speed.value (Do not change)
data.combatstats.speed.bonus
data.combatstats.speed.total (calculated)

data.combatstats.recovery.value (Do not change)
data.combatstats.recovery.bonus
data.combatstats.recovery.total (calculated)

data.abilities.str.value (Do not change)
data.abilities.str.base (calculated)
data.abilities.str.mod (calculated)

data.abilities.dex.value (Do not change)
data.abilities.dex.base (calculated)
data.abilities.dex.mod (calculated)

data.abilities.pow.value (Do not change)
data.abilities.pow.base (calculated)
data.abilities.pow.mod (calculated)

data.abilities.int.value (Do not change)
data.abilities.int.base (calculated)
data.abilities.int.mod (calculated)


data.attributes.athletics.value (Do not change)
data.attributes.athletics.bonus
data.attributes.athletics.dice
data.attributes.athletics.total (calculated)

data.attributes.endurance.value (Do not change)
data.attributes.endurance.bonus
data.attributes.endurance.dice
data.attributes.endurance.total (calculated)

data.attributes.disable.value (Do not change)
data.attributes.disable.bonus
data.attributes.disable.dice
data.attributes.disable.total (calculated)

data.attributes.operate.value (Do not change)
data.attributes.operate.bonus
data.attributes.operate.dice
data.attributes.operate.total (calculated)

data.attributes.perception.value (Do not change)
data.attributes.perception.bonus
data.attributes.perception.dice
data.attributes.perception.total (calculated)

data.attributes.negotiation.value (Do not change)
data.attributes.negotiation.bonus
data.attributes.negotiation.dice
data.attributes.negotiation.total (calculated)

data.attributes.knowledge.value (Do not change)
data.attributes.knowledge.bonus
data.attributes.knowledge.dice
data.attributes.knowledge.total (calculated)

data.attributes.analyze.value (Do not change)
data.attributes.analyze.bonus
data.attributes.analyze.dice
data.attributes.analyze.total (calculated)

data.attributes.accuracy.value (Do not change)
data.attributes.accuracy.bonus
data.attributes.accuracy.dice
data.attributes.accuracy.total (calculated)

data.attributes.evasion.value (Do not change)
data.attributes.evasion.bonus
data.attributes.evasion.dice
data.attributes.evasion.total (calculated)

data.attributes.resistance.value (Do not change)
data.attributes.resistance.bonus
data.attributes.resistance.dice
data.attributes.resistance.total (calculated)


data.hp.base
data.hp.mod (gained per cr after 1)
data.hp.basemax (calculated, without fatigue)
data.hp.max  (calculated, with fatigue reduction)

data.fate.max

data.inventory.value
data.inventory.max

data.item.sr.value (Only if the effect is attached to a skill or an item)
