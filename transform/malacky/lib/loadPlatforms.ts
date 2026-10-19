import { loadOsmPlatforms } from "../../../lib/osmPlatforms.ts"

const OSM_EXTRACT_PATH = "./tmp/slovakia-latest.osm.pbf"

// Malacky's stops.txt coordinates, padded by ~0.01° (~1km) on each side.
const MALACKY_BBOX = { minLat: 48.4099, maxLat: 48.4541, minLon: 16.9866, maxLon: 17.0494 }

export function loadMalackyPlatforms() {
	return loadOsmPlatforms(OSM_EXTRACT_PATH, MALACKY_BBOX)
}
