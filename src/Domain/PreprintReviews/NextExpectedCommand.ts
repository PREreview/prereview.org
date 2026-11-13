import { P, match } from 'ts-pattern'
import type { Form } from './legacy-form.ts'

export type NextExpectedCommand =
  | 'ChooseReviewType'
  | 'DeclareUseOfAi'
  | 'AnswerIfTheIntroductionMatches'
  | 'AnswerIfTheMethodsAreAppropriate'
  | 'AnswerIfTheResultsAreSupported'
  | 'AnswerIfTheDataPresentationIsWellSuited'
  | 'AnswerIfTheFindingsAndNextStepsAreClear'
  | 'AnswerIfThePreprintIsNovel'
  | 'AnswerIfTheLanguageNeedsEditing'
  | 'AnswerIfThePreprintShouldBeRead'
  | 'AnswerIfThePreprintIsReadyForAFullReview'
  | 'WriteReview'
  | 'ChoosePersona'
  | 'AnswerIfOthersNeedToBeListed'
  | 'AddOtherAuthors'
  | 'DeclareCompetingInterests'
  | 'DeclareFollowingCodeOfConduct'
  | 'PublishPreprintReview'

export const NextExpectedCommand = (form: Form): NextExpectedCommand =>
  match(form)
    .returnType<NextExpectedCommand>()
    .with({ alreadyWritten: P.optional(undefined), reviewType: P.optional(undefined) }, () => 'ChooseReviewType')
    .with({ alreadyWritten: 'yes', generativeAiIdeas: P.optional(undefined) }, () => 'DeclareUseOfAi')
    .with(
      { reviewType: 'questions', introductionMatches: P.optional(undefined) },
      () => 'AnswerIfTheIntroductionMatches',
    )
    .with(
      { reviewType: 'questions', methodsAppropriate: P.optional(undefined) },
      () => 'AnswerIfTheMethodsAreAppropriate',
    )
    .with({ reviewType: 'questions', resultsSupported: P.optional(undefined) }, () => 'AnswerIfTheResultsAreSupported')
    .with(
      { reviewType: 'questions', dataPresentation: P.optional(undefined) },
      () => 'AnswerIfTheDataPresentationIsWellSuited',
    )
    .with(
      { reviewType: 'questions', findingsNextSteps: P.optional(undefined) },
      () => 'AnswerIfTheFindingsAndNextStepsAreClear',
    )
    .with({ reviewType: 'questions', novel: P.optional(undefined) }, () => 'AnswerIfThePreprintIsNovel')
    .with({ reviewType: 'questions', languageEditing: P.optional(undefined) }, () => 'AnswerIfTheLanguageNeedsEditing')
    .with({ reviewType: 'questions', shouldRead: P.optional(undefined) }, () => 'AnswerIfThePreprintShouldBeRead')
    .with(
      { reviewType: 'questions', readyFullReview: P.optional(undefined) },
      () => 'AnswerIfThePreprintIsReadyForAFullReview',
    )
    .with({ reviewType: P.optional('freeform'), review: P.optional(undefined) }, () => 'WriteReview')
    .with({ persona: P.optional(undefined) }, () => 'ChoosePersona')
    .with({ moreAuthors: P.optional(undefined) }, () => 'AnswerIfOthersNeedToBeListed')
    .with({ moreAuthors: 'yes', otherAuthors: P.optional(undefined) }, () => 'AddOtherAuthors')
    .with({ generativeAiIdeas: P.optional(undefined) }, () => 'DeclareUseOfAi')
    .with({ competingInterests: P.optional(undefined) }, () => 'DeclareCompetingInterests')
    .with({ conduct: P.optional(undefined) }, () => 'DeclareFollowingCodeOfConduct')
    .otherwise(() => 'PublishPreprintReview')
