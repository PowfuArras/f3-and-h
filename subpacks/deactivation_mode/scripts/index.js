import { system, world } from "@minecraft/server"

const LoreHeader = "\n§r§bF3&H Data";

function removeItemInfo(itemStack) {
	let changed = false;
	const lore = itemStack.getLore();
	let headerIndex = lore.indexOf(LoreHeader);
	if (headerIndex !== -1) {
		lore.splice(headerIndex, lore.length - headerIndex);
		changed = true;
	}
	if (changed) itemStack.setLore(lore);
	return {
		changed: changed,
		itemStack: itemStack
	};
}

system.runInterval(function () {
	for (const player of world.getAllPlayers()) {
		const inventory = player.getComponent("inventory");
		if (inventory === undefined) continue;
		if (inventory.container === undefined) continue;
		for (let i = 0; i < inventory.container.size; i++) {
			const itemStack = inventory.container.getItem(i);
			if (itemStack === undefined) continue;
			const result = removeItemInfo(itemStack);
			if (result.changed) inventory.container.setItem(i, result.itemStack);
		}
		const equippable = player.getComponent("equippable");
		for (const slot of ["Head", "Chest", "Legs", "Feet"]) {
			const itemStack = equippable.getEquipment(slot);
			if (itemStack === undefined) continue;
			const result = removeItemInfo(itemStack);
			if (result.changed) equippable.setEquipment(slot, result.itemStack);
		}
		if (!player.isSneaking) {
			const itemStack = equippable.getEquipment("Offhand");
			if (itemStack === undefined) continue;
			const result = removeItemInfo(itemStack);
			if (result.changed) equippable.setEquipment("Offhand", result.itemStack);
		}
	}
}, 10);

world.afterEvents.entitySpawn.subscribe(function (event) {
	if (event.entity.typeId !== "minecraft:item") return;
	if (!event.entity.hasComponent("item")) return;
	const component = event.entity.getComponent("item");
	const result = removeItemInfo(component.itemStack);
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
		const result = removeItemInfo(itemStack);
		if (result.changed) inventory.container.setItem(i, result.itemStack);
	}
});

let disabledWarningShown = false;
world.afterEvents.playerSpawn.subscribe(function (event) {
	if (!disabledWarningShown) {
		system.runTimeout(function () {
			event.player.sendMessage(`§cNote: You are in F3&H Deactivation mode.\n§7This is used to remove transformations made by this addon.\n§7To use this correctly, keep this addon enabled until you can confirm all items have been untransformed to there normal state. This means open all containers, inventories, etc.\n\n§aIf you enabled this by mistake, change the behavior pack settings to activation mode.`);
		}, 40);
		disabledWarningShown = true;
	}
});