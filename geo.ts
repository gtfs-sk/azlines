// Small geometry helpers. All "XY" values are in metres on a local flat map
// (x = east, y = north), which is accurate enough at the scale of a town.

export interface LatLon {
	lat: number;
	lon: number;
}

export interface XY {
	x: number;
	y: number;
}

/** Project `p` to metres relative to `origin` (equirectangular approximation). */
export function toXY(p: LatLon, origin: LatLon): XY {
	const mPerDegLat = 110_540;
	const mPerDegLon = 111_320 * Math.cos((origin.lat * Math.PI) / 180);
	return {
		x: (p.lon - origin.lon) * mPerDegLon,
		y: (p.lat - origin.lat) * mPerDegLat,
	};
}

/** Inverse of toXY: metres relative to `origin` back to lat/lon. */
export function fromXY(v: XY, origin: LatLon): LatLon {
	const mPerDegLat = 110_540;
	const mPerDegLon = 111_320 * Math.cos((origin.lat * Math.PI) / 180);
	return { lat: origin.lat + v.y / mPerDegLat, lon: origin.lon + v.x / mPerDegLon };
}

export const sub = (a: XY, b: XY): XY => ({ x: a.x - b.x, y: a.y - b.y });
export const len = (a: XY): number => Math.hypot(a.x, a.y);
export const dot = (a: XY, b: XY): number => a.x * b.x + a.y * b.y;

/**
 * 2D cross product d × v.
 * Negative => v lies to the RIGHT of direction d (clockwise side).
 * Positive => v lies to the LEFT.
 */
export const cross = (d: XY, v: XY): number => d.x * v.y - d.y * v.x;

/** Compass bearing of vector `d` in degrees: 0 = north, 90 = east, 180 = south, 270 = west. */
export function bearing(d: XY): number {
	const deg = (Math.atan2(d.x, d.y) * 180) / Math.PI;
	return (deg + 360) % 360;
}

/** Unsigned angle between two vectors in degrees (0..180). */
export function angleBetween(a: XY, b: XY): number {
	return (Math.atan2(Math.abs(cross(a, b)), dot(a, b)) * 180) / Math.PI;
}

export function centroid(points: LatLon[]): LatLon {
	const n = points.length;
	return {
		lat: points.reduce((s, p) => s + p.lat, 0) / n,
		lon: points.reduce((s, p) => s + p.lon, 0) / n,
	};
}

export function distanceM(a: LatLon, b: LatLon): number {
	return len(toXY(b, a));
}

const unit = (v: XY): XY => ({ x: v.x / len(v), y: v.y / len(v) });

/**
 * Given a path through A -> B -> C, picks whichever of `candidates` sits on the
 * right-hand side of travel at B (the side you'd keep to driving on the right).
 * Heading at B is approximated as the sum of the incoming (A->B) and outgoing
 * (B->C) directions; if the path nearly reverses there (heading length ~0),
 * falls back to the outgoing direction alone.
 */
export function pickRightOfPath<T extends LatLon>(A: LatLon, B: LatLon, C: LatLon, candidates: T[]): T {
	if (candidates.length === 1) return candidates[0]!;

	const inDir = unit(toXY(B, A));
	const outDir = unit(toXY(C, B));
	const heading = { x: inDir.x + outDir.x, y: inDir.y + outDir.y };
	const useHeading = len(heading) > 0.2 ? heading : outDir;

	return candidates
		.map((p) => ({ p, side: cross(useHeading, toXY(p, B)) }))
		.sort((a, b) => a.side - b.side)[0]!.p;
}
