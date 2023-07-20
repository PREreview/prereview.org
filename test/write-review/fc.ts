import merge from 'ts-deepmerge'
import type { CompletedForm } from '../../src/write-review/completed-form'
import * as fc from '../fc'

export * from '../fc'

export const completedQuestionsForm = (): fc.Arbitrary<Extract<CompletedForm, { reviewType: 'questions' }>> =>
  fc
    .tuple(
      fc.record({
        alreadyWritten: fc.constant('no' as const),
        conduct: fc.constant('yes' as const),
        introductionMatches: fc.constantFrom('yes' as const, 'partly' as const, 'no' as const, 'skip' as const),
        methodsAppropriate: fc.constantFrom(
          'inappropriate' as const,
          'somewhat-inappropriate' as const,
          'adequate' as const,
          'mostly-appropriate' as const,
          'highly-appropriate' as const,
          'skip' as const,
        ),
        resultsSupported: fc.constantFrom(
          'not-supported' as const,
          'partially-supported' as const,
          'neutral' as const,
          'well-supported' as const,
          'strongly-supported' as const,
          'skip' as const,
        ),
        moreAuthors: fc.constantFrom('yes' as const, 'yes-private' as const, 'no' as const),
        persona: fc.constantFrom('public' as const, 'pseudonym' as const),
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
    )
    .map(parts => merge(...parts))

export const completedFreeformForm = (): fc.Arbitrary<Extract<CompletedForm, { reviewType: 'freeform' }>> =>
  fc
    .tuple(
      fc.record({
        alreadyWritten: fc.constantFrom('yes' as const, 'no' as const),
        conduct: fc.constant('yes' as const),
        moreAuthors: fc.constantFrom('yes' as const, 'yes-private' as const, 'no' as const),
        persona: fc.constantFrom('public' as const, 'pseudonym' as const),
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

export const completedForm = (): fc.Arbitrary<CompletedForm> =>
  fc.oneof(completedFreeformForm(), completedQuestionsForm())
