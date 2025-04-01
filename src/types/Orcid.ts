import { pipe, Schema } from 'effect'
import * as Orcid from 'orcid-id-ts'
import * as FptsToEffect from '../FptsToEffect.js'

export { toUrl, type Orcid } from 'orcid-id-ts'

export const OrcidSchema = pipe(Schema.String, Schema.filter(Orcid.isOrcid))

export const parse = FptsToEffect.optionK(Orcid.parse)
