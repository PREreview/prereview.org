import { isDoi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import type { JsonRecord } from 'fp-ts/Json'
import type { ReaderTaskEither } from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import { flow, identity, pipe } from 'fp-ts/function'
import { getAssignSemigroup } from 'fp-ts/struct'
import * as C from 'io-ts/Codec'
import type Keyv from 'keyv'
import type { Orcid } from 'orcid-id-ts'
import { P, match } from 'ts-pattern'
import { RawHtmlC } from '../html'
import { seeOther } from '../middleware'
import type { PreprintId } from '../preprint-id'
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
} from '../routes'
import { NonEmptyStringC } from '../string'

export type Form = C.TypeOf<typeof FormC>

export interface FormStoreEnv {
  formStore: Keyv<JsonRecord>
}

export function formKey(user: Orcid, preprint: PreprintId) {
  return match(preprint)
    .with({ type: 'philsci' }, preprint => `${user}_philsci_${preprint.value}`)
    .with({ value: P.when(isDoi) }, preprint => `${user}_${preprint.value}`)
    .exhaustive()
}

export function getForm(
  user: Orcid,
  preprint: PreprintId,
): ReaderTaskEither<FormStoreEnv, 'no-form' | 'form-unavailable', Form> {
  return flow(
    TE.tryCatchK(
      async ({ formStore }) => await formStore.get(formKey(user, preprint)),
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
  user: Orcid,
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
  user: Orcid,
  preprint: PreprintId,
): ReaderTaskEither<FormStoreEnv, 'form-unavailable', void> {
  return TE.tryCatchK(
    async ({ formStore }) => {
      await formStore.delete(formKey(user, preprint))
    },
    () => 'form-unavailable',
  )
}

export const nextFormMatch = (form: Form) =>
  match(form)
    .with(
      { alreadyWritten: P.optional(undefined), reviewType: P.optional(undefined) },
      () => writeReviewReviewTypeMatch,
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
    .with({ competingInterests: P.optional(undefined) }, () => writeReviewCompetingInterestsMatch)
    .with({ conduct: P.optional(undefined) }, () => writeReviewConductMatch)
    .otherwise(() => writeReviewPublishMatch)

export const redirectToNextForm = (preprint: PreprintId) =>
  flow(nextFormMatch, match => format(match.formatter, { id: preprint }), seeOther)

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
    competingInterests: C.literal('yes', 'no'),
    competingInterestsDetails: NonEmptyStringC,
    conduct: C.literal('yes'),
  }),
  C.imap(
    form => (form.review || form.alreadyWritten === 'yes' ? { reviewType: 'freeform' as const, ...form } : form),
    identity,
  ),
)
