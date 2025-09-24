import { Data, Function } from 'effect'
import type { OrcidId } from './OrcidId.ts'
import type { Pseudonym } from './Pseudonym.ts'

export type ProfileId = OrcidProfileId | PseudonymProfileId

export class OrcidProfileId extends Data.TaggedClass('OrcidProfileId')<{
  orcid: OrcidId
}> {}

export class PseudonymProfileId extends Data.TaggedClass('PseudonymProfileId')<{
  pseudonym: Pseudonym
}> {}

export const forOrcid = (orcid: OrcidId) => new OrcidProfileId({ orcid })

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
