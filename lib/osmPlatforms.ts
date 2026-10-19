import { readFileSync } from "node:fs"
import tinyosmpbf, { type OsmNode } from "tiny-osmpbf"
import type { Platform } from "./platforms.ts"

export interface BoundingBox {
	minLat: number
	maxLat: number
	minLon: number
	maxLon: number
}

export interface OsmPlatformAttributes {
	osmId: number
	tags: Record<string, string>
}

// Parsing a whole-country .osm.pbf is expensive, so each file is only ever
// read and filtered down to transit nodes once, no matter how many cities
// pull platforms from it.
const busStopsByPath = new Map<string, OsmNode[]>()

function isBusStop(el: { tags: Record<string, string> }) {
	return el.tags.highway === "bus_stop" || el.tags.public_transport === "platform"
}

function busStopNodes(pbfPath: string): OsmNode[] {
	let nodes = busStopsByPath.get(pbfPath)
	if (!nodes) {
		console.time(`Parsing ${pbfPath}`)
		// Passed a handler so tiny-osmpbf streams elements through it instead of
		// collecting every node/way/relation in the country into memory first.
		const collected: OsmNode[] = []
		tinyosmpbf(readFileSync(pbfPath), (el) => {
			if (el.type === "node" && isBusStop(el)) collected.push(el)
		})
		nodes = collected
		console.timeEnd(`Parsing ${pbfPath}`)
		busStopsByPath.set(pbfPath, nodes)
	}
	return nodes
}

const inBox = (node: OsmNode, box: BoundingBox) =>
	node.lat >= box.minLat && node.lat <= box.maxLat && node.lon >= box.minLon && node.lon <= box.maxLon

/** Bus/platform nodes from an OSM extract, narrowed to a city's bounding box. */
export function loadOsmPlatforms(pbfPath: string, box: BoundingBox): Platform<OsmPlatformAttributes>[] {
	return busStopNodes(pbfPath)
		.filter((node) => node.tags.name && inBox(node, box))
		.map((node) => ({
			id: String(node.id),
			name: node.tags.name!,
			lat: node.lat,
			lon: node.lon,
			attributes: { osmId: node.id, tags: node.tags },
		}))
}
