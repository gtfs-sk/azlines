import { loadOsmPlatforms } from "../../../lib/osmPlatforms.ts"

const OSM_EXTRACT_PATH = "./tmp/slovakia-latest.osm.pbf"

// Pezinok's stops.txt coordinates, padded by ~0.01° (~1km) on each side.
const PEZINOK_BBOX = { minLat: 48.2606, maxLat: 48.3394, minLon: 17.2376, maxLon: 17.2884 }

export function loadPezinokOsmMetadata() {
	return loadOsmPlatforms(OSM_EXTRACT_PATH, PEZINOK_BBOX)
}
