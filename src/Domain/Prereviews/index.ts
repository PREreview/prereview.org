import { Context, Effect, Layer } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import type { FieldId } from '../../types/field.ts'
import type { OrcidId, Uuid } from '../../types/index.ts'
import type { NonEmptyString } from '../../types/NonEmptyString.ts'
import type { ProfileId } from '../../types/profile-id.ts'
import { GetFiveMostRecentPrereviews } from './GetFiveMostRecentPrereviews/index.ts'
import { GetPrereviewsForClub } from './GetPrereviewsForClub/index.ts'
import { GetPrereviewsForPrereviewer } from './GetPrereviewsForPrereviewer/index.ts'
import { GetPrereviewsForProfile } from './GetPrereviewsForProfile/index.ts'
import { GetPrereviewSummary } from './GetPrereviewSummary/index.ts'
import type {
  PrereviewIsNotFound,
  PrereviewIsUnavailable,
  PrereviewsAreUnavailable,
  PrereviewsPageNotFound,
  PrereviewWasRemoved,
  RecentDatasetPrereview,
  RecentPreprintPrereview,
  RecentPrereviews,
} from './Prereview.ts'
import { SearchPrereviews } from './SearchPrereviews/index.ts'

export * from './Prereview.ts'

export class Prereviews extends Context.Service<
  Prereviews,
  {
    getFiveMostRecent: Effect.Effect<ReadonlyArray<RecentPreprintPrereview | RecentDatasetPrereview>>
    getForClub: (
      id: Uuid.Uuid,
    ) => Effect.Effect<ReadonlyArray<RecentPreprintPrereview | RecentDatasetPrereview>, PrereviewsAreUnavailable>
    getForProfile: (
      profile: ProfileId,
    ) => Effect.Effect<ReadonlyArray<RecentPreprintPrereview | RecentDatasetPrereview>, PrereviewsAreUnavailable>
    getForUser: (
      user: OrcidId.OrcidId,
    ) => Effect.Effect<ReadonlyArray<RecentPreprintPrereview | RecentDatasetPrereview>, PrereviewsAreUnavailable>
    getPrereviewSummary: (
      id: number | Uuid.Uuid,
    ) => Effect.Effect<
      RecentPreprintPrereview | RecentDatasetPrereview,
      PrereviewIsNotFound | PrereviewIsUnavailable | PrereviewWasRemoved
    >
    search: (args: {
      field?: FieldId
      language?: LanguageCode
      page: number
      query?: NonEmptyString
    }) => Effect.Effect<RecentPrereviews, PrereviewsAreUnavailable | PrereviewsPageNotFound>
  }
>()('Prereviews') {}

export const getFiveMostRecent = Prereviews.use(service => service.getFiveMostRecent)

export const getForClub = (...args: Parameters<(typeof Prereviews.Service)['getForClub']>) =>
  Prereviews.use(service => service.getForClub(...args))

export const getForProfile = (...args: Parameters<(typeof Prereviews.Service)['getForProfile']>) =>
  Prereviews.use(service => service.getForProfile(...args))

export const getForUser = (...args: Parameters<(typeof Prereviews.Service)['getForUser']>) =>
  Prereviews.use(service => service.getForUser(...args))

export const getPrereviewSummary = (...args: Parameters<(typeof Prereviews.Service)['getPrereviewSummary']>) =>
  Prereviews.use(service => service.getPrereviewSummary(...args))

export const search = (...args: Parameters<(typeof Prereviews.Service)['search']>) =>
  Prereviews.use(service => service.search(...args))

export const layer = Layer.effect(
  Prereviews,
  Effect.gen(function* () {
    const getFiveMostRecent = yield* GetFiveMostRecentPrereviews
    const getPrereviewSummary = yield* GetPrereviewSummary
    const getPrereviewsForClub = yield* GetPrereviewsForClub
    const getPrereviewsForPrereviewer = yield* GetPrereviewsForPrereviewer
    const getPrereviewsForProfile = yield* GetPrereviewsForProfile
    const searchPrereviews = yield* SearchPrereviews

    return {
      getFiveMostRecent,
      getForClub: getPrereviewsForClub,
      getForProfile: getPrereviewsForProfile,
      getForUser: getPrereviewsForPrereviewer,
      getPrereviewSummary,
      search: searchPrereviews,
    }
  }),
)
