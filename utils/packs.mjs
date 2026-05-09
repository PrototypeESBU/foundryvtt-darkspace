import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { ClassicLevel } from "classic-level";
import { deleteAsync } from "del";
import { mkdir, readdir, writeFile } from "fs/promises";
import gulp from "gulp";
import path from "node:path";

const PACKS_SRC_PATH = "./packs";
const PACKS_DST_PATH = "./module/packs";

async function cleanPacks() {
	return deleteAsync(PACKS_DST_PATH);
}
export const clean = cleanPacks;

async function compilePacks() {
	const packDirs = await readdir(PACKS_SRC_PATH);
	for (const pack of packDirs) {
		const src = path.join(PACKS_SRC_PATH, pack);
		const dst = path.join(PACKS_DST_PATH, pack);
		await compilePack(src, dst, { recursive: false, log: true });
	}
}
export const compile = compilePacks;

async function exportPacks() {
	const packDirs = await readdir(PACKS_DST_PATH);
	for (const pack of packDirs) {
		const src = path.join(PACKS_DST_PATH, pack);
		const dst = path.join(PACKS_SRC_PATH, pack);
		await mkdir(dst, { recursive: true });

		const db = new ClassicLevel(src, { keyEncoding: "utf8", valueEncoding: "json", readOnly: true });
		await db.open();

		for await (const [key, value] of db.iterator()) {
			delete value._stats;
			delete value.ownership;
			delete value.sort;
			for (const flag in value.flags ?? {}) {
				if (flag !== "darkspace") delete value.flags[flag];
			}
			value._key = key;

			const safeName = value.name?.replace(/[^a-z0-9]/gi, "_") ?? value._id;
			const filename = `${safeName}_${value._id}.json`;
			await writeFile(path.join(dst, filename), JSON.stringify(value, null, 2) + "\n");
			console.log(`Wrote ${filename}`);
		}

		await db.close();
	}
}
export const exportAll = exportPacks;

export function watchPackUpdates() {
	gulp.watch(`${PACKS_SRC_PATH}/**/*.json`, compile);
}
export const watchUpdates = watchPackUpdates;
