import { readFileSync } from "node:fs"
import Papa from "papaparse"

export interface StopProps {
	stop_name: string
	tts_stop_name: string
}

/** Maps a stop's raw, as-published stop_name to its cleaned name + TTS-friendly name. */
export function loadStopProps(): Map<string, StopProps> {
	const content = readFileSync("./transform/pezinok/help/stop-props.csv", "utf-8")
	const rows = Papa.parse<{ original_stop_name: string; stop_name: string; tts_stop_name: string }>(content, {
		header: true,
		skipEmptyLines: true,
	}).data

	return new Map(rows.map((r) => [r.original_stop_name, { stop_name: r.stop_name, tts_stop_name: r.tts_stop_name }]))
}
