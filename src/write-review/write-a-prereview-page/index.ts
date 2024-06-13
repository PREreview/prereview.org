import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { flow, pipe } from 'fp-ts/lib/function.js'
import { P, match } from 'ts-pattern'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import { type GetPreprintEnv, getPreprint } from '../../preprint.js'
import { type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response.js'
import { writeReviewMatch, writeReviewStartMatch } from '../../routes.js'
import type { IndeterminatePreprintId } from '../../types/preprint-id.js'
import type { User } from '../../user.js'
import { type FormStoreEnv, getForm } from '../form.js'
import { ownPreprintPage } from '../own-preprint-page.js'
import { ensureUserIsNotAnAuthor } from '../user-is-author.js'
import { startPage } from './write-a-prereview-page.js'

export const writeReview = ({
  id,
  user,
}: {
  id: IndeterminatePreprintId
  user?: User
}): RT.ReaderTask<GetPreprintEnv & FormStoreEnv, PageResponse | StreamlinePageResponse | RedirectResponse> =>
  pipe(
    getPreprint(id),
    RTE.matchE(
      error =>
        RT.of(
          match(error)
            .with('not-found', () => pageNotFound)
            .with('unavailable', () => havingProblemsPage)
            .exhaustive(),
        ),
      preprint =>
        pipe(
          RTE.Do,
          RTE.apS(
            'user',
            pipe(RTE.fromNullable('no-session' as const)(user), RTE.chainEitherKW(ensureUserIsNotAnAuthor(preprint))),
          ),
          RTE.bindW(
            'form',
            flow(
              ({ user }) => getForm(user.orcid, preprint.id),
              RTE.map(E.right),
              RTE.orElseW(error =>
                match(error).with('no-form', flow(E.left, RTE.right)).with('form-unavailable', RTE.left).exhaustive(),
              ),
            ),
          ),
          RTE.matchW(
            error =>
              match(error)
                .with({ type: 'is-author' }, () => ownPreprintPage(preprint.id, writeReviewMatch.formatter))
                .with('no-session', () => startPage(preprint))
                .with('form-unavailable', P.instanceOf(Error), () => havingProblemsPage)
                .exhaustive(),
            state =>
              match(state)
                .with({ form: P.when(E.isRight) }, () =>
                  RedirectResponse({ location: format(writeReviewStartMatch.formatter, { id: preprint.id }) }),
                )
                .with({ form: P.when(E.isLeft) }, ({ user }) => startPage(preprint, user))
                .exhaustive(),
          ),
        ),
    ),
  )
