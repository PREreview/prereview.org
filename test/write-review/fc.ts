import merge from 'ts-deepmerge'
import { type CompletedForm, CompletedFormC } from '../../src/write-review/completed-form'
import type { Form } from '../../src/write-review/form'
import * as fc from '../fc'

export * from '../fc'

export const alreadyWritten = (): fc.Arbitrary<Required<Form>['alreadyWritten']> => fc.constantFrom('yes', 'no')

export const conduct = (): fc.Arbitrary<Required<Form>['conduct']> => fc.constant('yes')

export const introductionMatches = (): fc.Arbitrary<Required<Form>['introductionMatches']> =>
  fc.constantFrom('yes', 'partly', 'no', 'skip')

export const methodsAppropriate = (): fc.Arbitrary<Required<Form>['methodsAppropriate']> =>
  fc.constantFrom(
    'inappropriate',
    'somewhat-inappropriate',
    'adequate',
    'mostly-appropriate',
    'highly-appropriate',
    'skip',
  )

export const resultsSupported = (): fc.Arbitrary<Required<Form>['resultsSupported']> =>
  fc.constantFrom('not-supported', 'partially-supported', 'neutral', 'well-supported', 'strongly-supported', 'skip')

export const dataPresentation = (): fc.Arbitrary<Required<Form>['dataPresentation']> =>
  fc.constantFrom(
    'inappropriate-unclear',
    'somewhat-inappropriate-unclear',
    'neutral',
    'mostly-appropriate-clear',
    'highly-appropriate-clear',
    'skip',
  )

export const dataPresentationDetails = (): fc.Arbitrary<Required<Form>['dataPresentationDetails']> =>
  fc.oneof(
    fc.record(
      {
        'inappropriate-unclear': fc.nonEmptyString(),
        'somewhat-inappropriate-unclear': fc.nonEmptyString(),
        neutral: fc.nonEmptyString(),
        'mostly-appropriate-clear': fc.nonEmptyString(),
        'highly-appropriate-clear': fc.nonEmptyString(),
      },
      { withDeletedKeys: true },
    ),
    fc.constant({}),
  )

export const findingsNextSteps = (): fc.Arbitrary<Required<Form>['findingsNextSteps']> =>
  fc.constantFrom('inadequately', 'insufficiently', 'adequately', 'clearly-insightfully', 'exceptionally', 'skip')

export const novel = (): fc.Arbitrary<Required<Form>['novel']> =>
  fc.constantFrom('no', 'limited', 'some', 'substantial', 'highly', 'skip')

export const languageEditing = (): fc.Arbitrary<Required<Form>['languageEditing']> => fc.constantFrom('yes', 'no')

export const shouldRead = (): fc.Arbitrary<Required<Form>['shouldRead']> => fc.constantFrom('yes', 'yes-but', 'no')

export const readyFullReview = (): fc.Arbitrary<Required<Form>['readyFullReview']> =>
  fc.constantFrom('yes', 'yes-changes', 'no')

export const moreAuthors = (): fc.Arbitrary<Required<Form>['moreAuthors']> =>
  fc.constantFrom('yes', 'yes-private', 'no')

export const moreAuthorsApproved = (): fc.Arbitrary<Required<Form>['moreAuthorsApproved']> => fc.constant('yes')

export const persona = (): fc.Arbitrary<Required<Form>['persona']> => fc.constantFrom('public', 'pseudonym')

export const competingInterests = (): fc.Arbitrary<Required<Form>['competingInterests']> => fc.constantFrom('yes', 'no')

export const reviewType = (): fc.Arbitrary<Required<Form>['reviewType']> => fc.constantFrom('freeform', 'questions')

export const incompleteQuestionsForm = (): fc.Arbitrary<Form & { alreadyWritten: 'no'; reviewType: 'questions' }> =>
  fc
    .tuple(
      fc.partialRecord(
        {
          alreadyWritten: fc.constant('no' as const),
          introductionMatches: introductionMatches(),
          reviewType: fc.constant('questions' as const),
          persona: persona(),
          methodsAppropriate: methodsAppropriate(),
          resultsSupported: resultsSupported(),
          dataPresentation: dataPresentation(),
          findingsNextSteps: findingsNextSteps(),
          novel: novel(),
          languageEditing: languageEditing(),
          shouldRead: shouldRead(),
          readyFullReview: readyFullReview(),
          moreAuthors: moreAuthors(),
          competingInterests: competingInterests(),
          conduct: conduct(),
        },
        { requiredKeys: ['alreadyWritten', 'reviewType'] },
      ),
      fc.oneof(
        fc.record(
          {
            dataPresentationDetails: dataPresentationDetails(),
            moreAuthorsApproved: moreAuthorsApproved(),
            competingInterestsDetails: fc.nonEmptyString(),
            review: fc.html(),
          },
          { withDeletedKeys: true },
        ),
        fc.constant({}),
      ),
    )
    .map(parts => merge(...parts))

export const incompleteFreeformForm = (): fc.Arbitrary<Form & { reviewType?: 'freeform' }> =>
  fc
    .tuple(
      fc.partialRecord(
        {
          alreadyWritten: alreadyWritten(),
          review: fc.html(),
          persona: persona(),
          moreAuthors: moreAuthors(),
          competingInterests: competingInterests(),
          conduct: conduct(),
        },
        { requiredKeys: ['alreadyWritten'] },
      ),
      fc.oneof(
        fc.record(
          {
            moreAuthorsApproved: moreAuthorsApproved(),
            competingInterestsDetails: fc.nonEmptyString(),
            introductionMatches: introductionMatches(),
            methodsAppropriate: methodsAppropriate(),
            resultsSupported: resultsSupported(),
            dataPresentation: dataPresentation(),
            dataPresentationDetails: dataPresentationDetails(),
            findingsNextSteps: findingsNextSteps(),
            novel: novel(),
            languageEditing: languageEditing(),
            shouldRead: shouldRead(),
            readyFullReview: readyFullReview(),
            reviewType: fc.constant('freeform' as const),
          },
          { withDeletedKeys: true },
        ),
        fc.constant({}),
      ),
    )
    .map(parts => merge(...parts))

export const incompleteForm = (model: { [K in keyof Form]: fc.Arbitrary<Form[K]> } = {}): fc.Arbitrary<Form> =>
  fc
    .tuple(fc.oneof(incompleteQuestionsForm(), incompleteFreeformForm(), unknownFormType()), fc.record(model))
    .map(parts => merge(...parts))

export const completedQuestionsForm = (): fc.Arbitrary<Extract<CompletedForm, { reviewType: 'questions' }>> =>
  fc
    .tuple(
      fc.record({
        alreadyWritten: fc.constant('no' as const),
        conduct: conduct(),
        introductionMatches: introductionMatches(),
        methodsAppropriate: methodsAppropriate(),
        resultsSupported: resultsSupported(),
        dataPresentation: dataPresentation(),
        findingsNextSteps: findingsNextSteps(),
        novel: novel(),
        languageEditing: languageEditing(),
        shouldRead: shouldRead(),
        readyFullReview: readyFullReview(),
        moreAuthors: moreAuthors(),
        persona: persona(),
        reviewType: fc.constant('questions' as const),
      }),
      fc.oneof(
        fc.record({
          competingInterests: fc.constant('yes' as const),
          competingInterestsDetails: fc.nonEmptyString(),
        }),
        fc.record({
          competingInterests: fc.constant('no' as const),
        }),
      ),
      fc.oneof(
        fc.record(
          {
            dataPresentation: dataPresentation().filter(value => value !== 'skip'),
            dataPresentationDetails: fc.nonEmptyString(),
          },
          { requiredKeys: ['dataPresentation'] },
        ),
        fc.record({ dataPresentation: fc.constant('skip' as const) }),
      ),
    )
    .map(parts => merge(...(parts as never)))

export const completedFreeformForm = (): fc.Arbitrary<Extract<CompletedForm, { reviewType: 'freeform' }>> =>
  fc
    .tuple(
      fc.record({
        alreadyWritten: alreadyWritten(),
        conduct: conduct(),
        moreAuthors: moreAuthors(),
        persona: persona(),
        review: fc.html(),
        reviewType: fc.constant('freeform' as const),
      }),
      fc.oneof(
        fc.record({
          competingInterests: fc.constant('yes' as const),
          competingInterestsDetails: fc.nonEmptyString(),
        }),
        fc.record({
          competingInterests: fc.constant('no' as const),
        }),
      ),
    )
    .map(parts => merge(...parts))

export const completedForm = (
  model: {
    [K in keyof Partial<CompletedForm>]: fc.Arbitrary<CompletedForm[K]>
  } = {},
): fc.Arbitrary<CompletedForm> =>
  fc
    .tuple(fc.oneof(completedFreeformForm(), completedQuestionsForm()), fc.record(model as never))
    .map(parts => merge(...(parts as never)))

export const unknownFormType = () =>
  fc.oneof(
    fc.record({
      review: fc.html(),
      persona: persona(),
      moreAuthors: moreAuthors(),
      competingInterests: competingInterests(),
      conduct: conduct(),
      introductionMatches: introductionMatches(),
      methodsAppropriate: methodsAppropriate(),
      resultsSupported: resultsSupported(),
      dataPresentation: dataPresentation(),
      findingsNextSteps: findingsNextSteps(),
      novel: novel(),
      languageEditing: languageEditing(),
      shouldRead: shouldRead(),
      readyFullReview: readyFullReview(),
    }),
    fc.constant({}),
  ) satisfies fc.Arbitrary<Form>

export const questionsForm = (): fc.Arbitrary<Form> =>
  fc.oneof(completedQuestionsForm().map(CompletedFormC.encode), incompleteQuestionsForm())

export const freeformForm = (): fc.Arbitrary<Form> =>
  fc.oneof(completedFreeformForm().map(CompletedFormC.encode), incompleteFreeformForm())

export const form = (
  model: {
    [K in keyof Partial<Form>]: fc.Arbitrary<Form[K]>
  } = {},
): fc.Arbitrary<Form> =>
  fc
    .tuple(fc.oneof(completedForm().map(CompletedFormC.encode), incompleteForm()), fc.record(model as never))
    .map(parts => merge(...parts))
