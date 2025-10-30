import { FetchHttpClient } from '@effect/platform'
import { Array, Context, Effect, flow, Layer, Match, pipe, Redacted, Struct } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import type { ClubId } from '../Clubs/index.ts'
import * as DatasetReviews from '../DatasetReviews/index.ts'
import * as Datasets from '../Datasets/index.ts'
import { MakeDeprecatedLoggerEnv } from '../DeprecatedServices.ts'
import * as EffectToFpts from '../EffectToFpts.ts'
import { Zenodo } from '../ExternalApis/index.ts'
import * as FptsToEffect from '../FptsToEffect.ts'
import {
  getRapidPreviewsFromLegacyPrereview,
  isLegacyCompatiblePreprint,
  LegacyPrereviewApi,
} from '../legacy-prereview.ts'
import * as Personas from '../Personas/index.ts'
import type { PreprintId } from '../Preprints/index.ts'
import * as Preprints from '../Preprints/index.ts'
import { PublicUrl } from '../public-url.ts'
import type { FieldId } from '../types/field.ts'
import type { Uuid } from '../types/index.ts'
import type { NonEmptyString } from '../types/NonEmptyString.ts'
import type { ProfileId } from '../types/profile-id.ts'
import type { User } from '../user.ts'
import {
  getPrereviewFromZenodo,
  getPrereviewsForClubFromZenodo,
  getPrereviewsForPreprintFromZenodo,
  getPrereviewsForProfileFromZenodo,
  getPrereviewsForUserFromZenodo,
  getRecentPrereviewsFromZenodo,
} from '../zenodo.ts'
import {
  type PreprintPrereview,
  type Prereview,
  type PrereviewIsNotFound,
  type PrereviewIsUnavailable,
  PrereviewsAreUnavailable,
  PrereviewsPageNotFound,
  type PrereviewWasRemoved,
  type RapidPrereview,
  RecentDatasetPrereview,
  type RecentPreprintPrereview,
  type RecentPrereviews,
} from './Prereview.ts'

export * from './Prereview.ts'

export class Prereviews extends Context.Tag('Prereviews')<
  Prereviews,
  {
    getFiveMostRecent: Effect.Effect<ReadonlyArray<RecentPreprintPrereview | RecentDatasetPrereview>>
    getForClub: (id: ClubId) => Effect.Effect<ReadonlyArray<RecentPreprintPrereview>, PrereviewsAreUnavailable>
    getForPreprint: (id: PreprintId) => Effect.Effect<ReadonlyArray<PreprintPrereview>, PrereviewsAreUnavailable>
    getForProfile: (
      profile: ProfileId,
    ) => Effect.Effect<ReadonlyArray<RecentPreprintPrereview | RecentDatasetPrereview>, PrereviewsAreUnavailable>
    getForUser: (
      user: User,
    ) => Effect.Effect<ReadonlyArray<RecentPreprintPrereview | RecentDatasetPrereview>, PrereviewsAreUnavailable>
    getRapidPrereviewsForPreprint: (
      id: PreprintId,
    ) => Effect.Effect<ReadonlyArray<RapidPrereview>, PrereviewsAreUnavailable>
    getPrereview: (
      id: number,
    ) => Effect.Effect<Prereview, PrereviewIsNotFound | PrereviewIsUnavailable | PrereviewWasRemoved>
    search: (args: {
      field?: FieldId
      language?: LanguageCode
      page: number
      query?: NonEmptyString
    }) => Effect.Effect<RecentPrereviews, PrereviewsAreUnavailable | PrereviewsPageNotFound>
  }
>() {}

export class WasPrereviewRemoved extends Context.Tag('WasPrereviewRemoved')<
  WasPrereviewRemoved,
  (id: number) => boolean
>() {}

export const { getFiveMostRecent } = Effect.serviceConstants(Prereviews)

export const {
  getForClub,
  getForPreprint,
  getForProfile,
  getForUser,
  getRapidPrereviewsForPreprint,
  getPrereview,
  search,
} = Effect.serviceFunctions(Prereviews)

export const layer = Layer.effect(
  Prereviews,
  Effect.gen(function* () {
    const context = yield* Effect.context<DatasetReviews.DatasetReviewQueries | Datasets.Datasets | Personas.Personas>()
    const wasPrereviewRemoved = yield* WasPrereviewRemoved
    const fetch = yield* FetchHttpClient.Fetch
    const legacyPrereviewApi = yield* LegacyPrereviewApi
    const getPreprintTitle = yield* EffectToFpts.makeTaskEitherK(Preprints.getPreprintTitle)
    const getPreprint = yield* EffectToFpts.makeTaskEitherK(Preprints.getPreprint)
    const publicUrl = yield* PublicUrl
    const zenodoApi = yield* Zenodo.ZenodoApi

    return {
      getFiveMostRecent: Effect.gen(function* () {
        const loggerEnv = yield* MakeDeprecatedLoggerEnv

        return yield* pipe(
          FptsToEffect.readerTaskEither(getRecentPrereviewsFromZenodo({ page: 1 }), {
            fetch,
            getPreprintTitle,
            ...loggerEnv,
            publicUrl,
            zenodoApiKey: Redacted.value(zenodoApi.key),
            zenodoUrl: zenodoApi.origin,
          }),
          Effect.map(Struct.get('recentPrereviews')),
          Effect.andThen(
            Effect.forEach(
              flow(
                Match.value,
                Match.tag('RecentPreprintPrereview', prereview => Effect.succeed(prereview)),
                Match.tag('DatasetReview', ({ id }) => getRecentDatasetPrereview(id)),
                Match.exhaustive,
              ),
              { concurrency: 'inherit' },
            ),
          ),
          Effect.orElseSucceed(Array.empty),
          Effect.provide(context),
        )
      }),
      getForClub: Effect.fn(
        function* (id) {
          const loggerEnv = yield* MakeDeprecatedLoggerEnv

          return yield* FptsToEffect.readerTaskEither(getPrereviewsForClubFromZenodo(id), {
            fetch,
            getPreprintTitle,
            zenodoApiKey: Redacted.value(zenodoApi.key),
            zenodoUrl: zenodoApi.origin,
            ...loggerEnv,
          })
        },
        Effect.mapError(() => new PrereviewsAreUnavailable()),
      ),
      getForPreprint: Effect.fn(
        function* (id) {
          const loggerEnv = yield* MakeDeprecatedLoggerEnv

          return yield* FptsToEffect.readerTaskEither(getPrereviewsForPreprintFromZenodo(id), {
            fetch,
            zenodoApiKey: Redacted.value(zenodoApi.key),
            zenodoUrl: zenodoApi.origin,
            ...loggerEnv,
          })
        },
        Effect.mapError(() => new PrereviewsAreUnavailable()),
      ),
      getForProfile: Effect.fn(
        function* (profile) {
          const loggerEnv = yield* MakeDeprecatedLoggerEnv

          return yield* FptsToEffect.readerTaskEither(getPrereviewsForProfileFromZenodo(profile), {
            fetch,
            getPreprintTitle,
            publicUrl,
            zenodoApiKey: Redacted.value(zenodoApi.key),
            zenodoUrl: zenodoApi.origin,
            ...loggerEnv,
          })
        },
        Effect.andThen(
          Effect.forEach(
            flow(
              Match.value,
              Match.tag('RecentPreprintPrereview', prereview => Effect.succeed(prereview)),
              Match.tag('DatasetReview', ({ id }) => getRecentDatasetPrereview(id)),
              Match.exhaustive,
            ),
            { concurrency: 'inherit' },
          ),
        ),
        Effect.mapError(() => new PrereviewsAreUnavailable()),
        Effect.provide(context),
      ),
      getForUser: Effect.fn(
        function* (user) {
          const loggerEnv = yield* MakeDeprecatedLoggerEnv

          return yield* FptsToEffect.readerTaskEither(getPrereviewsForUserFromZenodo(user), {
            fetch,
            getPreprintTitle,
            publicUrl,
            zenodoApiKey: Redacted.value(zenodoApi.key),
            zenodoUrl: zenodoApi.origin,
            ...loggerEnv,
          })
        },
        Effect.andThen(
          Effect.forEach(
            flow(
              Match.value,
              Match.tag('RecentPreprintPrereview', prereview => Effect.succeed(prereview)),
              Match.tag('DatasetReview', ({ id }) => getRecentDatasetPrereview(id)),
              Match.exhaustive,
            ),
            { concurrency: 'inherit' },
          ),
        ),
        Effect.mapError(() => new PrereviewsAreUnavailable()),
        Effect.provide(context),
      ),
      getRapidPrereviewsForPreprint: id =>
        pipe(
          Effect.succeed(id),
          Effect.filterOrFail(isLegacyCompatiblePreprint, () => 'not-compatible' as const),
          Effect.andThen(id =>
            FptsToEffect.readerTaskEither(getRapidPreviewsFromLegacyPrereview(id), {
              fetch,
              legacyPrereviewApi: {
                app: legacyPrereviewApi.app,
                key: Redacted.value(legacyPrereviewApi.key),
                url: legacyPrereviewApi.origin,
                update: legacyPrereviewApi.update,
              },
            }),
          ),
          Effect.catchAll(
            flow(
              Match.value,
              Match.when('not-compatible', () => Effect.sync(Array.empty)),
              Match.when('unavailable', () => new PrereviewsAreUnavailable()),
              Match.exhaustive,
            ),
          ),
        ),
      getPrereview: Effect.fn(function* (id) {
        const loggerEnv = yield* MakeDeprecatedLoggerEnv

        return yield* FptsToEffect.readerTaskEither(getPrereviewFromZenodo(id), {
          fetch,
          getPreprint,
          wasPrereviewRemoved,
          zenodoApiKey: Redacted.value(zenodoApi.key),
          zenodoUrl: zenodoApi.origin,
          ...loggerEnv,
        })
      }),
      search: Effect.fn(
        function* (args) {
          const loggerEnv = yield* MakeDeprecatedLoggerEnv

          return yield* FptsToEffect.readerTaskEither(getRecentPrereviewsFromZenodo(args), {
            fetch,
            getPreprintTitle,
            ...loggerEnv,
            publicUrl,
            zenodoApiKey: Redacted.value(zenodoApi.key),
            zenodoUrl: zenodoApi.origin,
          })
        },
        Effect.andThen(({ recentPrereviews, ...results }) =>
          pipe(
            Effect.succeed(results),
            Effect.bind('recentPrereviews', () =>
              Effect.forEach(
                recentPrereviews,
                flow(
                  Match.value,
                  Match.tag('RecentPreprintPrereview', prereview => Effect.succeed(prereview)),
                  Match.tag('DatasetReview', ({ id }) =>
                    Effect.mapError(getRecentDatasetPrereview(id), () => 'unavailable' as const),
                  ),
                  Match.exhaustive,
                ),
                { concurrency: 'inherit' },
              ),
            ),
          ),
        ),
        Effect.mapError(
          flow(
            Match.value,
            Match.when('not-found', () => new PrereviewsPageNotFound()),
            Match.when('unavailable', () => new PrereviewsAreUnavailable()),
            Match.exhaustive,
          ),
        ),
        Effect.provide(context),
      ),
    }
  }),
)

const getRecentDatasetPrereview = Effect.fn(function* (id: Uuid.Uuid) {
  const datasetReview = yield* DatasetReviews.getPublishedReview(id)

  const { author, dataset } = yield* Effect.all(
    {
      author: Personas.getPersona(datasetReview.author),
      dataset: Datasets.getDatasetTitle(datasetReview.dataset),
    },
    { concurrency: 'inherit' },
  )

  return new RecentDatasetPrereview({
    author,
    dataset,
    doi: datasetReview.doi,
    id: datasetReview.id,
    published: datasetReview.published,
  })
})
