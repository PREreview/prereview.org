import { Data, Function } from 'effect'
import type { Orcid } from '../types/Orcid.js'
import type { Pseudonym } from './Pseudonym.js'

export type ProfileId = OrcidProfileId | PseudonymProfileId

export class OrcidProfileId extends Data.TaggedClass('OrcidProfileId')<{
  orcid: Orcid
}> {}

export class PseudonymProfileId extends Data.TaggedClass('PseudonymProfileId')<{
  pseudonym: Pseudonym
}> {}

export const forOrcid = (orcid: Orcid) => new OrcidProfileId({ orcid })

export const forPseudonym = (pseudonym: Pseudonym) => new PseudonymProfileId({ pseudonym })

export const match: {
  <A, B>(options: {
    readonly onOrcid: (orcid: OrcidProfileId) => A
    readonly onPseudonym: (pseudonym: PseudonymProfileId) => B
  }): (self: ProfileId) => A | B
  <A, B>(
    self: ProfileId,
    options: {
      readonly onOrcid: (orcid: OrcidProfileId) => A
      readonly onPseudonym: (pseudonym: PseudonymProfileId) => B
    },
  ): A | B
} = Function.dual(
  2,
  <A, B>(
    self: ProfileId,
    {
      onOrcid,
      onPseudonym,
    }: {
      readonly onOrcid: (orcid: OrcidProfileId) => A
      readonly onPseudonym: (pseudonym: PseudonymProfileId) => B
    },
  ): A | B => (self._tag === 'OrcidProfileId' ? onOrcid(self) : onPseudonym(self)),
)
