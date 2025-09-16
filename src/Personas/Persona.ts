import { Data, Function } from 'effect'
import type { NonEmptyString, OrcidId, Pseudonym } from '../types/index.js'

export type Persona = PublicPersona | PseudonymPersona

export class PublicPersona extends Data.TaggedClass('PublicPersona')<{
  name: NonEmptyString.NonEmptyString
  orcidId: OrcidId.OrcidId
}> {}

export class PseudonymPersona extends Data.TaggedClass('PseudonymPersona')<{ pseudonym: Pseudonym.Pseudonym }> {}

export const match: {
  <A, B>(options: {
    readonly onPublic: (orcid: PublicPersona) => A
    readonly onPseudonym: (pseudonym: PseudonymPersona) => B
  }): (self: Persona) => A | B
  <A, B>(
    self: Persona,
    options: {
      readonly onPublic: (orcid: PublicPersona) => A
      readonly onPseudonym: (pseudonym: PseudonymPersona) => B
    },
  ): A | B
} = Function.dual(
  2,
  <A, B>(
    self: Persona,
    {
      onPublic,
      onPseudonym,
    }: {
      readonly onPublic: (orcid: PublicPersona) => A
      readonly onPseudonym: (pseudonym: PseudonymPersona) => B
    },
  ): A | B => (self._tag === 'PublicPersona' ? onPublic(self) : onPseudonym(self)),
)
