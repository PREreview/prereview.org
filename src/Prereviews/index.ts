import { FetchHttpClient } from '@effect/platform'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Context, Data, Effect, flow, Layer, Match, pipe, Struct } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import { DeprecatedLoggerEnv, ExpressConfig } from '../Context.js'
import * as EffectToFpts from '../EffectToFpts.js'
import * as FptsToEffect from '../FptsToEffect.js'
import type { Html } from '../html.js'
import { getRapidPreviewsFromLegacyPrereview, isLegacyCompatiblePreprint } from '../legacy-prereview.js'
import type { Prereview as PreprintPrereview, RapidPrereview } from '../preprint-reviews-page/index.js'
import * as Preprints from '../Preprints/index.js'
import type { Prereview, PrereviewIsNotFound, PrereviewIsUnavailable, PrereviewWasRemoved } from '../Prereview.js'
import type { RecentPrereviews } from '../reviews-page/index.js'
import type { ClubId } from '../types/club-id.js'
import type { FieldId } from '../types/field.js'
import type { NonEmptyString } from '../types/NonEmptyString.js'
import type { PreprintId } from '../types/preprint-id.js'
import type { ProfileId } from '../types/profile-id.js'
import type { SubfieldId } from '../types/subfield.js'
import type { User } from '../user.js'
import {
  getPrereviewFromZenodo,
  getPrereviewsForClubFromZenodo,
  getPrereviewsForPreprintFromZenodo,
  getPrereviewsForProfileFromZenodo,
  getPrereviewsForUserFromZenodo,
  getRecentPrereviewsFromZenodo,
} from '../zenodo.js'

import PlainDate = Temporal.PlainDate

export interface RecentPrereview {
  readonly id: number
  readonly club?: ClubId
  readonly reviewers: {
    readonly named: Array.NonEmptyReadonlyArray<string>
    readonly anonymous: number
  }
  readonly published: PlainDate
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
    const { legacyPrereviewApi, wasPrereviewRemoved, zenodoApiKey, zenodoUrl } = yield* ExpressConfig
    const fetch = yield* FetchHttpClient.Fetch
    const logger = yield* DeprecatedLoggerEnv
    const getPreprintTitle = yield* EffectToFpts.makeTaskEitherK(Preprints.getPreprintTitle)
    const getPreprint = yield* EffectToFpts.makeTaskEitherK(Preprints.getPreprint)

    return {
      getFiveMostRecent: pipe(
        FptsToEffect.readerTaskEither(getRecentPrereviewsFromZenodo({ page: 1 }), {
          fetch,
          getPreprintTitle,
          ...logger,
          zenodoApiKey,
          zenodoUrl,
        }),
        Effect.map(Struct.get('recentPrereviews')),
        Effect.orElseSucceed(Array.empty),
      ),
      getForClub: id =>
        pipe(
          FptsToEffect.readerTaskEither(getPrereviewsForClubFromZenodo(id), {
            fetch,
            getPreprintTitle,
            zenodoApiKey,
            zenodoUrl,
            ...logger,
          }),
          Effect.mapError(() => new PrereviewsAreUnavailable()),
        ),
      getForPreprint: id =>
        pipe(
          FptsToEffect.readerTaskEither(getPrereviewsForPreprintFromZenodo(id), {
            fetch,
            zenodoApiKey,
            zenodoUrl,
            ...logger,
          }),
          Effect.mapError(() => new PrereviewsAreUnavailable()),
        ),
      getForProfile: profile =>
        pipe(
          FptsToEffect.readerTaskEither(getPrereviewsForProfileFromZenodo(profile), {
            fetch,
            getPreprintTitle,
            zenodoApiKey,
            zenodoUrl,
            ...logger,
          }),
          Effect.mapError(() => new PrereviewsAreUnavailable()),
        ),
      getForUser: user =>
        pipe(
          FptsToEffect.readerTaskEither(getPrereviewsForUserFromZenodo(user), {
            fetch,
            getPreprintTitle,
            zenodoApiKey,
            zenodoUrl,
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
              legacyPrereviewApi,
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
          zenodoApiKey,
          zenodoUrl,
          ...logger,
        }),
      search: args =>
        pipe(
          FptsToEffect.readerTaskEither(getRecentPrereviewsFromZenodo(args), {
            fetch,
            getPreprintTitle,
            ...logger,
            zenodoApiKey,
            zenodoUrl,
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
