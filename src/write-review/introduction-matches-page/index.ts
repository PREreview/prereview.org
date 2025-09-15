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
import { type IntroductionMatchesForm, introductionMatchesForm } from './introduction-matches-form.js'

export const writeReviewIntroductionMatches = ({
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
                .with({ method: 'POST' }, handleIntroductionMatchesForm)
                .otherwise(state => RT.of(showIntroductionMatchesForm(state))),
          ),
        ),
    ),
  )

const showIntroductionMatchesForm = ({
  form,
  locale,
  preprint,
}: {
  form: Form
  locale: SupportedLocale
  preprint: PreprintTitle
}) => introductionMatchesForm(preprint, FormToFieldsE.encode(form), locale)

const handleIntroductionMatchesForm = ({
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
    RTE.fromEither(decodeFields(introductionMatchesFields)(body)),
    RTE.map(updateFormWithFields(form)),
    RTE.chainFirstW(saveForm(user.orcid, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage(locale))
          .with({ introductionMatches: P.any }, form => introductionMatchesForm(preprint, form, locale))
          .exhaustive(),
      form => RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
    ),
  )

const introductionMatchesFields = {
  introductionMatches: requiredDecoder(D.literal('yes', 'partly', 'no', 'skip')),
  introductionMatchesYesDetails: optionalDecoder(NonEmptyStringC),
  introductionMatchesPartlyDetails: optionalDecoder(NonEmptyStringC),
  introductionMatchesNoDetails: optionalDecoder(NonEmptyStringC),
} satisfies FieldDecoders

const updateFormWithFields = (form: Form) => flow(FieldsToFormE.encode, updateForm(form))

const FieldsToFormE: Encoder<Form, ValidFields<typeof introductionMatchesFields>> = {
  encode: fields => ({
    introductionMatches: fields.introductionMatches,
    introductionMatchesDetails: {
      yes: fields.introductionMatchesYesDetails,
      partly: fields.introductionMatchesPartlyDetails,
      no: fields.introductionMatchesNoDetails,
    },
  }),
}

const FormToFieldsE: Encoder<IntroductionMatchesForm, Form> = {
  encode: form => ({
    introductionMatches: E.right(form.introductionMatches),
    introductionMatchesYesDetails: E.right(form.introductionMatchesDetails?.yes),
    introductionMatchesPartlyDetails: E.right(form.introductionMatchesDetails?.partly),
    introductionMatchesNoDetails: E.right(form.introductionMatchesDetails?.no),
  }),
}
