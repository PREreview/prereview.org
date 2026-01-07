import { Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { P, match } from 'ts-pattern'
import type { SupportedLocale } from '../../../locales/index.ts'
import { type GetPreprintEnv, getPreprint } from '../../../preprint.ts'
import type { IndeterminatePreprintId } from '../../../Preprints/index.ts'
import { LogInResponse, type PageResponse, RedirectResponse } from '../../../Response/index.ts'
import { writeReviewReviewTypeMatch, writeReviewStartMatch } from '../../../routes.ts'
import type { User } from '../../../user.ts'
import { havingProblemsPage, pageNotFound } from '../../http-error.ts'
import { type FormStoreEnv, getForm } from '../form.ts'
import { ownPreprintPage } from '../own-preprint-page.ts'
import { ensureUserIsNotAnAuthor } from '../user-is-author.ts'
import { carryOnPage } from './carry-on-page.ts'

export const writeReviewStart = ({
  askAiReviewEarly = false,
  id,
  locale,
  user,
}: {
  askAiReviewEarly?: boolean
  id: IndeterminatePreprintId
  locale: SupportedLocale
  user?: User
}): RT.ReaderTask<GetPreprintEnv & FormStoreEnv, PageResponse | RedirectResponse | LogInResponse> =>
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
          RTE.bindW('form', ({ user }) => getForm(user.orcid, preprint.id)),
          RTE.apS('locale', RTE.of(locale)),
          RTE.matchW(
            error =>
              match(error)
                .with({ type: 'is-author' }, () =>
                  ownPreprintPage(preprint.id, writeReviewStartMatch.formatter, locale),
                )
                .with('no-form', () =>
                  RedirectResponse({ location: format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }) }),
                )
                .with('no-session', () =>
                  LogInResponse({ location: format(writeReviewStartMatch.formatter, { id: preprint.id }) }),
                )
                .with('form-unavailable', P.instanceOf(Error), () => havingProblemsPage(locale))
                .exhaustive(),
            ({ form, locale }) =>
              carryOnPage(
                { id: preprint.id, language: preprint.title.language, title: preprint.title.text },
                form,
                locale,
                askAiReviewEarly,
              ),
          ),
        ),
    ),
  )
