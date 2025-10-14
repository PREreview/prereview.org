import { FetchHttpClient } from '@effect/platform'
import { Array, Context, Effect, flow, Layer, Match, pipe, Redacted, Struct } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import type { ClubId } from '../Clubs/index.ts'
import { DeprecatedLoggerEnv } from '../Context.ts'
import { AddAnnotationsToLogger } from '../DeprecatedServices.ts'
import * as EffectToFpts from '../EffectToFpts.ts'
import { Zenodo } from '../ExternalApis/index.ts'
import * as FptsToEffect from '../FptsToEffect.ts'
import {
  getRapidPreviewsFromLegacyPrereview,
  isLegacyCompatiblePreprint,
  LegacyPrereviewApi,
} from '../legacy-prereview.ts'
import type { PreprintId } from '../Preprints/index.ts'
import * as Preprints from '../Preprints/index.ts'
import type { Prereview, PrereviewIsNotFound, PrereviewIsUnavailable, PrereviewWasRemoved } from '../Prereview.ts'
import type { RecentPrereviews } from '../reviews-page/index.ts'
import type { FieldId } from '../types/field.ts'
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
  PrereviewsAreUnavailable,
  PrereviewsPageNotFound,
  type RapidPrereview,
  type RecentPrereview,
} from './Prereview.ts'

export * from './Prereview.ts'

export class Prereviews extends Context.Tag('Prereviews')<
  Prereviews,
  {
    getFiveMostRecent: Effect.Effect<ReadonlyArray<RecentPrereview>>
    getForClub: (id: ClubId) => Effect.Effect<ReadonlyArray<RecentPrereview>, PrereviewsAreUnavailable>
    getForPreprint: (id: PreprintId) => Effect.Effect<ReadonlyArray<PreprintPrereview>, PrereviewsAreUnavailable>
    getForProfile: (profile: ProfileId) => Effect.Effect<ReadonlyArray<RecentPrereview>, PrereviewsAreUnavailable>
    getForUser: (user: User) => Effect.Effect<ReadonlyArray<RecentPrereview>, PrereviewsAreUnavailable>
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
    const wasPrereviewRemoved = yield* WasPrereviewRemoved
    const fetch = yield* FetchHttpClient.Fetch
    const legacyPrereviewApi = yield* LegacyPrereviewApi
    const { clock, logger: unannotatedLogger } = yield* DeprecatedLoggerEnv
    const getPreprintTitle = yield* EffectToFpts.makeTaskEitherK(Preprints.getPreprintTitle)
    const getPreprint = yield* EffectToFpts.makeTaskEitherK(Preprints.getPreprint)
    const zenodoApi = yield* Zenodo.ZenodoApi

    return {
      getFiveMostRecent: Effect.gen(function* () {
        const logger = yield* AddAnnotationsToLogger(unannotatedLogger)

        return yield* pipe(
          FptsToEffect.readerTaskEither(getRecentPrereviewsFromZenodo({ page: 1 }), {
            fetch,
            getPreprintTitle,
            clock,
            logger,
            zenodoApiKey: Redacted.value(zenodoApi.key),
            zenodoUrl: zenodoApi.origin,
          }),
          Effect.map(Struct.get('recentPrereviews')),
          Effect.orElseSucceed(Array.empty),
        )
      }),
      getForClub: Effect.fn(
        function* (id) {
          const logger = yield* AddAnnotationsToLogger(unannotatedLogger)

          return yield* FptsToEffect.readerTaskEither(getPrereviewsForClubFromZenodo(id), {
            fetch,
            getPreprintTitle,
            zenodoApiKey: Redacted.value(zenodoApi.key),
            zenodoUrl: zenodoApi.origin,
            clock,
            logger,
          })
        },
        Effect.mapError(() => new PrereviewsAreUnavailable()),
      ),
      getForPreprint: Effect.fn(
        function* (id) {
          const logger = yield* AddAnnotationsToLogger(unannotatedLogger)

          return yield* FptsToEffect.readerTaskEither(getPrereviewsForPreprintFromZenodo(id), {
            fetch,
            zenodoApiKey: Redacted.value(zenodoApi.key),
            zenodoUrl: zenodoApi.origin,
            clock,
            logger,
          })
        },
        Effect.mapError(() => new PrereviewsAreUnavailable()),
      ),
      getForProfile: Effect.fn(
        function* (profile) {
          const logger = yield* AddAnnotationsToLogger(unannotatedLogger)

          return yield* FptsToEffect.readerTaskEither(getPrereviewsForProfileFromZenodo(profile), {
            fetch,
            getPreprintTitle,
            zenodoApiKey: Redacted.value(zenodoApi.key),
            zenodoUrl: zenodoApi.origin,
            clock,
            logger,
          })
        },
        Effect.mapError(() => new PrereviewsAreUnavailable()),
      ),
      getForUser: Effect.fn(
        function* (user) {
          const logger = yield* AddAnnotationsToLogger(unannotatedLogger)

          return yield* FptsToEffect.readerTaskEither(getPrereviewsForUserFromZenodo(user), {
            fetch,
            getPreprintTitle,
            zenodoApiKey: Redacted.value(zenodoApi.key),
            zenodoUrl: zenodoApi.origin,
            clock,
            logger,
          })
        },
        Effect.mapError(() => new PrereviewsAreUnavailable()),
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
        const logger = yield* AddAnnotationsToLogger(unannotatedLogger)

        return yield* FptsToEffect.readerTaskEither(getPrereviewFromZenodo(id), {
          fetch,
          getPreprint,
          wasPrereviewRemoved,
          zenodoApiKey: Redacted.value(zenodoApi.key),
          zenodoUrl: zenodoApi.origin,
          clock,
          logger,
        })
      }),
      search: Effect.fn(
        function* (args) {
          const logger = yield* AddAnnotationsToLogger(unannotatedLogger)

          return yield* FptsToEffect.readerTaskEither(getRecentPrereviewsFromZenodo(args), {
            fetch,
            getPreprintTitle,
            clock,
            logger,
            zenodoApiKey: Redacted.value(zenodoApi.key),
            zenodoUrl: zenodoApi.origin,
          })
        },
        Effect.mapError(
          flow(
            Match.value,
            Match.when('not-found', () => new PrereviewsPageNotFound()),
            Match.when('unavailable', () => new PrereviewsAreUnavailable()),
            Match.exhaustive,
          ),
        ),
      ),
    }
  }),
)
