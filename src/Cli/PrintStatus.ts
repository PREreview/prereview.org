import { Temporal } from '@js-temporal/polyfill'
import { Array, Console, Effect, flow, pipe } from 'effect'
import * as ReviewRequests from '../ReviewRequests/index.ts'

export const PrintStatus = pipe(
  Console.log('Review requests needing categorization'),
  Effect.andThen(ReviewRequests.findReviewRequestsNeedingCategorization),
  Effect.tapBoth({
    onSuccess: flow(
      Array.map(result => ({
        ID: result.id,
        Published: result.publishedAt
          .toZonedDateTimeISO('UTC')
          .until(Temporal.Now.zonedDateTimeISO('UTC'), {
            largestUnit: 'day',
            smallestUnit: 'hour',
          })
          .toLocaleString('en-US'),
      })),
      Console.table,
    ),
    onFailure: Console.log,
  }),
)
