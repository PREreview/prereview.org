import * as RequestAReviewForm from '../../../../src/WebApp/RequestAReviewFlow/RequestAReviewPage/RequestAReviewForm.ts'
import * as fc from '../../../fc.ts'

export * from '../../../fc.ts'

export const invalidForm = (): fc.Arbitrary<RequestAReviewForm.InvalidForm> =>
  fc
    .record({
      whichPreprint: fc.left(
        fc.oneof(
          fc.string().map(value => new RequestAReviewForm.Invalid({ value })),
          fc.constant(new RequestAReviewForm.Missing()),
        ),
      ),
    })
    .map(args => new RequestAReviewForm.InvalidForm(args))
