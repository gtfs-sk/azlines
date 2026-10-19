import { loadOsmPlatforms } from "../../../lib/osmPlatforms.ts"

const OSM_EXTRACT_PATH = "./tmp/slovakia-latest.osm.pbf"

// Topoľčany's stops.txt coordinates, padded by ~0.01° (~1km) on each side.
const TOPOLCANY_BBOX = { minLat: 48.5395, maxLat: 48.6165, minLon: 18.1292, maxLon: 18.1976 }

export function loadTopolcanyPlatforms() {
	return loadOsmPlatforms(OSM_EXTRACT_PATH, TOPOLCANY_BBOX)
}
