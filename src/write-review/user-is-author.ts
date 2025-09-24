import { Array, Equivalence, Option, Predicate } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import * as FptsToEffect from '../FptsToEffect.ts'
import type { Preprint } from '../Preprints/index.ts'
import { Eq as eqOrcid } from '../types/OrcidId.ts'
import type { User } from '../user.ts'

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
