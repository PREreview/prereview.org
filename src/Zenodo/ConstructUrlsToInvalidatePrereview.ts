import { Effect } from 'effect'
import { ZenodoOrigin } from './CommunityRecords.js'

export const constructUrlsToInvalidatePrereview = (
  prereviewId: number,
): Effect.Effect<ReadonlyArray<URL>, never, ZenodoOrigin> =>
  Effect.all([constructUrlToRecord(prereviewId)], { concurrency: 'unbounded' })

const constructUrlToRecord = (prereviewId: number): Effect.Effect<URL, never, ZenodoOrigin> =>
  Effect.gen(function* () {
    const zenodoOrigin = yield* ZenodoOrigin

    return new URL(`/api/records/${prereviewId}`, zenodoOrigin)
  })
