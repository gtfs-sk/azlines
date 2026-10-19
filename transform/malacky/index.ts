import { Manipulate } from "../../lib/Manipulate.ts"
import { candidatesFor, correctPlatforms } from "../../lib/platforms.ts"
import { mapAzLinesAgency } from "../../lib/azLinesAgency.ts"
import { loadMalackyPlatforms } from "./lib/loadPlatforms.ts"
import { loadStopProps } from "./lib/loadStopProps.ts"

const m = new Manipulate({
	feedId: "MALACKY_MHD",
	baseFeedPath: "./tmp/malacky/feed",
	outFeedPath: "./data/malacky",
})

const platforms = loadMalackyPlatforms()
const stopProps = loadStopProps()

correctPlatforms(
	m,
	(stopName) => candidatesFor(stopName, platforms),
	(stop, match) => {
		const props = stopProps.get(stop.stop_name ?? "")
		stop.stop_name = (props?.stop_name ?? stop.stop_name ?? "")
			.replace("Malacky,", "")
			.replace("MA,", "")
		if (props?.tts_stop_name) stop.tts_stop_name = props.tts_stop_name

		const wheelchair = match?.attributes?.tags.wheelchair
		return {
			...stop,
			wheelchair_boarding:
				wheelchair === "yes" || wheelchair === "designated" ? "1" :
				wheelchair === "no" ? "2" :
				stop.wheelchair_boarding,
			platform_code: match?.attributes?.tags.local_ref ?? stop.platform_code,
		}
	},
	(st) => (st.stop_headsign ? { ...st, stop_headsign: st.stop_headsign.replace("MA,", "").trim() } : st),
)

m.mapper("agency", (row) => mapAzLinesAgency(row))
m.mapper("routes", (_route, meta) => {
	let route = { ..._route }
	route.agency_id = meta.changedIdsMap.agency?.[route.agency_id ?? ""] ?? route.agency_id
	route.route_text_color = "FFFFFF"
	switch (route.route_short_name) {
		case "A":
			route.route_color = "00963f"
			route.route_long_name = "Žel. stanica - Sídlisko Juh"
			break
		case "B":
			route.route_color = "eb1c24"
			route.route_long_name = "Žel. stanica - Gymnázium - Vinohrádok"
			break
		case "C":
			route.route_color = "007ebc"
			route.route_long_name = "Žel. stanica - Nemocnica"
			break
	}

	return route
})
m.copy("trips")
m.copy("calendar")
m.copy("calendar_dates")
m.copy("feed_info")

m.addAtribution({
	organization_name: "OpenStreetMap contributors",
	attribution_url: "https://www.openstreetmap.org/copyright",
})

m.saveFeed()
