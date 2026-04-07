import { UrlParams } from '@effect/platform'
import { Effect } from 'effect'
import type { Locale } from '../../../Context.ts'
import type * as Preprints from '../../../Preprints/index.ts'
import type * as Response from '../../Response/index.ts'
import { handleDecision } from './HandleDecision.ts'
import { makeDecision } from './MakeDecision.ts'

export const RequestAReviewPage: () => Effect.Effect<Response.Response, never, Preprints.Preprints | Locale> =
  Effect.fn('RequestAReviewFlow.RequestAReviewPage')(function* () {
    const decision = yield* makeDecision({ body: UrlParams.empty, method: 'GET' })

    return yield* handleDecision(decision)
  })

export const RequestAReviewSubmission: ({
  body,
}: {
  body: UrlParams.UrlParams
}) => Effect.Effect<Response.Response, never, Preprints.Preprints | Locale> = Effect.fn(
  'RequestAReviewFlow.RequestAReviewSubmission',
)(function* ({ body }) {
  const decision = yield* makeDecision({ body, method: 'POST' })

  return yield* handleDecision(decision)
})
