import { Manipulate } from "../../lib/Manipulate.ts"
import { candidatesFor, correctPlatforms, nearestCandidate } from "../../lib/platforms.ts"
import { mapAzLinesAgency } from "../../lib/azLinesAgency.ts"
import { loadPezinokPlatforms } from "./lib/loadPlatforms.ts"
import { loadPezinokOsmMetadata } from "./lib/loadOsmMetadata.ts"
import { loadStopProps } from "./lib/loadStopProps.ts"

const m = new Manipulate({
	feedId: "PEZINOK_MHD",
	baseFeedPath: "./tmp/pezinok/feed",
	outFeedPath: "./data/pezinok",
})

const platforms = loadPezinokPlatforms()
const osmMetadata = loadPezinokOsmMetadata()
const stopProps = loadStopProps()

correctPlatforms(
	m,
	(stopName) => candidatesFor(stopName, platforms),
	(stop, arcgisMatch) => {
		const props = stopProps.get(stop.stop_name ?? "")
		stop.stop_name = props?.stop_name ?? stop.stop_name?.replace("Pezinok,", "").trim()
		if (props?.tts_stop_name) stop.tts_stop_name = props.tts_stop_name

		// ArcGIS' free-text "popis" sometimes states a lettered platform, e.g. "zastavka C"
		const arcgisPlatformCode = arcgisMatch?.attributes?.popis?.match(/zastavka\s+([A-Z])\b/i)?.[1]

		const osmMatch = nearestCandidate(
			{ lat: Number(stop.stop_lat), lon: Number(stop.stop_lon) },
			candidatesFor(stop.stop_name ?? "", osmMetadata),
		)
		const wheelchair = osmMatch?.attributes?.tags.wheelchair
		stop.wheelchair_boarding =
			wheelchair === "yes" || wheelchair === "designated" ? "1" :
			wheelchair === "no" ? "2" :
			stop.wheelchair_boarding
		stop.platform_code = arcgisPlatformCode ?? osmMatch?.attributes?.tags.local_ref ?? stop.platform_code

		return stop
	},
)

m.mapper("agency", (row) => mapAzLinesAgency(row))

// Long names from the operator's own line descriptions (https://azlines.sk, MHD Pezinok page).
// V-prefixed lines aren't described separately there — assumed to be weekend/holiday
// variants of their non-V counterpart (3, X5, 33, X55) since the service runs every day.
const routeLongNames: Record<string, string> = {
	"1": "Nemocnica — Sídlisko Sever — Železničná stanica",
	"11": "Nemocnica — Sídlisko Sever — Železničná stanica",
	"2": "Nemocnica — Sídlisko Muškát — Železničná stanica",
	"22": "Nemocnica — Sídlisko Muškát — Železničná stanica",
	"3": "Kučišdorfská dolina — Sídlisko Sever — Železničná stanica",
	"33": "Kučišdorfská dolina — Sídlisko Sever — Železničná stanica",
	"4": "Malý okruh: Železničná stanica — Sídlisko Sever — Sídlisko Juh — Železničná stanica",
	"24": "Prepojenie mesta: Železničná stanica — Sídlisko Sever — Okružná — Sídlisko Juh — Železničná stanica",
	"X5": "Nemocnica — Železničná stanica — Grinava",
	"X55": "Nemocnica — Železničná stanica — Grinava",
	V3: "Kučišdorfská dolina — Sídlisko Sever — Železničná stanica",
	V5: "Nemocnica — Železničná stanica — Grinava",
	"V 55": "Nemocnica — Železničná stanica — Grinava",
	V33: "Kučišdorfská dolina — Sídlisko Sever — Železničná stanica",
}
m.mapper("routes", (route) => ({
	...route,
	route_long_name: routeLongNames[route.route_short_name ?? ""] ?? route.route_long_name,
}))
m.copy("trips")
m.copy("calendar")
m.copy("calendar_dates")
m.copy("feed_info")

m.addAtribution({
	organization_name: "Mesto Pezinok — Zastávky MHD Pezinok (ArcGIS Online)",
	attribution_url: "https://www.arcgis.com/home/item.html?id=ebd4a79aa54245a2a2c71cf166a2c563",
})
m.addAtribution({
	organization_name: "OpenStreetMap contributors",
	attribution_url: "https://www.openstreetmap.org/copyright",
})

m.saveFeed()
