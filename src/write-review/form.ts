import { isDoi } from 'doi-ts'
import { flow, identity, pipe } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import type { ReaderTaskEither } from 'fp-ts/lib/ReaderTaskEither.js'
import { getAssignSemigroup } from 'fp-ts/lib/struct.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as C from 'io-ts/lib/Codec.js'
import type Keyv from 'keyv'
import { P, match } from 'ts-pattern'
import { RawHtmlC } from '../html.js'
import type { PreprintId } from '../Preprints/index.js'
import {
  writeReviewAuthorsMatch,
  writeReviewCompetingInterestsMatch,
  writeReviewConductMatch,
  writeReviewDataPresentationMatch,
  writeReviewFindingsNextStepsMatch,
  writeReviewIntroductionMatchesMatch,
  writeReviewLanguageEditingMatch,
  writeReviewMethodsAppropriateMatch,
  writeReviewNovelMatch,
  writeReviewPersonaMatch,
  writeReviewPublishMatch,
  writeReviewReadyFullReviewMatch,
  writeReviewResultsSupportedMatch,
  writeReviewReviewMatch,
  writeReviewReviewTypeMatch,
  writeReviewShouldReadMatch,
  writeReviewUseOfAiMatch,
} from '../routes.js'
import { EmailAddressC } from '../types/EmailAddress.js'
import { NonEmptyStringC } from '../types/NonEmptyString.js'
import type { OrcidId } from '../types/OrcidId.js'

export type Form = C.TypeOf<typeof FormC>

export interface FormStoreEnv {
  formStore: Keyv
}

export function formKey(user: OrcidId, preprint: PreprintId) {
  return match(preprint)
    .with({ _tag: 'PhilsciPreprintId' }, preprint => `${user}_philsci_${preprint.value}`)
    .with({ value: P.when(isDoi) }, preprint => `${user}_${preprint.value}`)
    .exhaustive()
}

export function getForm(
  user: OrcidId,
  preprint: PreprintId,
): ReaderTaskEither<FormStoreEnv, 'no-form' | 'form-unavailable', Form> {
  return flow(
    TE.tryCatchK(
      async ({ formStore }): Promise<unknown> => await formStore.get(formKey(user, preprint)),
      () => 'form-unavailable' as const,
    ),
    TE.chainEitherKW(
      flow(
        FormC.decode,
        E.mapLeft(() => 'no-form' as const),
      ),
    ),
  )
}

export function createForm(): Form {
  return {}
}

export function updateForm(originalForm: Form): (newForm: Form) => Form {
  return newForm => getAssignSemigroup<Form>().concat(originalForm, newForm)
}

export function saveForm(
  user: OrcidId,
  preprint: PreprintId,
): (form: Form) => ReaderTaskEither<FormStoreEnv, 'form-unavailable', void> {
  return form =>
    TE.tryCatchK(
      async ({ formStore }) => {
        await formStore.set(formKey(user, preprint), FormC.encode(form))
      },
      () => 'form-unavailable',
    )
}

export function deleteForm(
  user: OrcidId,
  preprint: PreprintId,
): ReaderTaskEither<FormStoreEnv, 'form-unavailable', void> {
  return TE.tryCatchK(
    async ({ formStore }) => {
      await formStore.delete(formKey(user, preprint))
    },
    () => 'form-unavailable',
  )
}

export const nextFormMatch = (form: Form, askAiReviewEarly = false) =>
  match({ ...form, askAiReviewEarly })
    .with(
      { alreadyWritten: P.optional(undefined), reviewType: P.optional(undefined) },
      () => writeReviewReviewTypeMatch,
    )
    .with(
      { alreadyWritten: 'yes', generativeAiIdeas: P.optional(undefined), askAiReviewEarly: true },
      () => writeReviewUseOfAiMatch,
    )
    .with(
      { reviewType: 'questions', introductionMatches: P.optional(undefined) },
      () => writeReviewIntroductionMatchesMatch,
    )
    .with(
      { reviewType: 'questions', methodsAppropriate: P.optional(undefined) },
      () => writeReviewMethodsAppropriateMatch,
    )
    .with({ reviewType: 'questions', resultsSupported: P.optional(undefined) }, () => writeReviewResultsSupportedMatch)
    .with({ reviewType: 'questions', dataPresentation: P.optional(undefined) }, () => writeReviewDataPresentationMatch)
    .with(
      { reviewType: 'questions', findingsNextSteps: P.optional(undefined) },
      () => writeReviewFindingsNextStepsMatch,
    )
    .with({ reviewType: 'questions', novel: P.optional(undefined) }, () => writeReviewNovelMatch)
    .with({ reviewType: 'questions', languageEditing: P.optional(undefined) }, () => writeReviewLanguageEditingMatch)
    .with({ reviewType: 'questions', shouldRead: P.optional(undefined) }, () => writeReviewShouldReadMatch)
    .with({ reviewType: 'questions', readyFullReview: P.optional(undefined) }, () => writeReviewReadyFullReviewMatch)
    .with({ reviewType: P.optional('freeform'), review: P.optional(undefined) }, () => writeReviewReviewMatch)
    .with({ persona: P.optional(undefined) }, () => writeReviewPersonaMatch)
    .with({ moreAuthors: P.optional(undefined) }, () => writeReviewAuthorsMatch)
    .with({ moreAuthors: 'yes', otherAuthors: P.optional(undefined) }, () => writeReviewAuthorsMatch)
    .with({ generativeAiIdeas: P.optional(undefined) }, () => writeReviewUseOfAiMatch)
    .with({ competingInterests: P.optional(undefined) }, () => writeReviewCompetingInterestsMatch)
    .with({ conduct: P.optional(undefined) }, () => writeReviewConductMatch)
    .otherwise(() => writeReviewPublishMatch)

export const FormC = pipe(
  C.partial({
    alreadyWritten: C.literal('yes', 'no'),
    introductionMatches: C.literal('yes', 'partly', 'no', 'skip'),
    introductionMatchesDetails: C.partial({ yes: NonEmptyStringC, partly: NonEmptyStringC, no: NonEmptyStringC }),
    review: RawHtmlC,
    reviewType: C.literal('questions', 'freeform'),
    persona: C.literal('public', 'pseudonym'),
    methodsAppropriate: C.literal(
      'inappropriate',
      'somewhat-inappropriate',
      'adequate',
      'mostly-appropriate',
      'highly-appropriate',
      'skip',
    ),
    methodsAppropriateDetails: C.partial({
      inappropriate: NonEmptyStringC,
      'somewhat-inappropriate': NonEmptyStringC,
      adequate: NonEmptyStringC,
      'mostly-appropriate': NonEmptyStringC,
      'highly-appropriate': NonEmptyStringC,
    }),
    resultsSupported: C.literal(
      'not-supported',
      'partially-supported',
      'neutral',
      'well-supported',
      'strongly-supported',
      'skip',
    ),
    resultsSupportedDetails: C.partial({
      'not-supported': NonEmptyStringC,
      'partially-supported': NonEmptyStringC,
      neutral: NonEmptyStringC,
      'well-supported': NonEmptyStringC,
      'strongly-supported': NonEmptyStringC,
    }),
    dataPresentation: C.literal(
      'inappropriate-unclear',
      'somewhat-inappropriate-unclear',
      'neutral',
      'mostly-appropriate-clear',
      'highly-appropriate-clear',
      'skip',
    ),
    dataPresentationDetails: C.partial({
      'inappropriate-unclear': NonEmptyStringC,
      'somewhat-inappropriate-unclear': NonEmptyStringC,
      neutral: NonEmptyStringC,
      'mostly-appropriate-clear': NonEmptyStringC,
      'highly-appropriate-clear': NonEmptyStringC,
    }),
    findingsNextSteps: C.literal(
      'inadequately',
      'insufficiently',
      'adequately',
      'clearly-insightfully',
      'exceptionally',
      'skip',
    ),
    findingsNextStepsDetails: C.partial({
      inadequately: NonEmptyStringC,
      insufficiently: NonEmptyStringC,
      adequately: NonEmptyStringC,
      'clearly-insightfully': NonEmptyStringC,
      exceptionally: NonEmptyStringC,
      skip: NonEmptyStringC,
    }),
    generativeAiIdeas: C.literal('yes', 'no'),
    novel: C.literal('no', 'limited', 'some', 'substantial', 'highly', 'skip'),
    novelDetails: C.partial({
      no: NonEmptyStringC,
      limited: NonEmptyStringC,
      some: NonEmptyStringC,
      substantial: NonEmptyStringC,
      highly: NonEmptyStringC,
    }),
    languageEditing: C.literal('yes', 'no'),
    languageEditingDetails: C.partial({
      yes: NonEmptyStringC,
      no: NonEmptyStringC,
    }),
    shouldRead: C.literal('no', 'yes-but', 'yes'),
    shouldReadDetails: C.partial({
      no: NonEmptyStringC,
      'yes-but': NonEmptyStringC,
      yes: NonEmptyStringC,
    }),
    readyFullReview: C.literal('no', 'yes-changes', 'yes'),
    readyFullReviewDetails: C.partial({
      no: NonEmptyStringC,
      'yes-changes': NonEmptyStringC,
      yes: NonEmptyStringC,
    }),
    moreAuthors: C.literal('yes', 'yes-private', 'no'),
    moreAuthorsApproved: C.literal('yes'),
    otherAuthors: pipe(C.array(C.struct({ name: NonEmptyStringC, emailAddress: EmailAddressC })), C.readonly),
    competingInterests: C.literal('yes', 'no'),
    competingInterestsDetails: NonEmptyStringC,
    conduct: C.literal('yes'),
  }),
  C.imap(
    form => (form.review || form.alreadyWritten === 'yes' ? { reviewType: 'freeform' as const, ...form } : form),
    identity,
  ),
)
