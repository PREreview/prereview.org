import type { Orcid } from 'orcid-id-ts'
import type { User } from '../user'
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

export const OrcidProfileId = (value: Orcid): OrcidProfileId => ({
  type: 'orcid',
  value,
})

export const PseudonymProfileId = (value: Pseudonym): PseudonymProfileId => ({
  type: 'pseudonym',
  value,
})

export const OrcidProfileIdForUser = (user: User): OrcidProfileId => OrcidProfileId(user.orcid)

export const PseudonymProfileIdForUser = (user: User): PseudonymProfileId => PseudonymProfileId(user.pseudonym)
