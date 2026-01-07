import { Match, pipe, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { match, P } from 'ts-pattern'
import { missingE } from '../../../form.ts'
import type { SupportedLocale } from '../../../locales/index.ts'
import { getPreprintTitle, type GetPreprintTitleEnv } from '../../../preprint.ts'
import type { IndeterminatePreprintId, PreprintTitle } from '../../../Preprints/index.ts'
import { RedirectResponse, type PageResponse, type StreamlinePageResponse } from '../../../Response/index.ts'
import { writeReviewMatch } from '../../../routes.ts'
import type { User } from '../../../user.ts'
import { havingProblemsPage, pageNotFound } from '../../http-error.ts'
import { getForm, nextFormMatch, saveForm, updateForm, type Form, type FormStoreEnv } from '../form.ts'
import { useOfAiForm, type UseOfAiForm } from './use-of-ai-form.ts'

export const writeReviewUseOfAi = ({
  askAiReviewEarly = false,
  id,
  locale,
  user,
}: {
  askAiReviewEarly?: boolean
  id: IndeterminatePreprintId
  locale: SupportedLocale
  user?: User
}): RT.ReaderTask<FormStoreEnv & GetPreprintTitleEnv, PageResponse | RedirectResponse | StreamlinePageResponse> =>
  pipe(
    getPreprintTitle(id),
    RTE.matchEW(
      Match.valueTags({
        PreprintIsNotFound: () => RT.of(pageNotFound(locale)),
        PreprintIsUnavailable: () => RT.of(havingProblemsPage(locale)),
      }),
      preprint =>
        pipe(
          RTE.Do,
          RTE.let('locale', () => locale),
          RTE.let('preprint', () => preprint),
          RTE.let('askAiReviewEarly', () => askAiReviewEarly),
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
  askAiReviewEarly = false,
  body,
  id,
  locale,
  user,
}: {
  askAiReviewEarly?: boolean
  body: unknown
  id: IndeterminatePreprintId
  locale: SupportedLocale
  user?: User
}): RT.ReaderTask<FormStoreEnv & GetPreprintTitleEnv, PageResponse | RedirectResponse | StreamlinePageResponse> =>
  pipe(
    getPreprintTitle(id),
    RTE.matchEW(
      Match.valueTags({
        PreprintIsNotFound: () => RT.of(pageNotFound(locale)),
        PreprintIsUnavailable: () => RT.of(havingProblemsPage(locale)),
      }),
      preprint =>
        pipe(
          RTE.Do,
          RTE.let('locale', () => locale),
          RTE.let('preprint', () => preprint),
          RTE.let('body', () => body),
          RTE.let('askAiReviewEarly', () => askAiReviewEarly),
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
  askAiReviewEarly,
  form,
  preprint,
  locale,
}: {
  askAiReviewEarly: boolean
  form: Form
  preprint: PreprintTitle
  locale: SupportedLocale
}) =>
  useOfAiForm(
    preprint,
    { generativeAiIdeas: E.right(form.generativeAiIdeas) },
    locale,
    form.moreAuthors,
    askAiReviewEarly,
  )

const showUseOfAiErrorForm =
  (preprint: PreprintTitle, moreAuthors: Form['moreAuthors'], locale: SupportedLocale, askAiReviewEarly: boolean) =>
  (form: UseOfAiForm) =>
    useOfAiForm(preprint, form, locale, moreAuthors, askAiReviewEarly)

const handleUseOfAiForm = ({
  askAiReviewEarly,
  body,
  form,
  preprint,
  user,
  locale,
}: {
  askAiReviewEarly: boolean
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
          .with(
            { generativeAiIdeas: P.any },
            showUseOfAiErrorForm(preprint, form.moreAuthors, locale, askAiReviewEarly),
          )
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
