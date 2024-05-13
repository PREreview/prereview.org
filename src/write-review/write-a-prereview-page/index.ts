import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import { P, match } from 'ts-pattern'
import { havingProblemsPage, pageNotFound } from '../../http-error'
import { type GetPreprintEnv, getPreprint } from '../../preprint'
import { type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response'
import { writeReviewMatch, writeReviewStartMatch } from '../../routes'
import type { IndeterminatePreprintId } from '../../types/preprint-id'
import type { User } from '../../user'
import { type FormStoreEnv, getForm } from '../form'
import { ownPreprintPage } from '../own-preprint-page'
import { ensureUserIsNotAnAuthor } from '../user-is-author'
import { startPage } from './write-a-prereview-page'

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
