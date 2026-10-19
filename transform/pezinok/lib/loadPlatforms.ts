import platformsData from "../help/pezinok_platforms.json" with { type: "json" }
import type { Platform } from "../../../lib/platforms.ts"

const normalizeName = (name: string) => name.replace(/^Pezinok,\s*/, "").trim()

interface PezinokAddedAttributes {
	OBJECTID: number
	gid: number | null
	názov_zastávky: string
	spoje: string | null
	popis: string | null
	pristr: number | null
	kos: number | null
	p_miest: number | null
	stav: string
}

export function loadPezinokPlatforms(): Platform<PezinokAddedAttributes>[] {
	return platformsData.features.map((feature) => ({
		id: String(feature.attributes["OBJECTID"]),
		name: normalizeName(String(feature.attributes["názov_zastávky"])),
		lat: feature.geometry.y,
		lon: feature.geometry.x,
		attributes: feature.attributes,
	}))
}
