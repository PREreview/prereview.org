import { Match, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import type { Encoder } from 'io-ts/lib/Encoder.js'
import { P, match } from 'ts-pattern'
import { type FieldDecoders, type ValidFields, decodeFields, optionalDecoder, requiredDecoder } from '../../form.ts'
import { havingProblemsPage, pageNotFound } from '../../http-error.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../preprint.ts'
import type { IndeterminatePreprintId, PreprintTitle } from '../../Preprints/index.ts'
import { type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response.ts'
import { writeReviewMatch, writeReviewReviewTypeMatch } from '../../routes.ts'
import { NonEmptyStringC } from '../../types/NonEmptyString.ts'
import type { User } from '../../user.ts'
import { type Form, type FormStoreEnv, getForm, nextFormMatch, saveForm, updateForm } from '../form.ts'
import { type MethodsAppropriateForm, methodsAppropriateForm } from './methods-appropriate-form.ts'

export const writeReviewMethodsAppropriate = ({
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
                .with({ method: 'POST' }, handleMethodsAppropriateForm)
                .otherwise(state => RT.of(showMethodsAppropriateForm(state))),
          ),
        ),
    ),
  )

const showMethodsAppropriateForm = ({
  form,
  locale,
  preprint,
}: {
  form: Form
  locale: SupportedLocale
  preprint: PreprintTitle
}) => methodsAppropriateForm(preprint, FormToFieldsE.encode(form), locale)

const handleMethodsAppropriateForm = ({
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
    RTE.fromEither(decodeFields(methodsAppropriateFields)(body)),
    RTE.map(updateFormWithFields(form)),
    RTE.chainFirstW(saveForm(user.orcid, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage(locale))
          .with({ methodsAppropriate: P.any }, form => methodsAppropriateForm(preprint, form, locale))
          .exhaustive(),
      form => RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
    ),
  )

const methodsAppropriateFields = {
  methodsAppropriate: requiredDecoder(
    D.literal(
      'inappropriate',
      'somewhat-inappropriate',
      'adequate',
      'mostly-appropriate',
      'highly-appropriate',
      'skip',
    ),
  ),
  methodsAppropriateInappropriateDetails: optionalDecoder(NonEmptyStringC),
  methodsAppropriateSomewhatInappropriateDetails: optionalDecoder(NonEmptyStringC),
  methodsAppropriateAdequateDetails: optionalDecoder(NonEmptyStringC),
  methodsAppropriateMostlyAppropriateDetails: optionalDecoder(NonEmptyStringC),
  methodsAppropriateHighlyAppropriateDetails: optionalDecoder(NonEmptyStringC),
} satisfies FieldDecoders

const updateFormWithFields = (form: Form) => flow(FieldsToFormE.encode, updateForm(form))

const FieldsToFormE: Encoder<Form, ValidFields<typeof methodsAppropriateFields>> = {
  encode: fields => ({
    methodsAppropriate: fields.methodsAppropriate,
    methodsAppropriateDetails: {
      inappropriate: fields.methodsAppropriateInappropriateDetails,
      'somewhat-inappropriate': fields.methodsAppropriateSomewhatInappropriateDetails,
      adequate: fields.methodsAppropriateAdequateDetails,
      'mostly-appropriate': fields.methodsAppropriateMostlyAppropriateDetails,
      'highly-appropriate': fields.methodsAppropriateHighlyAppropriateDetails,
    },
  }),
}

const FormToFieldsE: Encoder<MethodsAppropriateForm, Form> = {
  encode: form => ({
    methodsAppropriate: E.right(form.methodsAppropriate),
    methodsAppropriateInappropriateDetails: E.right(form.methodsAppropriateDetails?.inappropriate),
    methodsAppropriateSomewhatInappropriateDetails: E.right(form.methodsAppropriateDetails?.['somewhat-inappropriate']),
    methodsAppropriateAdequateDetails: E.right(form.methodsAppropriateDetails?.adequate),
    methodsAppropriateMostlyAppropriateDetails: E.right(form.methodsAppropriateDetails?.['mostly-appropriate']),
    methodsAppropriateHighlyAppropriateDetails: E.right(form.methodsAppropriateDetails?.['highly-appropriate']),
  }),
}
