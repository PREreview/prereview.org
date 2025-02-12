import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match } from 'ts-pattern'
import { mustDeclareUseOfAi, type MustDeclareUseOfAiEnv } from '../../feature-flags.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import type { SupportedLocale } from '../../locales/index.js'
import { getPreprintTitle, type GetPreprintTitleEnv, type PreprintTitle } from '../../preprint.js'
import { RedirectResponse, type PageResponse, type StreamlinePageResponse } from '../../response.js'
import { writeReviewMatch } from '../../routes.js'
import type { IndeterminatePreprintId } from '../../types/preprint-id.js'
import type { User } from '../../user.js'
import { getForm, type Form, type FormStoreEnv } from '../form.js'
import { useOfAiForm } from './use-of-ai-form.js'

export const writeReviewUseOfAi = ({
  id,
  locale,
  user,
}: {
  id: IndeterminatePreprintId
  locale: SupportedLocale
  user?: User
}): RT.ReaderTask<
  FormStoreEnv & GetPreprintTitleEnv & MustDeclareUseOfAiEnv,
  PageResponse | RedirectResponse | StreamlinePageResponse
> =>
  pipe(
    getPreprintTitle(id),
    RTE.matchE(
      error =>
        RT.of(
          match(error)
            .with({ _tag: 'PreprintIsNotFound' }, () => pageNotFound)
            .with({ _tag: 'PreprintIsUnavailable' }, () => havingProblemsPage)
            .exhaustive(),
        ),
      preprint =>
        pipe(
          RTE.Do,
          RTE.let('locale', () => locale),
          RTE.let('preprint', () => preprint),
          RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
          RTE.apSW(
            'mustDeclareUseOfAi',
            pipe(
              RTE.fromReader(mustDeclareUseOfAi),
              RTE.filterOrElse(
                mustDeclareUseOfAi => mustDeclareUseOfAi,
                () => 'not-found' as const,
              ),
            ),
          ),
          RTE.bindW('form', ({ user }) => getForm(user.orcid, preprint.id)),
          RTE.matchW(
            error =>
              match(error)
                .with('no-form', 'no-session', () =>
                  RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                )
                .with('form-unavailable', () => havingProblemsPage)
                .with('not-found', () => pageNotFound)
                .exhaustive(),
            showUseOfAiForm,
          ),
        ),
    ),
  )

export const writeReviewUseOfAiSubmission = ({
  body,
  id,
  locale,
  user,
}: {
  body: unknown
  id: IndeterminatePreprintId
  locale: SupportedLocale
  user?: User
}): RT.ReaderTask<FormStoreEnv & GetPreprintTitleEnv, PageResponse | RedirectResponse> =>
  pipe(
    getPreprintTitle(id),
    RTE.matchE(
      error =>
        RT.of(
          match(error)
            .with({ _tag: 'PreprintIsNotFound' }, () => pageNotFound)
            .with({ _tag: 'PreprintIsUnavailable' }, () => havingProblemsPage)
            .exhaustive(),
        ),
      preprint =>
        pipe(
          RTE.Do,
          RTE.let('locale', () => locale),
          RTE.let('preprint', () => preprint),
          RTE.let('body', () => body),
          RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
          RTE.bindW('form', ({ user }) => getForm(user.orcid, preprint.id)),
          RTE.matchW(
            error =>
              match(error)
                .with('no-form', 'no-session', () =>
                  RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                )
                .with('form-unavailable', () => havingProblemsPage)
                .exhaustive(),
            () => havingProblemsPage,
          ),
        ),
    ),
  )

const showUseOfAiForm = ({
  form,
  preprint,
  locale,
}: {
  form: Form
  preprint: PreprintTitle
  locale: SupportedLocale
}) => useOfAiForm(preprint, { generativeAiIdeas: E.right(form.generativeAiIdeas) }, locale, form.moreAuthors)
