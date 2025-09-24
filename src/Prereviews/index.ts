import { FetchHttpClient } from '@effect/platform'
import type { Temporal } from '@js-temporal/polyfill'
import { Array, Context, Data, Effect, flow, Layer, Match, pipe, Redacted, Struct } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import { DeprecatedLoggerEnv, ExpressConfig } from '../Context.ts'
import * as EffectToFpts from '../EffectToFpts.ts'
import { Zenodo } from '../ExternalApis/index.ts'
import * as FptsToEffect from '../FptsToEffect.ts'
import type { Html } from '../html.ts'
import {
  getRapidPreviewsFromLegacyPrereview,
  isLegacyCompatiblePreprint,
  LegacyPrereviewApi,
} from '../legacy-prereview.ts'
import type { Prereview as PreprintPrereview, RapidPrereview } from '../preprint-reviews-page/index.ts'
import type { PreprintId } from '../Preprints/index.ts'
import * as Preprints from '../Preprints/index.ts'
import type { Prereview, PrereviewIsNotFound, PrereviewIsUnavailable, PrereviewWasRemoved } from '../Prereview.ts'
import type { RecentPrereviews } from '../reviews-page/index.ts'
import type { ClubId } from '../types/club-id.ts'
import type { FieldId } from '../types/field.ts'
import type { NonEmptyString } from '../types/NonEmptyString.ts'
import type { ProfileId } from '../types/profile-id.ts'
import type { SubfieldId } from '../types/subfield.ts'
import type { User } from '../user.ts'
import {
  getPrereviewFromZenodo,
  getPrereviewsForClubFromZenodo,
  getPrereviewsForPreprintFromZenodo,
  getPrereviewsForProfileFromZenodo,
  getPrereviewsForUserFromZenodo,
  getRecentPrereviewsFromZenodo,
} from '../zenodo.ts'

export interface RecentPrereview {
  readonly id: number
  readonly club?: ClubId
  readonly reviewers: {
    readonly named: Array.NonEmptyReadonlyArray<string>
    readonly anonymous: number
  }
  readonly published: Temporal.PlainDate
  readonly fields: ReadonlyArray<FieldId>
  readonly subfields: ReadonlyArray<SubfieldId>
  readonly preprint: {
    readonly id: PreprintId
    readonly language: LanguageCode
    readonly title: Html
  }
}

export class PrereviewsAreUnavailable extends Data.TaggedError('PrereviewsAreUnavailable') {}

export class PrereviewsPageNotFound extends Data.TaggedError('PrereviewsPageNotFound') {}

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
    const { wasPrereviewRemoved } = yield* ExpressConfig
    const fetch = yield* FetchHttpClient.Fetch
    const legacyPrereviewApi = yield* LegacyPrereviewApi
    const logger = yield* DeprecatedLoggerEnv
    const getPreprintTitle = yield* EffectToFpts.makeTaskEitherK(Preprints.getPreprintTitle)
    const getPreprint = yield* EffectToFpts.makeTaskEitherK(Preprints.getPreprint)
    const zenodoApi = yield* Zenodo.ZenodoApi

    return {
      getFiveMostRecent: pipe(
        FptsToEffect.readerTaskEither(getRecentPrereviewsFromZenodo({ page: 1 }), {
          fetch,
          getPreprintTitle,
          ...logger,
          zenodoApiKey: Redacted.value(zenodoApi.key),
          zenodoUrl: zenodoApi.origin,
        }),
        Effect.map(Struct.get('recentPrereviews')),
        Effect.orElseSucceed(Array.empty),
      ),
      getForClub: id =>
        pipe(
          FptsToEffect.readerTaskEither(getPrereviewsForClubFromZenodo(id), {
            fetch,
            getPreprintTitle,
            zenodoApiKey: Redacted.value(zenodoApi.key),
            zenodoUrl: zenodoApi.origin,
            ...logger,
          }),
          Effect.mapError(() => new PrereviewsAreUnavailable()),
        ),
      getForPreprint: id =>
        pipe(
          FptsToEffect.readerTaskEither(getPrereviewsForPreprintFromZenodo(id), {
            fetch,
            zenodoApiKey: Redacted.value(zenodoApi.key),
            zenodoUrl: zenodoApi.origin,
            ...logger,
          }),
          Effect.mapError(() => new PrereviewsAreUnavailable()),
        ),
      getForProfile: profile =>
        pipe(
          FptsToEffect.readerTaskEither(getPrereviewsForProfileFromZenodo(profile), {
            fetch,
            getPreprintTitle,
            zenodoApiKey: Redacted.value(zenodoApi.key),
            zenodoUrl: zenodoApi.origin,
            ...logger,
          }),
          Effect.mapError(() => new PrereviewsAreUnavailable()),
        ),
      getForUser: user =>
        pipe(
          FptsToEffect.readerTaskEither(getPrereviewsForUserFromZenodo(user), {
            fetch,
            getPreprintTitle,
            zenodoApiKey: Redacted.value(zenodoApi.key),
            zenodoUrl: zenodoApi.origin,
            ...logger,
          }),
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
      getPrereview: id =>
        FptsToEffect.readerTaskEither(getPrereviewFromZenodo(id), {
          fetch,
          getPreprint,
          wasPrereviewRemoved,
          zenodoApiKey: Redacted.value(zenodoApi.key),
          zenodoUrl: zenodoApi.origin,
          ...logger,
        }),
      search: args =>
        pipe(
          FptsToEffect.readerTaskEither(getRecentPrereviewsFromZenodo(args), {
            fetch,
            getPreprintTitle,
            ...logger,
            zenodoApiKey: Redacted.value(zenodoApi.key),
            zenodoUrl: zenodoApi.origin,
          }),
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
