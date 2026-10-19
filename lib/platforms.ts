import { stringSimilarity } from "string-similarity-js"
import { distanceM, pickRightOfPath, type LatLon } from "../index.ts"
import type { Manipulate } from "./Manipulate.ts"
import type { Stop, StopTime } from "./types.ts"

export interface Platform<T = unknown> {
	id: string
	name: string
	lat: number
	lon: number
	attributes?: T
}

export function candidatesFor<T>(stopName: string, platforms: Platform<T>[]): Platform<T>[] {
	return platforms.filter((p) => stringSimilarity(stopName, p.name) > 0.7)
}

/** The candidate physically closest to `stop`, or null if there are none. */
export function nearestCandidate<T>(stop: LatLon, candidates: Platform<T>[]): Platform<T> | null {
	if (candidates.length === 0) return null
	return candidates.reduce((best, p) => (distanceM(stop, p) < distanceM(stop, best) ? p : best))
}

/**
 * Splits GTFS stops that have multiple directional platforms into separate
 * output stops, and repoints every intermediate stop_time onto whichever
 * platform sits on the right-hand side of travel for that trip's direction.
 * Termini (first/last stop of a trip) are left on their original GTFS stop —
 * a terminus has no "through" direction to pick a side from.
 *
 * `candidatesFor` is feed-specific: it maps a stop name to the platform
 * dataset's own candidates (e.g. by name similarity against an ArcGIS layer,
 * OSM data, or whatever that feed has available).
 *
 * `enrichStop`, if given, is applied to every output stop — both the ones
 * carried over unchanged and the newly split platforms — with whichever
 * candidate sits physically closest to it (null if none matched), so a feed
 * can pull in extra metadata (e.g. wheelchair accessibility from OSM tags)
 * without affecting which platform gets picked.
 *
 * `enrichStopTime`, if given, is applied to every output stop_time row —
 * since this function already owns the stop_times mapper (to repoint rows
 * onto split platforms), a feed that needs its own per-row stop_time tweaks
 * (e.g. cleaning up stop_headsign) must hook in here rather than adding a
 * second mapper("stop_times", ...) call, which would throw.
 */
export function correctPlatforms<T>(
	m: Manipulate<any>,
	candidatesFor: (stopName: string) => Platform<T>[],
	enrichStop?: (stop: Stop, match: Platform<T> | null) => Stop,
	enrichStopTime?: (stopTime: StopTime) => StopTime,
) {
	const stopTimesByTrip = new Map<string, StopTime[]>()
	for (const st of m.baseFeed.stop_times) {
		if (!stopTimesByTrip.has(st.trip_id)) stopTimesByTrip.set(st.trip_id, [])
		stopTimesByTrip.get(st.trip_id)!.push(st)
	}
	for (const rows of stopTimesByTrip.values()) rows.sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence))

	const tripIdsByPattern = new Map<string, string[]>()
	for (const trip of m.baseFeed.trips) {
		const pattern = (stopTimesByTrip.get(trip.trip_id) ?? []).map((st) => st.stop_id).join("->")
		if (!tripIdsByPattern.has(pattern)) tripIdsByPattern.set(pattern, [])
		tripIdsByPattern.get(pattern)!.push(trip.trip_id)
	}

	const stopsById = new Map(m.baseFeed.stops.map((s) => [s.stop_id, s]))
	const usedPlatforms = new Map<string, Platform<T>>()
	const platformAssignment = new Map<string, Platform<T>>() // key: `${trip_id}#${stop_sequence}`

	for (const [pattern, tripIds] of tripIdsByPattern) {
		const patternStops = pattern.split("->").map((id) => stopsById.get(id))
		if (patternStops.some((s) => !s)) {
			console.warn(`Skipping pattern with missing stops: ${pattern}`)
			continue
		}

		for (let i = 1; i < patternStops.length - 1; i++) {
			const A = patternStops[i - 1]!
			const B = patternStops[i]!
			const C = patternStops[i + 1]!

			const candidates = candidatesFor(B.stop_name ?? "")
			const options = candidates.length > 0 ? candidates : [
				{ id: B.stop_id, name: B.stop_name ?? "", lat: Number(B.stop_lat), lon: Number(B.stop_lon) },
			]

			const chosen = pickRightOfPath(
				{ lat: Number(A.stop_lat), lon: Number(A.stop_lon) },
				{ lat: Number(B.stop_lat), lon: Number(B.stop_lon) },
				{ lat: Number(C.stop_lat), lon: Number(C.stop_lon) },
				options,
			)
			if (chosen.id === B.stop_id) continue // no better platform than the stop itself

			usedPlatforms.set(chosen.id, chosen)
			const stopSequence = stopTimesByTrip.get(tripIds[0]!)![i]!.stop_sequence
			for (const tripId of tripIds) platformAssignment.set(`${tripId}#${stopSequence}`, chosen)
		}
	}

	// A base stop is only worth keeping if some surviving stop_time still points
	// at it — otherwise it's a leftover ghost left over from every trip through
	// it getting repointed onto a split platform instead.
	const stillReferenced = new Set<string>()
	for (const st of m.baseFeed.stop_times) {
		if (!platformAssignment.has(`${st.trip_id}#${st.stop_sequence}`)) stillReferenced.add(st.stop_id)
	}

	m.add("stops", () => {
		const carriedOver = m.baseFeed.stops
			.filter((stop) => stillReferenced.has(stop.stop_id))
			.map((stop) => {
				if (!enrichStop) return stop
				const match = nearestCandidate(
					{ lat: Number(stop.stop_lat), lon: Number(stop.stop_lon) },
					candidatesFor(stop.stop_name ?? ""),
				)
				return enrichStop(stop, match)
			})

		const splitPlatforms = [...usedPlatforms.values()].map((p): Stop => {
			const stop: Stop = {
				stop_id: `P${p.id}`,
				stop_name: p.name,
				stop_lat: p.lat.toFixed(6),
				stop_lon: p.lon.toFixed(6),
			}
			return enrichStop ? enrichStop(stop, p) : stop
		})

		return [...carriedOver, ...splitPlatforms]
	})

	m.mapper("stop_times", (st) => {
		const platform = platformAssignment.get(`${st.trip_id}#${st.stop_sequence}`)
		const result = platform ? { ...st, stop_id: `P${platform.id}` } : st
		return enrichStopTime ? enrichStopTime(result) : result
	})
}
