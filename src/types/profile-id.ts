import type { Orcid } from 'orcid-id-ts'
import type { Pseudonym } from './pseudonym'

export type ProfileId = OrcidProfileId | PseudonymProfileId

export interface OrcidProfileId {
  readonly type: 'orcid'
  readonly value: Orcid
}

export interface PseudonymProfileId {
  readonly type: 'pseudonym'
  readonly value: Pseudonym
}
