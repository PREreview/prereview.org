import { merge } from 'ts-deepmerge'
import { type CompletedForm, CompletedFormC } from '../../../src/WebApp/write-review/completed-form.ts'
import type { Form } from '../../../src/WebApp/write-review/form.ts'
import * as fc from '../../fc.ts'

export * from '../../fc.ts'

export const alreadyWritten = (): fc.Arbitrary<Required<Form>['alreadyWritten']> => fc.constantFrom('yes', 'no')

export const conduct = (): fc.Arbitrary<Required<Form>['conduct']> => fc.constant('yes')

export const introductionMatches = (): fc.Arbitrary<Required<Form>['introductionMatches']> =>
  fc.constantFrom('yes', 'partly', 'no', 'skip')

export const introductionMatchesDetails = (): fc.Arbitrary<Required<Form>['introductionMatchesDetails']> =>
  fc.oneof(
    fc.record(
      {
        yes: fc.nonEmptyString(),
        partly: fc.nonEmptyString(),
        no: fc.nonEmptyString(),
      },
      { requiredKeys: [] },
    ),
    fc.constant({}),
  )

export const methodsAppropriate = (): fc.Arbitrary<Required<Form>['methodsAppropriate']> =>
  fc.constantFrom(
    'inappropriate',
    'somewhat-inappropriate',
    'adequate',
    'mostly-appropriate',
    'highly-appropriate',
    'skip',
  )

export const methodsAppropriateDetails = (): fc.Arbitrary<Required<Form>['methodsAppropriateDetails']> =>
  fc.oneof(
    fc.record(
      {
        inappropriate: fc.nonEmptyString(),
        'somewhat-inappropriate': fc.nonEmptyString(),
        adequate: fc.nonEmptyString(),
        'mostly-appropriate': fc.nonEmptyString(),
        'highly-appropriate': fc.nonEmptyString(),
      },
      { requiredKeys: [] },
    ),
    fc.constant({}),
  )

export const resultsSupported = (): fc.Arbitrary<Required<Form>['resultsSupported']> =>
  fc.constantFrom('not-supported', 'partially-supported', 'neutral', 'well-supported', 'strongly-supported', 'skip')

export const resultsSupportedDetails = (): fc.Arbitrary<Required<Form>['resultsSupportedDetails']> =>
  fc.oneof(
    fc.record(
      {
        'not-supported': fc.nonEmptyString(),
        'partially-supported': fc.nonEmptyString(),
        neutral: fc.nonEmptyString(),
        'well-supported': fc.nonEmptyString(),
        'strongly-supported': fc.nonEmptyString(),
      },
      { requiredKeys: [] },
    ),
    fc.constant({}),
  )

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
      { requiredKeys: [] },
    ),
    fc.constant({}),
  )

export const findingsNextSteps = (): fc.Arbitrary<Required<Form>['findingsNextSteps']> =>
  fc.constantFrom('inadequately', 'insufficiently', 'adequately', 'clearly-insightfully', 'exceptionally', 'skip')

export const findingsNextStepsDetails = (): fc.Arbitrary<Required<Form>['findingsNextStepsDetails']> =>
  fc.oneof(
    fc.record(
      {
        inadequately: fc.nonEmptyString(),
        insufficiently: fc.nonEmptyString(),
        adequately: fc.nonEmptyString(),
        'clearly-insightfully': fc.nonEmptyString(),
        exceptionally: fc.nonEmptyString(),
      },
      { requiredKeys: [] },
    ),
    fc.constant({}),
  )

export const novel = (): fc.Arbitrary<Required<Form>['novel']> =>
  fc.constantFrom('no', 'limited', 'some', 'substantial', 'highly', 'skip')

export const novelDetails = (): fc.Arbitrary<Required<Form>['novelDetails']> =>
  fc.oneof(
    fc.record(
      {
        no: fc.nonEmptyString(),
        limited: fc.nonEmptyString(),
        some: fc.nonEmptyString(),
        substantial: fc.nonEmptyString(),
        highly: fc.nonEmptyString(),
      },
      { requiredKeys: [] },
    ),
    fc.constant({}),
  )

export const languageEditing = (): fc.Arbitrary<Required<Form>['languageEditing']> => fc.constantFrom('yes', 'no')

export const languageEditingDetails = (): fc.Arbitrary<Required<Form>['languageEditingDetails']> =>
  fc.oneof(
    fc.record(
      {
        yes: fc.nonEmptyString(),
        no: fc.nonEmptyString(),
      },
      { requiredKeys: [] },
    ),
    fc.constant({}),
  )

export const shouldRead = (): fc.Arbitrary<Required<Form>['shouldRead']> => fc.constantFrom('yes', 'yes-but', 'no')

export const shouldReadDetails = (): fc.Arbitrary<Required<Form>['shouldReadDetails']> =>
  fc.oneof(
    fc.record(
      {
        yes: fc.nonEmptyString(),
        'yes-but': fc.nonEmptyString(),
        no: fc.nonEmptyString(),
      },
      { requiredKeys: [] },
    ),
    fc.constant({}),
  )

export const readyFullReview = (): fc.Arbitrary<Required<Form>['readyFullReview']> =>
  fc.constantFrom('yes', 'yes-changes', 'no')

export const readyFullReviewDetails = (): fc.Arbitrary<Required<Form>['readyFullReviewDetails']> =>
  fc.oneof(
    fc.record(
      {
        yes: fc.nonEmptyString(),
        'yes-changes': fc.nonEmptyString(),
        no: fc.nonEmptyString(),
      },
      { requiredKeys: [] },
    ),
    fc.constant({}),
  )

export const moreAuthors = (): fc.Arbitrary<Required<Form>['moreAuthors']> =>
  fc.constantFrom('yes', 'yes-private', 'no')

export const moreAuthorsApproved = (): fc.Arbitrary<Required<Form>['moreAuthorsApproved']> => fc.constant('yes')

export const personaType = (): fc.Arbitrary<Required<Form>['persona']> => fc.constantFrom('public', 'pseudonym')

export const otherAuthors = ({ minLength }: { minLength?: number } = {}): fc.Arbitrary<
  Required<Form>['otherAuthors']
> => fc.array(fc.record({ name: fc.nonEmptyString(), emailAddress: fc.emailAddress() }), { minLength })

export const generativeAiIdeas = (): fc.Arbitrary<Required<Form>['generativeAiIdeas']> => fc.constantFrom('yes', 'no')

export const competingInterests = (): fc.Arbitrary<Required<Form>['competingInterests']> => fc.constantFrom('yes', 'no')

export const reviewType = (): fc.Arbitrary<Required<Form>['reviewType']> => fc.constantFrom('freeform', 'questions')

export const incompleteQuestionsForm = (): fc.Arbitrary<Form & { alreadyWritten: 'no'; reviewType: 'questions' }> =>
  fc
    .tuple(
      fc.partialRecord(
        {
          alreadyWritten: fc.constant('no'),
          introductionMatches: introductionMatches(),
          reviewType: fc.constant('questions'),
          persona: personaType(),
          methodsAppropriate: methodsAppropriate(),
          resultsSupported: resultsSupported(),
          dataPresentation: dataPresentation(),
          findingsNextSteps: findingsNextSteps(),
          novel: novel(),
          languageEditing: languageEditing(),
          shouldRead: shouldRead(),
          readyFullReview: readyFullReview(),
          moreAuthors: moreAuthors(),
          generativeAiIdeas: generativeAiIdeas(),
          competingInterests: competingInterests(),
          conduct: conduct(),
        },
        { requiredKeys: ['alreadyWritten', 'reviewType'] },
      ),
      fc.oneof(
        fc.record(
          {
            introductionMatchesDetails: introductionMatchesDetails(),
            methodsAppropriateDetails: methodsAppropriateDetails(),
            resultsSupportedDetails: resultsSupportedDetails(),
            dataPresentationDetails: dataPresentationDetails(),
            findingsNextStepsDetails: findingsNextStepsDetails(),
            novelDetails: novelDetails(),
            languageEditingDetails: languageEditingDetails(),
            shouldReadDetails: shouldReadDetails(),
            readyFullReviewDetails: readyFullReviewDetails(),
            moreAuthorsApproved: moreAuthorsApproved(),
            competingInterestsDetails: fc.nonEmptyString(),
            review: fc.html(),
            otherAuthors: otherAuthors(),
          },
          { requiredKeys: [] },
        ),
        fc.constant({}),
      ),
    )
    .map(parts => merge.withOptions({ mergeArrays: false }, ...parts))

export const incompleteFreeformForm = (): fc.Arbitrary<Form & { reviewType?: 'freeform' }> =>
  fc
    .tuple(
      fc.partialRecord(
        {
          alreadyWritten: alreadyWritten(),
          review: fc.html(),
          persona: personaType(),
          moreAuthors: moreAuthors(),
          generativeAiIdeas: generativeAiIdeas(),
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
            introductionMatchesDetails: introductionMatchesDetails(),
            methodsAppropriate: methodsAppropriate(),
            methodsAppropriateDetails: methodsAppropriateDetails(),
            resultsSupported: resultsSupported(),
            resultsSupportedDetails: resultsSupportedDetails(),
            dataPresentation: dataPresentation(),
            dataPresentationDetails: dataPresentationDetails(),
            findingsNextSteps: findingsNextSteps(),
            findingsNextStepsDetails: findingsNextStepsDetails(),
            novel: novel(),
            novelDetails: novelDetails(),
            languageEditing: languageEditing(),
            languageEditingDetails: languageEditingDetails(),
            shouldRead: shouldRead(),
            shouldReadDetails: shouldReadDetails(),
            readyFullReview: readyFullReview(),
            readyFullReviewDetails: readyFullReviewDetails(),
            reviewType: fc.constant('freeform'),
            otherAuthors: otherAuthors(),
          },
          { requiredKeys: [] },
        ),
        fc.constant({}),
      ),
    )
    .map(parts => merge.withOptions({ mergeArrays: false }, ...parts))

export const incompleteForm = (model: { [K in keyof Form]: fc.Arbitrary<Form[K]> } = {}): fc.Arbitrary<Form> =>
  fc
    .tuple(fc.oneof(incompleteQuestionsForm(), incompleteFreeformForm(), unknownFormType()), fc.record(model))
    .map(parts => merge.withOptions({ mergeArrays: false }, ...parts))

export const completedQuestionsForm = (): fc.Arbitrary<Extract<CompletedForm, { reviewType: 'questions' }>> =>
  fc
    .tuple(
      fc.record({
        alreadyWritten: fc.constant('no'),
        conduct: conduct(),
        resultsSupported: resultsSupported(),
        dataPresentation: dataPresentation(),
        findingsNextSteps: findingsNextSteps(),
        novel: novel(),
        readyFullReview: readyFullReview(),
        persona: personaType(),
        reviewType: fc.constant('questions'),
        generativeAiIdeas: generativeAiIdeas(),
      }),
      fc.oneof(
        fc.record({
          moreAuthors: fc.constant('yes'),
          otherAuthors: otherAuthors(),
        }),
        fc.record({
          moreAuthors: fc.constantFrom('yes-private', 'no'),
        }),
      ),
      fc.oneof(
        fc.record({
          competingInterests: fc.constant('yes'),
          competingInterestsDetails: fc.nonEmptyString(),
        }),
        fc.record({
          competingInterests: fc.constant('no'),
        }),
      ),
      fc.oneof(
        fc.record(
          {
            introductionMatches: introductionMatches().filter(value => value !== 'skip'),
            introductionMatchesDetails: fc.nonEmptyString(),
          },
          { requiredKeys: ['introductionMatches'] },
        ),
        fc.record({ introductionMatches: fc.constant('skip') }),
      ),
      fc.oneof(
        fc.record(
          {
            methodsAppropriate: methodsAppropriate().filter(value => value !== 'skip'),
            methodsAppropriateDetails: fc.nonEmptyString(),
          },
          { requiredKeys: ['methodsAppropriate'] },
        ),
        fc.record({ methodsAppropriate: fc.constant('skip') }),
      ),
      fc.oneof(
        fc.record(
          {
            resultsSupported: resultsSupported().filter(value => value !== 'skip'),
            resultsSupportedDetails: fc.nonEmptyString(),
          },
          { requiredKeys: ['resultsSupported'] },
        ),
        fc.record({ resultsSupported: fc.constant('skip') }),
      ),
      fc.oneof(
        fc.record(
          {
            dataPresentation: dataPresentation().filter(value => value !== 'skip'),
            dataPresentationDetails: fc.nonEmptyString(),
          },
          { requiredKeys: ['dataPresentation'] },
        ),
        fc.record({ dataPresentation: fc.constant('skip') }),
      ),
      fc.oneof(
        fc.record(
          {
            findingsNextSteps: findingsNextSteps().filter(value => value !== 'skip'),
            findingsNextStepsDetails: fc.nonEmptyString(),
          },
          { requiredKeys: ['findingsNextSteps'] },
        ),
        fc.record({ findingsNextSteps: fc.constant('skip') }),
      ),
      fc.oneof(
        fc.record(
          {
            novel: novel().filter(value => value !== 'skip'),
            novelDetails: fc.nonEmptyString(),
          },
          { requiredKeys: ['novel'] },
        ),
        fc.record({ novel: fc.constant('skip') }),
      ),
      fc.record(
        {
          languageEditing: languageEditing(),
          languageEditingDetails: fc.nonEmptyString(),
        },
        { requiredKeys: ['languageEditing'] },
      ),
      fc.record(
        {
          shouldRead: shouldRead(),
          shouldReadDetails: fc.nonEmptyString(),
        },
        { requiredKeys: ['shouldRead'] },
      ),
      fc.record(
        {
          readyFullReview: readyFullReview(),
          readyFullReviewDetails: fc.nonEmptyString(),
        },
        { requiredKeys: ['readyFullReview'] },
      ),
    )
    .map(parts => merge.withOptions({ mergeArrays: false }, ...(parts as never)))

export const completedFreeformForm = (): fc.Arbitrary<Extract<CompletedForm, { reviewType: 'freeform' }>> =>
  fc
    .tuple(
      fc.record({
        alreadyWritten: alreadyWritten(),
        conduct: conduct(),
        persona: personaType(),
        review: fc.html(),
        reviewType: fc.constant('freeform'),
        generativeAiIdeas: generativeAiIdeas(),
      }),
      fc.oneof(
        fc.record({
          moreAuthors: fc.constant('yes'),
          otherAuthors: otherAuthors(),
        }),
        fc.record({
          moreAuthors: fc.constantFrom('yes-private', 'no'),
        }),
      ),
      fc.oneof(
        fc.record({
          competingInterests: fc.constant('yes'),
          competingInterestsDetails: fc.nonEmptyString(),
        }),
        fc.record({
          competingInterests: fc.constant('no'),
        }),
      ),
    )
    .map(parts => merge.withOptions({ mergeArrays: false }, ...parts))

export const completedForm = <F extends Form>(model?: {
  [K in keyof F]: fc.Arbitrary<F[K]>
}): fc.Arbitrary<CompletedForm & F> =>
  fc
    .tuple(fc.oneof(completedFreeformForm(), completedQuestionsForm()), model ? fc.record(model) : fc.constant({}))
    .map(parts => merge.withOptions({ mergeArrays: false }, ...(parts as never)))

export const unknownFormType = () =>
  fc.oneof(
    fc.record({
      review: fc.html(),
      persona: personaType(),
      moreAuthors: moreAuthors(),
      otherAuthors: otherAuthors(),
      generativeAiIdeas: generativeAiIdeas(),
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
    .map(parts => merge.withOptions({ mergeArrays: false }, ...parts))
