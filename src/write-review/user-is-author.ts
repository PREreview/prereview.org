import { Array, Equivalence, Option, Predicate } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import * as FptsToEffect from '../FptsToEffect.js'
import type { Preprint } from '../Preprints/index.js'
import { Eq as eqOrcid } from '../types/OrcidId.js'
import type { User } from '../user.js'

interface IsAuthor {
  readonly type: 'is-author'
  readonly user: User
}

export const ensureUserIsNotAnAuthor = (preprint: Preprint) =>
  E.fromPredicate(
    Predicate.not((user: User) => Array.containsWith(EquivalenceAuthorByOrcid)(preprint.authors, user)),
    user => ({ type: 'is-author', user }) satisfies IsAuthor,
  )

const EquivalenceAuthorByOrcid = Equivalence.mapInput(
  Option.getEquivalence(FptsToEffect.eq(eqOrcid)),
  Option.liftNullable((author: Preprint['authors'][number]) => author.orcid),
)
