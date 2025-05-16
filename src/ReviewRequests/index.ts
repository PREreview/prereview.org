import { FetchHttpClient } from '@effect/platform'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Context, Effect, Layer, pipe, Redacted } from 'effect'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as T from 'fp-ts/lib/Task.js'
import type { LanguageCode } from 'iso-639-1'
import { DeprecatedLoggerEnv } from '../Context.js'
import * as EffectToFpts from '../EffectToFpts.js'
import type { Html } from '../html.js'
import * as Preprint from '../preprint.js'
import {
  getRecentReviewRequestsFromPrereviewCoarNotify,
  PrereviewCoarNotifyConfig,
} from '../prereview-coar-notify/index.js'
import type { FieldId } from '../types/field.js'
import type { PreprintId } from '../types/preprint-id.js'
import type { SubfieldId } from '../types/subfield.js'

import PlainDate = Temporal.PlainDate

export interface ReviewRequest {
  readonly published: PlainDate
  readonly fields: ReadonlyArray<FieldId>
  readonly subfields: ReadonlyArray<SubfieldId>
  readonly preprint: {
    readonly id: PreprintId
    readonly language: LanguageCode
    readonly title: Html
  }
}

export class ReviewRequests extends Context.Tag('ReviewRequests')<
  ReviewRequests,
  {
    getFiveMostRecent: T.Task<ReadonlyArray<ReviewRequest>>
  }
>() {}

export const layer = Layer.effect(
  ReviewRequests,
  Effect.gen(function* () {
    const fetch = yield* FetchHttpClient.Fetch
    const logger = yield* DeprecatedLoggerEnv
    const getPreprintTitle = yield* pipe(Preprint.GetPreprintTitle, Effect.andThen(EffectToFpts.makeTaskEitherK))
    const coarNotify = yield* PrereviewCoarNotifyConfig

    return {
      getFiveMostRecent: pipe(
        getRecentReviewRequestsFromPrereviewCoarNotify(1),
        RTE.getOrElseW(() => RT.of(Array.empty())),
      )({
        ...coarNotify,
        coarNotifyToken: Redacted.value(coarNotify.coarNotifyToken),
        fetch,
        getPreprintTitle,
        ...logger,
      }),
    }
  }),
)
