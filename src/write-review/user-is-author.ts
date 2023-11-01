import * as E from 'fp-ts/Either'
import * as Eq from 'fp-ts/Eq'
import * as O from 'fp-ts/Option'
import { not } from 'fp-ts/Predicate'
import * as RA from 'fp-ts/ReadonlyArray'
import { Eq as eqOrcid } from 'orcid-id-ts'
import type { Preprint } from '../preprint'
import type { User } from '../user'

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
