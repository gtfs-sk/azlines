import type { Agency } from "./types.ts"

// AZ-Lines operates MHD in several towns under different legal entities, each
// published with its own agency_id but the same two company names. This maps
// those names onto the entities' real IČO (business registration number).
const icoByAgencyName: Record<string, string> = {
	"AZ-Lines s.r.o.": "SK54903360",
	"AZ-Lines Services Group s.r.o.,": "SK57334579",
}

export function mapAzLinesAgency(agency: Agency): Agency {
	const agencyId = icoByAgencyName[agency.agency_name]
	if (!agencyId) {
		console.warn(`Unknown AZ-Lines agency name: ${agency.agency_name}`)
		return agency
	}
	return { ...agency, agency_id: agencyId }
}
