import { Array, Either, Equivalence, Option, Predicate } from 'effect'
import type { Preprint } from '../../Preprints/index.ts'
import { type OrcidId, OrcidIdEquivalence } from '../../types/OrcidId.ts'
import type { User } from '../../user.ts'

interface IsAuthor {
  readonly type: 'is-author'
  readonly user: User
}

export const ensureUserIsNotAnAuthor = (preprint: Preprint) =>
  Either.liftPredicate(
    Predicate.not((user: User) => Array.containsWith(EquivalenceAuthorByOrcid)(preprint.authors, user)),
    user => ({ type: 'is-author', user }) satisfies IsAuthor,
  )

const EquivalenceAuthorByOrcid = Equivalence.mapInput(
  Option.getEquivalence(OrcidIdEquivalence),
  Option.liftNullable((author: { orcid?: OrcidId }) => author.orcid),
)
