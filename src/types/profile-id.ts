import { Data } from 'effect'
import type { Orcid } from 'orcid-id-ts'
import type { Pseudonym } from './pseudonym.js'

export type ProfileId = OrcidProfileId | PseudonymProfileId

export class OrcidProfileId extends Data.TaggedClass('OrcidProfileId')<{
  orcid: Orcid
}> {}

export class PseudonymProfileId extends Data.TaggedClass('PseudonymProfileId')<{
  pseudonym: Pseudonym
}> {}

export const forOrcid = (orcid: Orcid) => new OrcidProfileId({ orcid })

export const forPseudonym = (pseudonym: Pseudonym) => new PseudonymProfileId({ pseudonym })
