import { Match, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import type { Encoder } from 'io-ts/lib/Encoder.js'
import { P, match } from 'ts-pattern'
import { type FieldDecoders, type ValidFields, decodeFields, optionalDecoder, requiredDecoder } from '../../../form.ts'
import type { SupportedLocale } from '../../../locales/index.ts'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../../preprint.ts'
import type { IndeterminatePreprintId, PreprintTitle } from '../../../Preprints/index.ts'
import { type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../../Response/index.ts'
import { writeReviewMatch, writeReviewReviewTypeMatch } from '../../../routes.ts'
import { NonEmptyStringC } from '../../../types/NonEmptyString.ts'
import type { User } from '../../../user.ts'
import { havingProblemsPage, pageNotFound } from '../../http-error.ts'
import { type Form, type FormStoreEnv, getForm, nextFormMatch, saveForm, updateForm } from '../form.ts'
import { type ReadyFullReviewForm, readyFullReviewForm } from './ready-full-review-form.ts'

export const writeReviewReadyFullReview = ({
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
                .with({ method: 'POST' }, handleReadyFullReviewForm)
                .otherwise(state => RT.of(showReadyFullReviewForm(state))),
          ),
        ),
    ),
  )

const showReadyFullReviewForm = ({
  form,
  locale,
  preprint,
}: {
  form: Form
  locale: SupportedLocale
  preprint: PreprintTitle
}) => readyFullReviewForm(preprint, FormToFieldsE.encode(form), locale)

const handleReadyFullReviewForm = ({
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
    RTE.fromEither(decodeFields(readyFullReviewFields)(body)),
    RTE.map(updateFormWithFields(form)),
    RTE.chainFirstW(saveForm(user.orcid, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage(locale))
          .with({ readyFullReview: P.any }, form => readyFullReviewForm(preprint, form, locale))
          .exhaustive(),
      form => RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
    ),
  )

const readyFullReviewFields = {
  readyFullReview: requiredDecoder(D.literal('no', 'yes-changes', 'yes')),
  readyFullReviewNoDetails: optionalDecoder(NonEmptyStringC),
  readyFullReviewYesChangesDetails: optionalDecoder(NonEmptyStringC),
  readyFullReviewYesDetails: optionalDecoder(NonEmptyStringC),
} satisfies FieldDecoders

const updateFormWithFields = (form: Form) => flow(FieldsToFormE.encode, updateForm(form))

const FieldsToFormE: Encoder<Form, ValidFields<typeof readyFullReviewFields>> = {
  encode: fields => ({
    readyFullReview: fields.readyFullReview,
    readyFullReviewDetails: {
      no: fields.readyFullReviewNoDetails,
      'yes-changes': fields.readyFullReviewYesChangesDetails,
      yes: fields.readyFullReviewYesDetails,
    },
  }),
}

const FormToFieldsE: Encoder<ReadyFullReviewForm, Form> = {
  encode: form => ({
    readyFullReview: E.right(form.readyFullReview),
    readyFullReviewNoDetails: E.right(form.readyFullReviewDetails?.no),
    readyFullReviewYesChangesDetails: E.right(form.readyFullReviewDetails?.['yes-changes']),
    readyFullReviewYesDetails: E.right(form.readyFullReviewDetails?.yes),
  }),
}
