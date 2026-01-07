import { Match, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import type { Encoder } from 'io-ts/lib/Encoder.js'
import { P, match } from 'ts-pattern'
import { type FieldDecoders, type ValidFields, decodeFields, optionalDecoder, requiredDecoder } from '../../../form.ts'
import { havingProblemsPage, pageNotFound } from '../../../http-error.ts'
import type { SupportedLocale } from '../../../locales/index.ts'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../../preprint.ts'
import type { IndeterminatePreprintId, PreprintTitle } from '../../../Preprints/index.ts'
import { type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../../Response/index.ts'
import { writeReviewMatch, writeReviewReviewTypeMatch } from '../../../routes.ts'
import { NonEmptyStringC } from '../../../types/NonEmptyString.ts'
import type { User } from '../../../user.ts'
import { type Form, type FormStoreEnv, getForm, nextFormMatch, saveForm, updateForm } from '../form.ts'
import { type ResultsSupportedForm, resultsSupportedForm } from './results-supported-form.ts'

export const writeReviewResultsSupported = ({
  body,
  id,
  locale,
  method,
  user,
}: {
  body: unknown
  id: IndeterminatePreprintId
  locale: SupportedLocale
  method: string
  user?: User
}): RT.ReaderTask<GetPreprintTitleEnv & FormStoreEnv, PageResponse | RedirectResponse | StreamlinePageResponse> =>
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
          RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
          RTE.bindW('form', ({ user }) => getForm(user.orcid, preprint.id)),
          RTE.let('method', () => method),
          RTE.let('body', () => body),
          RTE.matchE(
            error =>
              RT.of(
                match(error)
                  .with('no-form', 'no-session', () =>
                    RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                  )
                  .with('form-unavailable', () => havingProblemsPage(locale))
                  .exhaustive(),
              ),
            state =>
              match(state)
                .with(
                  { form: P.union({ alreadyWritten: P.optional('yes') }, { reviewType: P.optional('freeform') }) },
                  () =>
                    RT.of(
                      RedirectResponse({ location: format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }) }),
                    ),
                )
                .with({ method: 'POST' }, handleResultsSupportedForm)
                .otherwise(state => RT.of(showResultsSupportedForm(state))),
          ),
        ),
    ),
  )

const showResultsSupportedForm = ({
  form,
  locale,
  preprint,
}: {
  form: Form
  locale: SupportedLocale
  preprint: PreprintTitle
}) => resultsSupportedForm(preprint, FormToFieldsE.encode(form), locale)

const handleResultsSupportedForm = ({
  body,
  form,
  locale,
  preprint,
  user,
}: {
  body: unknown
  form: Form
  locale: SupportedLocale
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    RTE.fromEither(decodeFields(resultsSupportedFields)(body)),
    RTE.map(updateFormWithFields(form)),
    RTE.chainFirstW(saveForm(user.orcid, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage(locale))
          .with({ resultsSupported: P.any }, form => resultsSupportedForm(preprint, form, locale))
          .exhaustive(),
      form => RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
    ),
  )

const resultsSupportedFields = {
  resultsSupported: requiredDecoder(
    D.literal('not-supported', 'partially-supported', 'neutral', 'well-supported', 'strongly-supported', 'skip'),
  ),
  resultsSupportedNotSupportedDetails: optionalDecoder(NonEmptyStringC),
  resultsSupportedPartiallySupportedDetails: optionalDecoder(NonEmptyStringC),
  resultsSupportedNeutralDetails: optionalDecoder(NonEmptyStringC),
  resultsSupportedWellSupportedDetails: optionalDecoder(NonEmptyStringC),
  resultsSupportedStronglySupportedDetails: optionalDecoder(NonEmptyStringC),
} satisfies FieldDecoders

const updateFormWithFields = (form: Form) => flow(FieldsToFormE.encode, updateForm(form))

const FieldsToFormE: Encoder<Form, ValidFields<typeof resultsSupportedFields>> = {
  encode: fields => ({
    resultsSupported: fields.resultsSupported,
    resultsSupportedDetails: {
      'not-supported': fields.resultsSupportedNotSupportedDetails,
      'partially-supported': fields.resultsSupportedPartiallySupportedDetails,
      neutral: fields.resultsSupportedNeutralDetails,
      'well-supported': fields.resultsSupportedWellSupportedDetails,
      'strongly-supported': fields.resultsSupportedStronglySupportedDetails,
    },
  }),
}

const FormToFieldsE: Encoder<ResultsSupportedForm, Form> = {
  encode: form => ({
    resultsSupported: E.right(form.resultsSupported),
    resultsSupportedNotSupportedDetails: E.right(form.resultsSupportedDetails?.['not-supported']),
    resultsSupportedPartiallySupportedDetails: E.right(form.resultsSupportedDetails?.['partially-supported']),
    resultsSupportedNeutralDetails: E.right(form.resultsSupportedDetails?.neutral),
    resultsSupportedWellSupportedDetails: E.right(form.resultsSupportedDetails?.['well-supported']),
    resultsSupportedStronglySupportedDetails: E.right(form.resultsSupportedDetails?.['strongly-supported']),
  }),
}
