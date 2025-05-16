import { FetchHttpClient } from '@effect/platform'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Context, Effect, Layer, pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as T from 'fp-ts/lib/Task.js'
import type { LanguageCode } from 'iso-639-1'
import { DeprecatedLoggerEnv, ExpressConfig } from '../Context.js'
import * as EffectToFpts from '../EffectToFpts.js'
import type { Html } from '../html.js'
import * as Preprint from '../preprint.js'
import type { ClubId } from '../types/club-id.js'
import type { FieldId } from '../types/field.js'
import type { PreprintId } from '../types/preprint-id.js'
import type { SubfieldId } from '../types/subfield.js'
import { getRecentPrereviewsFromZenodo } from '../zenodo.js'

import PlainDate = Temporal.PlainDate

export interface RecentPrereview {
  readonly id: number
  readonly club?: ClubId
  readonly reviewers: Array.NonEmptyReadonlyArray<string>
  readonly published: PlainDate
  readonly fields: ReadonlyArray<FieldId>
  readonly subfields: ReadonlyArray<SubfieldId>
  readonly preprint: {
    readonly id: PreprintId
    readonly language: LanguageCode
    readonly title: Html
  }
}

export class Prereviews extends Context.Tag('Prereviews')<
  Prereviews,
  {
    getFiveMostRecent: T.Task<ReadonlyArray<RecentPrereview>>
  }
>() {}

export const layer = Layer.effect(
  Prereviews,
  Effect.gen(function* () {
    const { zenodoApiKey, zenodoUrl } = yield* ExpressConfig
    const fetch = yield* FetchHttpClient.Fetch
    const logger = yield* DeprecatedLoggerEnv
    const getPreprintTitle = yield* pipe(Preprint.GetPreprintTitle, Effect.andThen(EffectToFpts.makeTaskEitherK))

    return {
      getFiveMostRecent: pipe(
        getRecentPrereviewsFromZenodo({ page: 1 }),
        RTE.matchW(Array.empty, ({ recentPrereviews }) => recentPrereviews),
      )({
        fetch,
        getPreprintTitle,
        ...logger,
        zenodoApiKey,
        zenodoUrl,
      }),
    }
  }),
)
