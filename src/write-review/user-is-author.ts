import { Equivalence, Option, Predicate } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import { Eq as eqOrcid } from 'orcid-id-ts'
import * as EffectToFpts from '../EffectToFpts.js'
import * as FptsToEffect from '../FptsToEffect.js'
import type { Preprint } from '../preprint.js'
import type { User } from '../user.js'

interface IsAuthor {
  readonly type: 'is-author'
  readonly user: User
}

export const ensureUserIsNotAnAuthor = (preprint: Preprint) =>
  E.fromPredicate(
    Predicate.not((user: User) => RA.elem(EffectToFpts.eq(EquivalenceAuthorByOrcid))(user, preprint.authors)),
    user => ({ type: 'is-author', user }) satisfies IsAuthor,
  )

const EquivalenceAuthorByOrcid = Equivalence.mapInput(
  Option.getEquivalence(FptsToEffect.eq(eqOrcid)),
  Option.liftNullable((author: Preprint['authors'][number]) => author.orcid),
)
