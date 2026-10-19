// Type definitions for tiny-osmpbf 1.0.0-beta.2

declare module 'tiny-osmpbf' {
	/** Fields shared by all parsed OSM elements (as returned in OSM-JSON output). */
	export interface OsmElementBase {
		id: number
		tags: { [key: string]: string }
		version?: number
		timestamp?: string
		changeset?: number
		uid?: number
		user?: string
		visible?: boolean
	}

	export interface OsmNode extends OsmElementBase {
		type: 'node'
		lat: number
		lon: number
	}

	export interface OsmWay extends OsmElementBase {
		type: 'way'
		nodes: number[]
	}

	export type OsmRelationMemberType = 'node' | 'way' | 'relation'

	export interface OsmRelationMember {
		type: OsmRelationMemberType
		ref: number
		role: string
	}

	export interface OsmRelation extends OsmElementBase {
		type: 'relation'
		members: OsmRelationMember[]
	}

	export type OsmElement = OsmNode | OsmWay | OsmRelation

	export interface OsmBounds {
		minlat: number
		minlon: number
		maxlat: number
		maxlon: number
	}

	export interface Osm3s {
		copyright?: string
		timestamp_osm_base?: string
	}

	/** Result object in OSM-JSON format, as used by the Overpass API. */
	export interface OsmJson {
		version: 0.6
		generator: string
		osm3s?: Osm3s
		bounds?: OsmBounds
		/** Parsed osm elements. Empty if a custom `handler` was supplied. */
		elements: OsmElement[]
	}

	export type OsmElementHandler = (element: OsmElement) => void

	/**
	 * Parses osm.pbf data.
	 *
	 * @param input - the osmpbf data to be parsed, as an ArrayBuffer, Uint8Array or Buffer
	 * @param handler - optional callback invoked for each parsed osm element (node, way, relation).
	 *                  If provided, `result.elements` will be empty since elements are not collected.
	 * @returns an OSM-JSON object with file metadata and (if no custom handler is given) all parsed osm elements
	 */
	function tinyosmpbf(
		input: ArrayBuffer | Uint8Array | Buffer,
		handler?: OsmElementHandler
	): OsmJson

	export default tinyosmpbf
}
