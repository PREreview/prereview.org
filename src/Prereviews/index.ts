import { FetchHttpClient } from '@effect/platform'
import { Array, Context, Effect, Exit, flow, Layer, Match, Option, pipe, Redacted, Scope, Struct } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import { Clubs } from '../Clubs/index.ts'
import * as DatasetReviews from '../DatasetReviews/index.ts'
import * as Datasets from '../Datasets/index.ts'
import { MakeDeprecatedLoggerEnv } from '../DeprecatedServices.ts'
import { Zenodo } from '../ExternalApis/index.ts'
import { ZenodoRecords } from '../ExternalInteractions/index.ts'
import type { PreprintId, Preprints } from '../Preprints/index.ts'
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

export const getFiveMostRecent = Effect.flatMap(Prereviews, service => service.getFiveMostRecent)

export const getForClub = (...args: Parameters<(typeof Prereviews.Service)['getForClub']>) =>
  Effect.flatMap(Prereviews, service => service.getForClub(...args))

export const getForPreprint = (...args: Parameters<(typeof Prereviews.Service)['getForPreprint']>) =>
  Effect.flatMap(Prereviews, service => service.getForPreprint(...args))

export const getForProfile = (...args: Parameters<(typeof Prereviews.Service)['getForProfile']>) =>
  Effect.flatMap(Prereviews, service => service.getForProfile(...args))

export const getForUser = (...args: Parameters<(typeof Prereviews.Service)['getForUser']>) =>
  Effect.flatMap(Prereviews, service => service.getForUser(...args))

export const getPrereview = (...args: Parameters<(typeof Prereviews.Service)['getPrereview']>) =>
  Effect.flatMap(Prereviews, service => service.getPrereview(...args))

export const search = (...args: Parameters<(typeof Prereviews.Service)['search']>) =>
  Effect.flatMap(Prereviews, service => service.search(...args))

export const layer = Layer.effect(
  Prereviews,
  Effect.gen(function* () {
    const context = yield* Effect.map(
      Effect.context<
        Clubs | DatasetReviews.DatasetReviewQueries | Datasets.Datasets | Prereviewers.Prereviewers | Preprints
      >(),
      Context.omit(Scope.Scope),
    )
    const clubs = yield* Clubs
    const wasPrereviewRemoved = yield* WasPrereviewRemoved
    const fetch = yield* FetchHttpClient.Fetch
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

        const runtime = yield* Effect.runtime<Preprints>()

        return yield* pipe(
          FptsToEffect.readerTaskEither(ZenodoRecords.getRecentPrereviewsFromZenodo({ page: 1 }), {
            fetch,
            getClubByName,
            ...loggerEnv,
            publicUrl,
            runtime,
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
              effects =>
                Effect.map(
                  Effect.all(Array.map(effects, Effect.exit), { concurrency: 'unbounded' }),
                  Array.flatMap(exit => (Exit.isSuccess(exit) ? [exit.value] : [])),
                ),
            ),
          ),
          Effect.orElseSucceed(Array.empty),
          Effect.withSpan('Prereviews.getFiveMostRecent'),
        )
      }).pipe(Effect.provide(context)),
      getForClub: Effect.fn('Prereviews.getForClub')(
        function* (id) {
          yield* Effect.annotateCurrentSpan({ id })

          const loggerEnv = yield* MakeDeprecatedLoggerEnv

          const club = yield* clubs.getClubDetails(id)

          const runtime = yield* Effect.runtime<Preprints>()

          return yield* FptsToEffect.readerTaskEither(ZenodoRecords.getPrereviewsForClubFromZenodo(club), {
            fetch,
            getClubByName,
            publicUrl,
            runtime,
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
            { concurrency: 'unbounded' },
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

          const runtime = yield* Effect.runtime<Preprints>()

          return yield* FptsToEffect.readerTaskEither(ZenodoRecords.getPrereviewsForProfileFromZenodo(profile), {
            fetch,
            getClubByName,
            publicUrl,
            runtime,
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
            { concurrency: 'unbounded' },
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

          const runtime = yield* Effect.runtime<Preprints>()

          return yield* FptsToEffect.readerTaskEither(
            ZenodoRecords.getPrereviewsForUserFromZenodo({ orcidId: user, pseudonym }),
            {
              fetch,
              getClubByName,
              publicUrl,
              runtime,
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
            { concurrency: 'unbounded' },
          ),
        ),
        Effect.mapError(() => new PrereviewsAreUnavailable()),
        Effect.provide(context),
      ),
      getPrereview: Effect.fn('Prereviews.getPrereview')(function* (id) {
        yield* Effect.annotateCurrentSpan({ id })

        const loggerEnv = yield* MakeDeprecatedLoggerEnv

        const runtime = yield* Effect.runtime<Preprints>()

        return yield* FptsToEffect.readerTaskEither(ZenodoRecords.getPrereviewFromZenodo(id), {
          fetch,
          getClubByName,
          runtime,
          wasPrereviewRemoved,
          zenodoApiKey: Redacted.value(zenodoApi.key),
          zenodoUrl: zenodoApi.origin,
          ...loggerEnv,
        })
      }, Effect.provide(context)),
      search: Effect.fn('Prereviews.search')(
        function* (args) {
          yield* Effect.annotateCurrentSpan({ args })

          const loggerEnv = yield* MakeDeprecatedLoggerEnv

          const runtime = yield* Effect.runtime<Preprints>()

          return yield* FptsToEffect.readerTaskEither(ZenodoRecords.getRecentPrereviewsFromZenodo(args), {
            fetch,
            getClubByName,
            ...loggerEnv,
            publicUrl,
            runtime,
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
                { concurrency: 'unbounded' },
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
        concurrency: 'unbounded',
      }),
      dataset: Datasets.getDatasetTitle(datasetReview.dataset),
      club: Effect.transposeOption(Option.map(datasetReview.clubId, clubs.getClubName)),
    },
    { concurrency: 'unbounded' },
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
