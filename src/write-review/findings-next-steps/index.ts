import { Match, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import type { Encoder } from 'io-ts/lib/Encoder.js'
import { P, match } from 'ts-pattern'
import { type FieldDecoders, type ValidFields, decodeFields, optionalDecoder, requiredDecoder } from '../../form.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import type { SupportedLocale } from '../../locales/index.js'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../preprint.js'
import type { IndeterminatePreprintId, PreprintTitle } from '../../Preprints/index.js'
import { type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response.js'
import { writeReviewMatch, writeReviewReviewTypeMatch } from '../../routes.js'
import { NonEmptyStringC } from '../../types/NonEmptyString.js'
import type { User } from '../../user.js'
import { type Form, type FormStoreEnv, getForm, nextFormMatch, saveForm, updateForm } from '../form.js'
import { type FindingsNextStepsForm, findingsNextStepsForm } from './findings-next-steps-form.js'

export const writeReviewFindingsNextSteps = ({
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
                .with({ method: 'POST' }, handleFindingsNextStepsForm)
                .otherwise(state => RT.of(showFindingsNextStepsForm(state))),
          ),
        ),
    ),
  )

const showFindingsNextStepsForm = ({
  form,
  locale,
  preprint,
}: {
  form: Form
  locale: SupportedLocale
  preprint: PreprintTitle
}) => findingsNextStepsForm(preprint, FormToFieldsE.encode(form), locale)

const handleFindingsNextStepsForm = ({
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
    RTE.fromEither(decodeFields(findingsNextStepsFields)(body)),
    RTE.map(updateFormWithFields(form)),
    RTE.chainFirstW(saveForm(user.orcid, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage(locale))
          .with({ findingsNextSteps: P.any }, form => findingsNextStepsForm(preprint, form, locale))
          .exhaustive(),
      form => RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
    ),
  )

const findingsNextStepsFields = {
  findingsNextSteps: requiredDecoder(
    D.literal('inadequately', 'insufficiently', 'adequately', 'clearly-insightfully', 'exceptionally', 'skip'),
  ),
  findingsNextStepsInadequatelyDetails: optionalDecoder(NonEmptyStringC),
  findingsNextStepsInsufficientlyDetails: optionalDecoder(NonEmptyStringC),
  findingsNextStepsAdequatelyDetails: optionalDecoder(NonEmptyStringC),
  findingsNextStepsClearlyInsightfullyDetails: optionalDecoder(NonEmptyStringC),
  findingsNextStepsExceptionallyDetails: optionalDecoder(NonEmptyStringC),
} satisfies FieldDecoders

const updateFormWithFields = (form: Form) => flow(FieldsToFormE.encode, updateForm(form))

const FieldsToFormE: Encoder<Form, ValidFields<typeof findingsNextStepsFields>> = {
  encode: fields => ({
    findingsNextSteps: fields.findingsNextSteps,
    findingsNextStepsDetails: {
      inadequately: fields.findingsNextStepsInadequatelyDetails,
      insufficiently: fields.findingsNextStepsInsufficientlyDetails,
      adequately: fields.findingsNextStepsAdequatelyDetails,
      'clearly-insightfully': fields.findingsNextStepsClearlyInsightfullyDetails,
      exceptionally: fields.findingsNextStepsExceptionallyDetails,
    },
  }),
}

const FormToFieldsE: Encoder<FindingsNextStepsForm, Form> = {
  encode: form => ({
    findingsNextSteps: E.right(form.findingsNextSteps),
    findingsNextStepsInadequatelyDetails: E.right(form.findingsNextStepsDetails?.inadequately),
    findingsNextStepsInsufficientlyDetails: E.right(form.findingsNextStepsDetails?.insufficiently),
    findingsNextStepsAdequatelyDetails: E.right(form.findingsNextStepsDetails?.adequately),
    findingsNextStepsClearlyInsightfullyDetails: E.right(form.findingsNextStepsDetails?.['clearly-insightfully']),
    findingsNextStepsExceptionallyDetails: E.right(form.findingsNextStepsDetails?.exceptionally),
  }),
}
