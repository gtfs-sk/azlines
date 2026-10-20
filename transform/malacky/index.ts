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
	.setupMetadata("keptIDs", {
		routes: new Set<string>(),
		fareMedia: new Set<string>(),
		fareProducts: new Set<string>(),
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
	meta.keptIDs.routes.add(route.route_id ?? "")
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

m.add("fare_attributes", () => [
	{
		fare_id: "1",
		price: "0.50",
		currency_type: "EUR",
		payment_method: "0",
		transfers: "0",
	},
])

m.add("fare_rules", (meta) => {
	return [...meta.keptIDs.routes.values()].map(route_id => ({
		fare_id: "1",
		route_id,
	}))
})

m.add("fare_media", (meta) => {
	let res = [
		{
			fare_media_id: "cash",
			fare_media_name: "Hotovosť",
			fare_media_type: "0",
		},
		{
			fare_media_id: "transit-card",
			fare_media_name: "Dopravná karta",
			fare_media_type: "1",
		},
		// {
		// 	fare_media_id: "cyril-nicl",
		// 	fare_media_name: "Aplikácia Cyril (NICL)",
		// 	fare_media_type: "2",
		// }
	]
	res.map(r => r.fare_media_id).forEach(e => meta.keptIDs.fareMedia.add(e))
	return res
})

m.add("fare_products", (meta) => {
	return [...meta.keptIDs.fareMedia.values()].map((fare_media_id, i) => {
		const fare_product_id = "cestovne" + i
		meta.keptIDs.fareProducts.add(fare_product_id)
		return {
			fare_product_id,
			fare_product_name: "Cestovné",
			fare_media_id,
			amount: "0.50",
			currency: "EUR",
		}
	})
})

m.add("fare_leg_rules", (meta) => {
	return [...meta.keptIDs.fareProducts.values()].map((fare_product_id) => ({
		fare_product_id,
	}))
})

m.addAtribution({
	organization_name: "OpenStreetMap contributors",
	attribution_url: "https://www.openstreetmap.org/copyright",
})

m.saveFeed()
