import { Effect, identity, Option, pipe } from 'effect'
import type { KeyValueStore } from 'effect/persistence'
import { format, type Match } from 'fp-ts-routing'
import type { ReaderTaskEither } from 'fp-ts/lib/ReaderTaskEither.js'
import { getAssignSemigroup } from 'fp-ts/lib/struct.js'
import * as C from 'io-ts/lib/Codec.js'
import { P, match } from 'ts-pattern'
import { RawHtmlC } from '../../html.ts'
import type { IndeterminatePreprintId, PreprintId } from '../Preprints/index.ts'
import { EffectToFpts, FptsToEffect } from '../../RefactoringUtilities/index.ts'
import * as Routes from '../../routes.ts'
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
} from '../../routes.ts'
import { isDoi } from '../../types/Doi.ts'
import { EmailAddressC } from '../../types/EmailAddress.ts'
import { NameC } from '../../types/Name.ts'
import { NonEmptyStringC } from '../../types/NonEmptyString.ts'
import type { OrcidId } from '../../types/OrcidId.ts'
import { UuidC } from '../../types/Uuid.ts'
import * as FormStore from './FormStore.ts'
import { NextExpectedCommand } from './NextExpectedCommand.ts'

export type Form = C.TypeOf<typeof FormC>

export interface FormStorage {
  readonly get: (key: string) => Effect.Effect<Option.Option<unknown>, KeyValueStore.KeyValueStoreError>
  readonly set: (key: string, value: unknown) => Effect.Effect<void, KeyValueStore.KeyValueStoreError>
  readonly delete: (key: string) => Effect.Effect<void, KeyValueStore.KeyValueStoreError>
}

export function formKey(user: OrcidId, preprint: PreprintId) {
  return match(preprint)
    .with({ _tag: 'PhilsciPreprintId' }, preprint => `${user}_philsci_${preprint.value}`)
    .with({ value: P.when(isDoi) }, preprint => `${user}_${preprint.value}`)
    .exhaustive()
}

export const loadForm = (
  user: OrcidId,
  preprint: PreprintId,
): Effect.Effect<Form, 'no-form' | 'form-unavailable', FormStore.Store> =>
  Effect.gen(function* () {
    const formStore = yield* FormStore.Store

    const form = yield* Effect.mapError(formStore.get(formKey(user, preprint)), () => 'form-unavailable' as const)

    return yield* Effect.mapError(
      Effect.fromResult(FptsToEffect.either(FormC.decode(Option.getOrUndefined(form)))),
      () => 'no-form' as const,
    )
  })

export function getForm(
  user: OrcidId,
  preprint: PreprintId,
): ReaderTaskEither<EffectToFpts.EffectEnv<FormStore.Store>, 'no-form' | 'form-unavailable', Form> {
  return EffectToFpts.toReaderTaskEither(loadForm(user, preprint))
}

export function createForm(): Form {
  return {}
}

export function updateForm(originalForm: Form): (newForm: Form) => Form {
  return newForm => getAssignSemigroup<Form>().concat(originalForm, newForm)
}

export const storeForm = (
  user: OrcidId,
  preprint: PreprintId,
  form: Form,
): Effect.Effect<void, 'form-unavailable', FormStore.Store> =>
  Effect.gen(function* () {
    const formStore = yield* FormStore.Store

    yield* Effect.mapError(
      formStore.set(formKey(user, preprint), FormC.encode(form)),
      () => 'form-unavailable' as const,
    )
  })

export function saveForm(
  user: OrcidId,
  preprint: PreprintId,
): (form: Form) => ReaderTaskEither<EffectToFpts.EffectEnv<FormStore.Store>, 'form-unavailable', void> {
  return form => EffectToFpts.toReaderTaskEither(storeForm(user, preprint, form))
}

export function deleteForm(
  user: OrcidId,
  preprint: PreprintId,
): ReaderTaskEither<EffectToFpts.EffectEnv<FormStore.Store>, 'form-unavailable', void> {
  return EffectToFpts.toReaderTaskEither(
    Effect.gen(function* () {
      const formStore = yield* FormStore.Store

      yield* Effect.mapError(formStore.delete(formKey(user, preprint)), () => 'form-unavailable' as const)
    }),
  )
}

export const nextFormPath = ({ form, preprintId }: { form: Form; preprintId: PreprintId }) =>
  commandHrefs[NextExpectedCommand(form)](preprintId)

const legacyHref = (match: Match<{ id: IndeterminatePreprintId }>) => (preprintId: PreprintId) =>
  format(match.formatter, { id: preprintId })

const commandHrefs = {
  ChooseReviewType: legacyHref(writeReviewReviewTypeMatch),
  DeclareUseOfAi: (preprintId: PreprintId) => Routes.ReviewAPreprintUseOfAi.href({ preprintId }),
  AnswerIfTheIntroductionMatches: legacyHref(writeReviewIntroductionMatchesMatch),
  AnswerIfTheMethodsAreAppropriate: legacyHref(writeReviewMethodsAppropriateMatch),
  AnswerIfTheResultsAreSupported: legacyHref(writeReviewResultsSupportedMatch),
  AnswerIfTheDataPresentationIsWellSuited: legacyHref(writeReviewDataPresentationMatch),
  AnswerIfTheFindingsAndNextStepsAreClear: legacyHref(writeReviewFindingsNextStepsMatch),
  AnswerIfThePreprintIsNovel: legacyHref(writeReviewNovelMatch),
  AnswerIfTheLanguageNeedsEditing: legacyHref(writeReviewLanguageEditingMatch),
  AnswerIfThePreprintShouldBeRead: legacyHref(writeReviewShouldReadMatch),
  AnswerIfThePreprintIsReadyForAFullReview: legacyHref(writeReviewReadyFullReviewMatch),
  WriteReview: legacyHref(writeReviewReviewMatch),
  ChoosePersona: legacyHref(writeReviewPersonaMatch),
  AnswerIfOthersNeedToBeListed: legacyHref(writeReviewAuthorsMatch),
  AddOtherAuthors: legacyHref(writeReviewAuthorsMatch),
  DeclareCompetingInterests: legacyHref(writeReviewCompetingInterestsMatch),
  DeclareFollowingCodeOfConduct: legacyHref(writeReviewConductMatch),
  PublishPreprintReview: legacyHref(writeReviewPublishMatch),
} satisfies Record<NextExpectedCommand, (preprintId: PreprintId) => string>

export const FormC = pipe(
  C.partial({
    alreadyWritten: C.literal('yes', 'no'),
    introductionMatches: C.literal('yes', 'partly', 'no', 'skip'),
    introductionMatchesDetails: C.partial({ yes: NonEmptyStringC, partly: NonEmptyStringC, no: NonEmptyStringC }),
    review: RawHtmlC,
    reviewType: C.literal('questions', 'freeform'),
    persona: C.literal('public', 'pseudonym'),
    club: C.nullable(UuidC),
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
    generativeAiIdeasDetails: NonEmptyStringC,
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
    otherAuthors: pipe(C.array(C.struct({ name: NameC, emailAddress: EmailAddressC })), C.readonly),
    competingInterests: C.literal('yes', 'no'),
    competingInterestsDetails: NonEmptyStringC,
    conduct: C.literal('yes'),
  }),
  C.imap(
    form => (form.review || form.alreadyWritten === 'yes' ? { reviewType: 'freeform' as const, ...form } : form),
    identity,
  ),
)
