import { Effect, pipe } from 'effect'
import * as Preprints from '../../Preprints/index.ts'
import { Temporal, type Uuid } from '../../types/index.ts'
import * as Commands from '../Commands/index.ts'
import * as Errors from '../Errors.ts'
import * as Queries from '../Queries/index.ts'

export const ProcessReceivedReviewRequest = Effect.fn(
  function* (reviewRequestId: Uuid.Uuid) {
    const reviewRequest = yield* Queries.getReceivedReviewRequest({ reviewRequestId })

    yield* pipe(
      Effect.gen(function* () {
        yield* Preprints.resolvePreprintId(reviewRequest.preprintId)

        const acceptedAt = yield* Temporal.currentInstant

        yield* Commands.acceptReviewRequest({
          acceptedAt,
          reviewRequestId: reviewRequest.id,
        })
      }),
      Effect.catchTag('NotAPreprint', () =>
        Effect.gen(function* () {
          const rejectedAt = yield* Temporal.currentInstant

          yield* Commands.rejectReviewRequest({
            rejectedAt,
            reviewRequestId: reviewRequest.id,
            reason: 'not-a-preprint',
          })
        }),
      ),
    )
  },
  Effect.catchIf(
    error => error._tag !== 'PreprintIsNotFound',
    error => new Errors.FailedToProcessReceivedReviewRequest({ cause: error }),
  ),
)
