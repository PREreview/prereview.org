import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { P, match } from 'ts-pattern'
import { type MustDeclareUseOfAiEnv, mustDeclareUseOfAi } from '../../feature-flags.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import { DefaultLocale } from '../../locales/index.js'
import { type GetPreprintEnv, getPreprint } from '../../preprint.js'
import { LogInResponse, type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response.js'
import { writeReviewReviewTypeMatch, writeReviewStartMatch } from '../../routes.js'
import type { IndeterminatePreprintId } from '../../types/preprint-id.js'
import type { User } from '../../user.js'
import { type FormStoreEnv, getForm } from '../form.js'
import { ownPreprintPage } from '../own-preprint-page.js'
import { ensureUserIsNotAnAuthor } from '../user-is-author.js'
import { carryOnPage } from './carry-on-page.js'

export const writeReviewStart = ({
  id,
  user,
}: {
  id: IndeterminatePreprintId
  user?: User
}): RT.ReaderTask<
  GetPreprintEnv & FormStoreEnv & MustDeclareUseOfAiEnv,
  PageResponse | StreamlinePageResponse | RedirectResponse | LogInResponse
> =>
  pipe(
    getPreprint(id),
    RTE.matchE(
      error =>
        RT.of(
          match(error)
            .with({ _tag: 'PreprintIsNotFound' }, () => pageNotFound(DefaultLocale))
            .with({ _tag: 'PreprintIsUnavailable' }, () => havingProblemsPage(DefaultLocale))
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
          RTE.apS('locale', RTE.of(DefaultLocale)),
          RTE.apSW('mustDeclareUseOfAi', RTE.fromReader(mustDeclareUseOfAi)),
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
                .with('form-unavailable', P.instanceOf(Error), () => havingProblemsPage(DefaultLocale))
                .exhaustive(),
            ({ form, locale, mustDeclareUseOfAi }) =>
              carryOnPage(
                { id: preprint.id, language: preprint.title.language, title: preprint.title.text },
                form,
                locale,
                mustDeclareUseOfAi,
              ),
          ),
        ),
    ),
  )
