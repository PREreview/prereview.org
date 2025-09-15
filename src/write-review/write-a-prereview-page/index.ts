import { Match, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { P, match } from 'ts-pattern'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import type { SupportedLocale } from '../../locales/index.js'
import { type GetPreprintEnv, getPreprint } from '../../preprint.js'
import type { IndeterminatePreprintId } from '../../Preprints/index.js'
import { type PageResponse, RedirectResponse } from '../../response.js'
import { writeReviewMatch, writeReviewStartMatch } from '../../routes.js'
import type { User } from '../../user.js'
import { type FormStoreEnv, getForm } from '../form.js'
import { ownPreprintPage } from '../own-preprint-page.js'
import { ensureUserIsNotAnAuthor } from '../user-is-author.js'
import { startPage } from './write-a-prereview-page.js'

export const writeReview = ({
  id,
  locale,
  user,
}: {
  id: IndeterminatePreprintId
  locale: SupportedLocale
  user?: User
}): RT.ReaderTask<GetPreprintEnv & FormStoreEnv, PageResponse | RedirectResponse> =>
  pipe(
    getPreprint(id),
    RTE.matchEW(
      Match.valueTags({
        PreprintIsNotFound: () => RT.of(pageNotFound(locale)),
        PreprintIsUnavailable: () => RT.of(havingProblemsPage(locale)),
      }),
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
                .with({ type: 'is-author' }, () => ownPreprintPage(preprint.id, writeReviewMatch.formatter, locale))
                .with('no-session', () => startPage(preprint, locale))
                .with('form-unavailable', P.instanceOf(Error), () => havingProblemsPage(locale))
                .exhaustive(),
            state =>
              match(state)
                .with({ form: P.when(E.isRight) }, () =>
                  RedirectResponse({ location: format(writeReviewStartMatch.formatter, { id: preprint.id }) }),
                )
                .with({ form: P.when(E.isLeft) }, ({ user }) => startPage(preprint, locale, user))
                .exhaustive(),
          ),
        ),
    ),
  )
