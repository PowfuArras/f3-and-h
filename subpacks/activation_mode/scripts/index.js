import { system, world, ItemStack, ItemDurabilityComponent, EquipmentSlot, EntityItemComponent } from "@minecraft/server";

const LoreHeader = "\n§r§bF3&H Data";

const DatalessItemCooldownData = new Map([
	["minecraft:chorus_fruit", 20],
	["minecraft:ender_pearl", 20],
	["minecraft:goat_horn", 140]
]);

const DatalessItemNutritionData = new Map([
    ["minecraft:apple", 2],
    ["minecraft:baked_potato", 2.5],
    ["minecraft:beetroot", 0.5],
    ["minecraft:beetroot_soup", 3],
    ["minecraft:bread", 2.5],
    ["minecraft:carrot", 1.5],
    ["minecraft:chorus_fruit", 2],
    ["minecraft:cooked_beef", 4],
    ["minecraft:cooked_chicken", 3],
    ["minecraft:cooked_cod", 2.5],
    ["minecraft:cooked_mutton", 3],
    ["minecraft:cooked_porkchop", 4],
    ["minecraft:cooked_rabbit", 2.5],
    ["minecraft:cooked_salmon", 3],
    ["minecraft:cookie", 1],
    ["minecraft:dried_kelp", 0.5],
    ["minecraft:enchanted_golden_apple", 2],
    ["minecraft:golden_apple", 2],
    ["minecraft:glow_berries", 1],
    ["minecraft:golden_carrot", 3],
    ["minecraft:honey_bottle", 3],
    ["minecraft:melon_slice", 1],
    ["minecraft:mushroom_stew", 3],
    ["minecraft:poisonous_potato", 1],
    ["minecraft:potato", 0.5],
    ["minecraft:pufferfish", 0.5],
    ["minecraft:pumpkin_pie", 4],
    ["minecraft:rabbit_stew", 5],
    ["minecraft:beef", 1.5],
    ["minecraft:chicken", 1],
    ["minecraft:cod", 1],
    ["minecraft:mutton", 1],
    ["minecraft:porkchop", 1.5],
    ["minecraft:rabbit", 1.5],
    ["minecraft:salmon", 1],
    ["minecraft:rotten_flesh", 2],
    ["minecraft:spider_eye", 1],
    ["minecraft:suspicious_stew", 3],
    ["minecraft:sweet_berries", 1],
    ["minecraft:tropical_fish", 0.5]
]);

/** @param { ItemStack } itemStack @returns { { changed: boolean, itemStack: ItemStack } } */
function applyItemInfo(itemStack) {
	let changed = false;
	const lore = itemStack.getLore();
	// Compatability patch for Better on Bedrock's backpacks
	if (/^better_on_bedrock:backpack/.test(itemStack.typeId) && lore.length === 0) {
		return {
			changed: false,
			itemStack: itemStack
		};
	}
	let headerIndex = lore.indexOf(LoreHeader);
	if (headerIndex === -1) {
		changed = true;
		lore.push(LoreHeader);
		headerIndex = lore.length;
	} else headerIndex++;
	let infoTypeId = `§r§7ID §r§6${itemStack.typeId}`;
	if (lore[headerIndex++] !== infoTypeId) {
		lore[headerIndex - 1] = infoTypeId;
		changed = true;
	}
	if (itemStack.hasComponent("durability")) {
		let data = itemStack.getComponent("durability");
		let info = `§r§7Durability §6${data.maxDurability - data.damage}/${data.maxDurability}`
		if (lore[headerIndex++] !== info) {
			lore[headerIndex - 1] = info;
			changed = true;
		}
	}
	if (itemStack.hasComponent("food") || DatalessItemNutritionData.has(itemStack.typeId)) {
		let data = itemStack.getComponent("food") ?? { nutrition: DatalessItemNutritionData.get(itemStack.typeId) };
		let info = `§r§7Nutrition §6${data.nutrition}`;
		if (lore[headerIndex++] !== info) {
			lore[headerIndex - 1] = info;
			changed = true;
		}
	}
	if (itemStack.hasComponent("cooldown") || DatalessItemCooldownData.has(itemStack.typeId)) {
		let data = itemStack.getComponent("cooldown") ?? { cooldownTicks: DatalessItemCooldownData.get(itemStack.typeId) };
		let info = `§r§7Cooldown §6${data.cooldownTicks} tick(s)`;
		if (lore[headerIndex++] !== info) {
			lore[headerIndex - 1] = info;
			changed = true;
		}
	}
	if (changed) itemStack.setLore(lore);
	return {
		changed: changed,
		itemStack: itemStack
	}
}

system.runInterval(function () {
	for (const player of world.getAllPlayers()) {
		const inventory = player.getComponent("inventory");
		if (inventory === undefined) continue;
		if (inventory.container === undefined) continue;
		for (let i = 0; i < inventory.container.size; i++) {
			const itemStack = inventory.container.getItem(i);
			if (itemStack === undefined) continue;
			const result = applyItemInfo(itemStack);
			if (result.changed) inventory.container.setItem(i, result.itemStack);
		}
		const equippable = player.getComponent("equippable");
		for (const slot of ["Head", "Chest", "Legs", "Feet"]) {
			const itemStack = equippable.getEquipment(slot);
			if (itemStack === undefined) continue;
			const result = applyItemInfo(itemStack);
			if (result.changed) equippable.setEquipment(slot, result.itemStack);
		}
		if (!player.isSneaking) {
			const itemStack = equippable.getEquipment("Offhand");
			if (itemStack === undefined) continue;
			const result = applyItemInfo(itemStack);
			if (result.changed) equippable.setEquipment("Offhand", result.itemStack);
		}
	}
}, 10);

world.afterEvents.entitySpawn.subscribe(function applyItemInfoToEntity(event) {
	if (event.entity.typeId !== "minecraft:item") return;
	if (!event.entity.hasComponent("item")) return;
	const component = event.entity.getComponent("item");
	const result = applyItemInfo(component.itemStack);
	if (!result.changed) return;
	event.entity.dimension.spawnItem(result.itemStack, event.entity.location);
	event.entity.remove();
});

world.afterEvents.playerInteractWithBlock.subscribe(function (event) {
	const inventory = event.block.getComponent("inventory");
	if (inventory === undefined) return;
	if (inventory.container === undefined) return;
	for (let i = 0; i < inventory.container.size; i++) {
		const itemStack = inventory.container.getItem(i);
		if (itemStack === undefined) continue;
		const result = applyItemInfo(itemStack);
		if (result.changed) inventory.container.setItem(i, result.itemStack);
	}
});