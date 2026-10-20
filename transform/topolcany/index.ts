import { Manipulate } from "../../lib/Manipulate.ts"
import { candidatesFor, nearestCandidate } from "../../lib/platforms.ts"
import { mapAzLinesAgency } from "../../lib/azLinesAgency.ts"
import { loadTopolcanyPlatforms } from "./lib/loadPlatforms.ts"
import { loadStopProps } from "./lib/loadStopProps.ts"

const m = new Manipulate({
	feedId: "TOPOLCANY_MHD",
	baseFeedPath: "./tmp/topolcany/feed",
	outFeedPath: "./data/topolcany",
})

const platforms = loadTopolcanyPlatforms()
const stopProps = loadStopProps()

// Platforms in Topoľčany feed look to be fine, just need to change their
// names — but we still pull in OSM metadata (e.g. wheelchair accessibility)
// for whichever OSM node sits closest to each one.
m.mapper("stops", (stop) => {
	let oldId = stop.stop_id
	const props = stopProps.get(stop.stop_name ?? "")
	stop.stop_name = props?.stop_name ?? stop.stop_name?.replace("Topoľčany,", "").trim()
	if (props?.tts_stop_name) stop.tts_stop_name = props.tts_stop_name

	const candidates = candidatesFor(stop.stop_name ?? "", platforms)
	const match = nearestCandidate({ lat: Number(stop.stop_lat), lon: Number(stop.stop_lon) }, candidates)
	const wheelchair = match?.attributes?.tags.wheelchair

	return {
		...stop,
		wheelchair_boarding:
			wheelchair === "yes" || wheelchair === "designated" ? "1" :
			wheelchair === "no" ? "2" :
					stop.wheelchair_boarding,
		// last number of the id gives the platform number kinda
		platform_code: match?.attributes?.tags.local_ref ?? stop.platform_code ?? [...oldId].pop(),
	}
})
m.copy("stop_times")

m.mapper("agency", (row) => mapAzLinesAgency(row))
m.mapper("routes", (route, meta) => ({
	...route,
	agency_id: meta.changedIdsMap.agency?.[route.agency_id ?? ""] ?? route.agency_id,
}))
m.mapper("trips", (trip) => {
	trip.trip_headsign = trip.trip_headsign?.replace("Topoľčany,", "").trim()
	return trip
})
m.copy("calendar")
m.copy("calendar_dates")
m.copy("feed_info")

m.addAtribution({
	organization_name: "OpenStreetMap contributors",
	attribution_url: "https://www.openstreetmap.org/copyright",
})
m.addAtribution({
	organization_name: "AZ - Lines s.r.o.",
	attribution_url: "https://www.az-lines.sk",
	attribution_notes: "Original feed provider",
})

m.saveFeed()
