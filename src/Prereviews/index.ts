import { FetchHttpClient } from '@effect/platform'
import { Array, Context, Effect, flow, Layer, Match, Option, pipe, Redacted, Scope, Struct } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import { Clubs } from '../Clubs/index.ts'
import * as DatasetReviews from '../DatasetReviews/index.ts'
import * as Datasets from '../Datasets/index.ts'
import { MakeDeprecatedLoggerEnv } from '../DeprecatedServices.ts'
import { Zenodo } from '../ExternalApis/index.ts'
import { ZenodoRecords } from '../ExternalInteractions/index.ts'
import type { PreprintId } from '../Preprints/index.ts'
import * as Preprints from '../Preprints/index.ts'
import * as Prereviewers from '../Prereviewers/index.ts'
import { PublicUrl } from '../public-url.ts'
import { EffectToFpts, FptsToEffect } from '../RefactoringUtilities/index.ts'
import type { FieldId } from '../types/field.ts'
import type { OrcidId, Uuid } from '../types/index.ts'
import type { NonEmptyString } from '../types/NonEmptyString.ts'
import type { ProfileId } from '../types/profile-id.ts'
import {
  type PreprintPrereview,
  type Prereview,
  type PrereviewIsNotFound,
  type PrereviewIsUnavailable,
  PrereviewsAreUnavailable,
  PrereviewsPageNotFound,
  type PrereviewWasRemoved,
  RecentDatasetPrereview,
  type RecentPreprintPrereview,
  type RecentPrereviews,
} from './Prereview.ts'

export * from './Prereview.ts'

export class Prereviews extends Context.Tag('Prereviews')<
  Prereviews,
  {
    getFiveMostRecent: Effect.Effect<ReadonlyArray<RecentPreprintPrereview | RecentDatasetPrereview>>
    getForClub: (
      id: Uuid.Uuid,
    ) => Effect.Effect<ReadonlyArray<RecentPreprintPrereview | RecentDatasetPrereview>, PrereviewsAreUnavailable>
    getForPreprint: (id: PreprintId) => Effect.Effect<ReadonlyArray<PreprintPrereview>, PrereviewsAreUnavailable>
    getForProfile: (
      profile: ProfileId,
    ) => Effect.Effect<ReadonlyArray<RecentPreprintPrereview | RecentDatasetPrereview>, PrereviewsAreUnavailable>
    getForUser: (
      user: OrcidId.OrcidId,
    ) => Effect.Effect<ReadonlyArray<RecentPreprintPrereview | RecentDatasetPrereview>, PrereviewsAreUnavailable>
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

export const { getForClub, getForPreprint, getForProfile, getForUser, getPrereview, search } =
  Effect.serviceFunctions(Prereviews)

export const layer = Layer.effect(
  Prereviews,
  Effect.gen(function* () {
    const context = yield* Effect.andThen(
      Effect.context<Clubs | DatasetReviews.DatasetReviewQueries | Datasets.Datasets | Prereviewers.Prereviewers>(),
      Context.omit(Scope.Scope),
    )
    const clubs = yield* Clubs
    const wasPrereviewRemoved = yield* WasPrereviewRemoved
    const fetch = yield* FetchHttpClient.Fetch
    const getPreprintTitle = yield* EffectToFpts.makeTaskEitherK(Preprints.getPreprintTitle)
    const getPreprint = yield* EffectToFpts.makeTaskEitherK(Preprints.getPreprint)
    const publicUrl = yield* PublicUrl
    const zenodoApi = yield* Zenodo.ZenodoApi

    const getClubByName = yield* EffectToFpts.makeTaskK(
      flow(
        clubs.getClubByName,
        Effect.map(Option.some),
        Effect.catchTag('ClubNotFound', () => Effect.succeedNone),
      ),
    )

    return {
      getFiveMostRecent: Effect.gen(function* () {
        const loggerEnv = yield* MakeDeprecatedLoggerEnv

        return yield* pipe(
          FptsToEffect.readerTaskEither(ZenodoRecords.getRecentPrereviewsFromZenodo({ page: 1 }), {
            fetch,
            getClubByName,
            getPreprintTitle,
            ...loggerEnv,
            publicUrl,
            zenodoApiKey: Redacted.value(zenodoApi.key),
            zenodoUrl: zenodoApi.origin,
          }),
          Effect.map(Struct.get('recentPrereviews')),
          Effect.andThen(
            flow(
              Array.map(
                flow(
                  Match.value,
                  Match.tag('RecentPreprintPrereview', prereview => Effect.succeed(prereview)),
                  Match.tag('DatasetReview', ({ id }) => getRecentDatasetPrereview(id)),
                  Match.exhaustive,
                ),
              ),
              effects => Effect.allSuccesses(effects, { concurrency: 'inherit' }),
            ),
          ),
          Effect.orElseSucceed(Array.empty),
          Effect.provide(context),
          Effect.withSpan('Prereviews.getFiveMostRecent'),
        )
      }),
      getForClub: Effect.fn('Prereviews.getForClub')(
        function* (id) {
          yield* Effect.annotateCurrentSpan({ id })

          const loggerEnv = yield* MakeDeprecatedLoggerEnv

          const club = yield* clubs.getClubDetails(id)

          return yield* FptsToEffect.readerTaskEither(ZenodoRecords.getPrereviewsForClubFromZenodo(club), {
            fetch,
            getClubByName,
            getPreprintTitle,
            publicUrl,
            zenodoApiKey: Redacted.value(zenodoApi.key),
            zenodoUrl: zenodoApi.origin,
            ...loggerEnv,
          })
        },
        Effect.andThen(
          Effect.forEach(
            Match.valueTags({
              RecentPreprintPrereview: prereview => Effect.succeed(prereview),
              DatasetReview: ({ id }) => getRecentDatasetPrereview(id),
            }),
            { concurrency: 'inherit' },
          ),
        ),
        Effect.catchTag('ClubNotFound', () => Effect.succeed([])),
        Effect.mapError(() => new PrereviewsAreUnavailable()),
        Effect.provide(context),
      ),
      getForPreprint: Effect.fn('Prereviews.getForPreprint')(
        function* (id) {
          yield* Effect.annotateCurrentSpan({ id })

          const loggerEnv = yield* MakeDeprecatedLoggerEnv

          return yield* FptsToEffect.readerTaskEither(ZenodoRecords.getPrereviewsForPreprintFromZenodo(id), {
            fetch,
            getClubByName,
            zenodoApiKey: Redacted.value(zenodoApi.key),
            zenodoUrl: zenodoApi.origin,
            ...loggerEnv,
          })
        },
        Effect.mapError(() => new PrereviewsAreUnavailable()),
      ),
      getForProfile: Effect.fn('Prereviews.getForProfile')(
        function* (profile) {
          yield* Effect.annotateCurrentSpan({ profile })

          const loggerEnv = yield* MakeDeprecatedLoggerEnv

          return yield* FptsToEffect.readerTaskEither(ZenodoRecords.getPrereviewsForProfileFromZenodo(profile), {
            fetch,
            getClubByName,
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
      getForUser: Effect.fn('Prereviews.getForUser')(
        function* (user) {
          yield* Effect.annotateCurrentSpan({ user })

          const loggerEnv = yield* MakeDeprecatedLoggerEnv

          const { pseudonym } = yield* Prereviewers.getPseudonymPersona(user)

          return yield* FptsToEffect.readerTaskEither(
            ZenodoRecords.getPrereviewsForUserFromZenodo({ orcidId: user, pseudonym }),
            {
              fetch,
              getClubByName,
              getPreprintTitle,
              publicUrl,
              zenodoApiKey: Redacted.value(zenodoApi.key),
              zenodoUrl: zenodoApi.origin,
              ...loggerEnv,
            },
          )
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
      getPrereview: Effect.fn('Prereviews.getPrereview')(function* (id) {
        yield* Effect.annotateCurrentSpan({ id })

        const loggerEnv = yield* MakeDeprecatedLoggerEnv

        return yield* FptsToEffect.readerTaskEither(ZenodoRecords.getPrereviewFromZenodo(id), {
          fetch,
          getClubByName,
          getPreprint,
          wasPrereviewRemoved,
          zenodoApiKey: Redacted.value(zenodoApi.key),
          zenodoUrl: zenodoApi.origin,
          ...loggerEnv,
        })
      }),
      search: Effect.fn('Prereviews.search')(
        function* (args) {
          yield* Effect.annotateCurrentSpan({ args })

          const loggerEnv = yield* MakeDeprecatedLoggerEnv

          return yield* FptsToEffect.readerTaskEither(ZenodoRecords.getRecentPrereviewsFromZenodo(args), {
            fetch,
            getClubByName,
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
  const clubs = yield* Clubs

  const datasetReview = yield* DatasetReviews.getPublishedReview(id)

  const { author, otherAuthors, dataset, club } = yield* Effect.all(
    {
      author: Prereviewers.getPersona(datasetReview.author),
      otherAuthors: Effect.forEach(datasetReview.otherAuthors ?? [], Prereviewers.getPersona, {
        concurrency: 'inherit',
      }),
      dataset: Datasets.getDatasetTitle(datasetReview.dataset),
      club: Effect.transposeOption(Option.map(datasetReview.clubId, clubs.getClubName)),
    },
    { concurrency: 'inherit' },
  )

  return new RecentDatasetPrereview({
    author,
    otherAuthors,
    anonymousAuthors: datasetReview.anonymousAuthors ?? 0,
    club: Option.getOrUndefined(club),
    dataset,
    doi: datasetReview.doi,
    id: datasetReview.id,
    published: datasetReview.published,
  })
})
