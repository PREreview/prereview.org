import * as E from 'fp-ts/lib/Either.js'
import * as Eq from 'fp-ts/lib/Eq.js'
import * as O from 'fp-ts/lib/Option.js'
import { not } from 'fp-ts/lib/Predicate.js'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import { Eq as eqOrcid } from 'orcid-id-ts'
import type { Preprint } from '../preprint.js'
import type { User } from '../user.js'

interface IsAuthor {
  readonly type: 'is-author'
  readonly user: User
}

export const ensureUserIsNotAnAuthor = (preprint: Preprint) =>
  E.fromPredicate(
    not((user: User) => RA.elem(eqAuthorByOrcid)(user, preprint.authors)),
    user => ({ type: 'is-author', user }) satisfies IsAuthor,
  )

const eqAuthorByOrcid = Eq.contramap(O.fromNullableK((author: Preprint['authors'][number]) => author.orcid))(
  O.getEq(eqOrcid),
)
