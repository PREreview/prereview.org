import { Array, Data, Either, Equivalence, Option, Predicate } from 'effect'
import type { Preprint } from '../../Preprints/index.ts'
import { type OrcidId, OrcidIdEquivalence } from '../../types/OrcidId.ts'
import type { User } from '../../user.ts'

export class IsAuthor extends Data.TaggedError('IsAuthor')<{
  user: User
}> {}

export const ensureUserIsNotAnAuthor = (preprint: Preprint) =>
  Either.liftPredicate(
    Predicate.not((user: User) => Array.containsWith(EquivalenceAuthorByOrcid)(preprint.authors, user)),
    user => new IsAuthor({ user }),
  )

const EquivalenceAuthorByOrcid = Equivalence.mapInput(
  Option.getEquivalence(OrcidIdEquivalence),
  Option.liftNullable((author: { orcid?: OrcidId }) => author.orcid),
)
