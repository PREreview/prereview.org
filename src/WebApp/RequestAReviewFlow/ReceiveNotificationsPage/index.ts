import type { UrlParams } from '@effect/platform'
import { Effect } from 'effect'
import type { Locale } from '../../../Context.ts'
import type { IndeterminatePreprintId, Preprints } from '../../../Preprints/index.ts'
import type { ReviewRequestQueries } from '../../../ReviewRequests/index.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import type { Response } from '../../Response/index.ts'

export const ReceiveNotificationsPage: (input: {
  preprintId: IndeterminatePreprintId
}) => Effect.Effect<Response, never, Locale | Preprints | ReviewRequestQueries> = Effect.fn(
  'RequestAReviewFlow.ReceiveNotificationsPage',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
)(function* ({ preprintId }) {
  return yield* HavingProblemsPage
})

export const ReceiveNotificationsSubmission: (input: {
  body: UrlParams.UrlParams
  preprintId: IndeterminatePreprintId
}) => Effect.Effect<Response, never, Locale | Preprints | ReviewRequestQueries> = Effect.fn(
  'RequestAReviewFlow.ReceiveNotificationsSubmission',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
)(function* ({ body, preprintId }) {
  return yield* HavingProblemsPage
})
