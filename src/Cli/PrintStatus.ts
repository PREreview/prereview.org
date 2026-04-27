import { Command } from '@effect/cli'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Console, Effect, flow, pipe } from 'effect'
import * as Prereviewers from '../Prereviewers/index.ts'
import * as ReviewRequests from '../ReviewRequests/index.ts'

const program = pipe(
  Effect.void,
  Effect.andThen(Console.log('Number of pseudonyms available')),
  Effect.andThen(Prereviewers.countAvailablePseudonyms),
  Effect.tapBoth({
    onSuccess: flow(
      ({ used, legacyUsed, available }) => ({
        Used: `${used.toLocaleString('en-US')} (${Intl.NumberFormat('en-US', {
          style: 'percent',
        }).format(used / (used + available))})`,
        Remaining: `${available.toLocaleString('en-US')} (${Intl.NumberFormat('en-US', {
          style: 'percent',
        }).format(available / (used + available))})`,
        'Legacy pseudonyms in use': legacyUsed.toLocaleString('en-US'),
      }),
      Console.table,
    ),
    onFailure: Console.log,
  }),
  Effect.andThen(Console.log('Review requests needing categorization')),
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

export const PrintStatus = Command.make('status', {}, () => program)
