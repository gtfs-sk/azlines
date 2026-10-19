import type { Agency } from "./types.ts"

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
	return { ...agency, agency_id: agencyId, agency_url: "https://www.az-lines.sk" }
}
