import { FetchHttpClient } from '@effect/platform'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Context, Effect, flow, Layer, Match, pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as T from 'fp-ts/lib/Task.js'
import type { LanguageCode } from 'iso-639-1'
import { DeprecatedLoggerEnv, ExpressConfig } from '../Context.js'
import * as EffectToFpts from '../EffectToFpts.js'
import * as FptsToEffect from '../FptsToEffect.js'
import type { Html } from '../html.js'
import * as Preprint from '../preprint.js'
import { Prereview, PrereviewIsNotFound, PrereviewIsUnavailable, PrereviewWasRemoved } from '../Prereview.js'
import type { ClubId } from '../types/club-id.js'
import type { FieldId } from '../types/field.js'
import type { PreprintId } from '../types/preprint-id.js'
import type { SubfieldId } from '../types/subfield.js'
import { getPrereviewFromZenodo, getRecentPrereviewsFromZenodo } from '../zenodo.js'

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
    getPrereview: (
      id: number,
    ) => Effect.Effect<Prereview, PrereviewIsNotFound | PrereviewIsUnavailable | PrereviewWasRemoved>
  }
>() {}

export const layer = Layer.effect(
  Prereviews,
  Effect.gen(function* () {
    const { wasPrereviewRemoved, zenodoApiKey, zenodoUrl } = yield* ExpressConfig
    const fetch = yield* FetchHttpClient.Fetch
    const logger = yield* DeprecatedLoggerEnv
    const getPreprintTitle = yield* pipe(Preprint.GetPreprintTitle, Effect.andThen(EffectToFpts.makeTaskEitherK))
    const getPreprint = yield* pipe(Preprint.GetPreprint, Effect.andThen(EffectToFpts.makeTaskEitherK))

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
      getPrereview: id =>
        pipe(
          FptsToEffect.readerTaskEither(getPrereviewFromZenodo(id), {
            fetch,
            getPreprint,
            wasPrereviewRemoved,
            zenodoApiKey,
            zenodoUrl,
            ...logger,
          }),
          Effect.mapBoth({
            onFailure: flow(
              Match.value,
              Match.when('not-found', () => new PrereviewIsNotFound()),
              Match.when('removed', () => new PrereviewWasRemoved()),
              Match.when('unavailable', () => new PrereviewIsUnavailable()),
              Match.exhaustive,
            ),
            onSuccess: response =>
              new Prereview({
                ...response,
                authors: {
                  ...response.authors,
                  named: FptsToEffect.array(response.authors.named),
                },
                id,
              }),
          }),
        ),
    }
  }),
)
