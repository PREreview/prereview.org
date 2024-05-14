import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { P, match } from 'ts-pattern'
import { havingProblemsPage, pageNotFound } from '../../http-error'
import { type GetPreprintEnv, getPreprint } from '../../preprint'
import { LogInResponse, type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response'
import { writeReviewReviewTypeMatch, writeReviewStartMatch } from '../../routes'
import type { IndeterminatePreprintId } from '../../types/preprint-id'
import type { User } from '../../user'
import { type FormStoreEnv, getForm } from '../form'
import { ownPreprintPage } from '../own-preprint-page'
import { ensureUserIsNotAnAuthor } from '../user-is-author'
import { carryOnPage } from './carry-on-page'

export const writeReviewStart = ({
  id,
  user,
}: {
  id: IndeterminatePreprintId
  user?: User
}): RT.ReaderTask<
  GetPreprintEnv & FormStoreEnv,
  PageResponse | StreamlinePageResponse | RedirectResponse | LogInResponse
> =>
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
          RTE.bindW('form', ({ user }) => getForm(user.orcid, preprint.id)),
          RTE.matchW(
            error =>
              match(error)
                .with({ type: 'is-author' }, () => ownPreprintPage(preprint.id, writeReviewStartMatch.formatter))
                .with('no-form', () =>
                  RedirectResponse({ location: format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }) }),
                )
                .with('no-session', () =>
                  LogInResponse({ location: format(writeReviewStartMatch.formatter, { id: preprint.id }) }),
                )
                .with('form-unavailable', P.instanceOf(Error), () => havingProblemsPage)
                .exhaustive(),
            ({ form }) =>
              carryOnPage({ id: preprint.id, language: preprint.title.language, title: preprint.title.text }, form),
          ),
        ),
    ),
  )
