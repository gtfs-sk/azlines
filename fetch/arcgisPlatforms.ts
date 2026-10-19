// Fetches the "Zastávky MHD Pezinok" public transit platforms layer from ArcGIS Online.
// https://www.arcgis.com/home/item.html?id=ebd4a79aa54245a2a2c71cf166a2c563

const SERVICE_URL = "https://services-eu1.arcgis.com/6mjX1RJdjBOiFWhC/arcgis/rest/services/zastavky_MHD_APRIL_bc8242db563c477c8911da0f212c4488/FeatureServer/76/query"
const OUT_FILE = "./transform/help/pezinok_platforms.json"

export interface PlatformsResponse {
	fields: Array<{ name: string; type: string; alias: string }>
	features: Array<{
		attributes: Record<string, unknown>
		geometry: { x: number; y: number } // x = lon, y = lat (WGS84)
	}>
}

export async function fetchPezinokPlatforms(outFile = OUT_FILE): Promise<PlatformsResponse> {
	const url = new URL(SERVICE_URL)
	url.searchParams.set("where", "1=1")
	url.searchParams.set("outFields", "*")
	url.searchParams.set("outSR", "4326")
	url.searchParams.set("f", "json")

	const res = await fetch(url)
	if (!res.ok) throw new Error(`ArcGIS request failed: ${res.status} ${res.statusText}`)
	const data = (await res.json()) as PlatformsResponse

	await Bun.write(outFile, JSON.stringify(data, null, 2))
	return data
}

if (import.meta.main) {
	const platforms = await fetchPezinokPlatforms()
	console.log(`Saved ${platforms.features.length} platforms to ${OUT_FILE}`)
}
