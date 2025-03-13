import { pipe, Schema } from 'effect'
import * as Orcid from 'orcid-id-ts'

export type { Orcid } from 'orcid-id-ts'

export const OrcidSchema = pipe(Schema.String, Schema.filter(Orcid.isOrcid))
