import type { HttpClient } from '@effect/platform'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Context, Effect, Layer, pipe, Redacted } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import * as EffectToFpts from '../EffectToFpts.js'
import * as FptsToEffect from '../FptsToEffect.js'
import type { Html } from '../html.js'
import * as Preprints from '../Preprints/index.js'
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
    getFiveMostRecent: Effect.Effect<ReadonlyArray<ReviewRequest>>
  }
>() {}

export const { getFiveMostRecent } = Effect.serviceConstants(ReviewRequests)

export const layer = Layer.effect(
  ReviewRequests,
  Effect.gen(function* () {
    const getPreprintTitle = yield* EffectToFpts.makeTaskEitherK(Preprints.getPreprintTitle)
    const coarNotify = yield* PrereviewCoarNotifyConfig
    const runtime = yield* Effect.runtime<HttpClient.HttpClient>()

    return {
      getFiveMostRecent: pipe(
        FptsToEffect.readerTaskEither(getRecentReviewRequestsFromPrereviewCoarNotify(1), {
          ...coarNotify,
          coarNotifyToken: Redacted.value(coarNotify.coarNotifyToken),
          getPreprintTitle,
          runtime,
        }),
        Effect.orElseSucceed(Array.empty),
      ),
    }
  }),
)
