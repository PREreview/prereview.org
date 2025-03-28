import { pipe, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { match, P } from 'ts-pattern'
import { missingE } from '../../form.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import type { SupportedLocale } from '../../locales/index.js'
import { getPreprintTitle, type GetPreprintTitleEnv, type PreprintTitle } from '../../preprint.js'
import { RedirectResponse, type PageResponse, type StreamlinePageResponse } from '../../response.js'
import { writeReviewMatch } from '../../routes.js'
import type { IndeterminatePreprintId } from '../../types/preprint-id.js'
import type { User } from '../../user.js'
import { getForm, nextFormMatch, saveForm, updateForm, type Form, type FormStoreEnv } from '../form.js'
import { useOfAiForm, type UseOfAiForm } from './use-of-ai-form.js'

export const writeReviewUseOfAi = ({
  id,
  locale,
  user,
}: {
  id: IndeterminatePreprintId
  locale: SupportedLocale
  user?: User
}): RT.ReaderTask<FormStoreEnv & GetPreprintTitleEnv, PageResponse | RedirectResponse | StreamlinePageResponse> =>
  pipe(
    getPreprintTitle(id),
    RTE.matchE(
      error =>
        RT.of(
          match(error)
            .with({ _tag: 'PreprintIsNotFound' }, () => pageNotFound(locale))
            .with({ _tag: 'PreprintIsUnavailable' }, () => havingProblemsPage(locale))
            .exhaustive(),
        ),
      preprint =>
        pipe(
          RTE.Do,
          RTE.let('locale', () => locale),
          RTE.let('preprint', () => preprint),
          RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
          RTE.bindW('form', ({ user }) => getForm(user.orcid, preprint.id)),
          RTE.matchW(
            error =>
              match(error)
                .with('no-form', 'no-session', () =>
                  RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                )
                .with('form-unavailable', () => havingProblemsPage(locale))
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
}): RT.ReaderTask<FormStoreEnv & GetPreprintTitleEnv, PageResponse | RedirectResponse | StreamlinePageResponse> =>
  pipe(
    getPreprintTitle(id),
    RTE.matchE(
      error =>
        RT.of(
          match(error)
            .with({ _tag: 'PreprintIsNotFound' }, () => pageNotFound(locale))
            .with({ _tag: 'PreprintIsUnavailable' }, () => havingProblemsPage(locale))
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
          RTE.matchEW(
            error =>
              RT.of(
                match(error)
                  .with('no-form', 'no-session', () =>
                    RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                  )
                  .with('form-unavailable', () => havingProblemsPage(locale))
                  .exhaustive(),
              ),
            handleUseOfAiForm,
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

const showUseOfAiErrorForm =
  (preprint: PreprintTitle, moreAuthors: Form['moreAuthors'], locale: SupportedLocale) => (form: UseOfAiForm) =>
    useOfAiForm(preprint, form, locale, moreAuthors)

const handleUseOfAiForm = ({
  body,
  form,
  preprint,
  user,
  locale,
}: {
  body: unknown
  form: Form
  preprint: PreprintTitle
  user: User
  locale: SupportedLocale
}) =>
  pipe(
    RTE.Do,
    RTE.let('generativeAiIdeas', () => pipe(GenerativeAiIdeasFieldD.decode(body), E.mapLeft(missingE))),
    RTE.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('generativeAiIdeas', fields.generativeAiIdeas),
        E.mapLeft(() => fields),
      ),
    ),
    RTE.map(updateForm(form)),
    RTE.chainFirstW(saveForm(user.orcid, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage(locale))
          .with({ generativeAiIdeas: P.any }, showUseOfAiErrorForm(preprint, form.moreAuthors, locale))
          .exhaustive(),
      form => RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
    ),
  )

const GenerativeAiIdeasFieldD = pipe(
  D.struct({
    generativeAiIdeas: D.literal('yes', 'no'),
  }),
  D.map(Struct.get('generativeAiIdeas')),
)
