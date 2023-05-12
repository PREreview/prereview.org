import merge from 'ts-deepmerge'
import type { CompletedForm } from '../../src/write-review/completed-form'
import * as fc from '../fc'

export * from '../fc'

export const completedForm = (): fc.Arbitrary<CompletedForm> =>
  fc
    .tuple(
      fc.record({
        alreadyWritten: fc.constantFrom('yes' as const, 'no' as const),
        conduct: fc.constant('yes' as const),
        moreAuthors: fc.constantFrom('yes' as const, 'yes-private' as const, 'no' as const),
        persona: fc.constantFrom('public' as const, 'pseudonym' as const),
        review: fc.html(),
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
