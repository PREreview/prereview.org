import { Array, Context, Effect, flow, Option, pipe, Result, Scope, Struct } from 'effect'
import * as Queries from '../../../Queries.ts'
import type * as StatefulQueries from '../../../StatefulQueries.ts'
import * as ProfileId from '../../../types/profile-id.ts'
import { getTopicField, getTopicSubfield } from '../../../types/Topic.ts'
import { DatasetReviewQueries } from '../../DatasetReviews/index.ts'
import * as Datasets from '../../Datasets/index.ts'
import {
  getPreprintReview,
  type PreprintReviews,
  type Prereview,
  WasPrereviewRemoved,
} from '../../PreprintReviews/index.ts'
import { Prereviewers } from '../../Prereviewers/index.ts'
import { RecentDatasetPrereview, RecentPreprintPrereview } from '../Prereview.ts'
import { type Input, ListProfilePrereviewIds, ProfilePrereviewId } from './ListProfilePrereviewIds.ts'
import { PrereviewsAreUnavailable } from './Types.ts'

export type GetPrereviewsForProfile = (
  profile: ProfileId.ProfileId,
) => Effect.Effect<ReadonlyArray<RecentPreprintPrereview | RecentDatasetPrereview>, PrereviewsAreUnavailable>

export const GetPrereviewsForProfile: Effect.Effect<
  GetPrereviewsForProfile,
  never,
  DatasetReviewQueries | StatefulQueries.StatefulQueries | PreprintReviews | Prereviewers | WasPrereviewRemoved
> = Effect.gen(function* () {
  const context = yield* Effect.map(
    Effect.context<DatasetReviewQueries | PreprintReviews | Prereviewers>(),
    Context.omit(Scope.Scope),
  )
  const wasPrereviewRemoved = yield* WasPrereviewRemoved
  const listProfilePrereviewIds = yield* Queries.makeStatefulQuery(ListProfilePrereviewIds(wasPrereviewRemoved))

  return (profile: ProfileId.ProfileId) =>
    pipe(
      toInput(profile),
      Effect.andThen(
        Option.match({
          onNone: () => Effect.succeed(Array.empty()),
          onSome: listProfilePrereviewIds,
        }),
      ),
      Effect.andThen(
        Effect.forEach(
          ProfilePrereviewId.$match({
            PreprintReview: ({ id }) => getRecentPreprintPrereview(id),
            DatasetReview: ({ id }) => getRecentDatasetPrereview(id),
          }),
          { concurrency: 'unbounded' },
        ),
      ),
      Effect.catchTag(
        [
          'DatasetReviewHasNotBeenPublished',
          'DatasetReviewIsUnavailable',
          'PrereviewIsNotFound',
          'PrereviewIsUnavailable',
          'PrereviewWasRemoved',
          'UnableToQuery',
          'UnknownDatasetReview',
        ],
        error => new PrereviewsAreUnavailable({ cause: error }),
      ),
      Effect.provideContext(context),
      Effect.withSpan('Prereviews.getPrereviewsForProfile', { attributes: { profile } }),
    )
})

const toInput = ProfileId.match({
  onOrcid: ({ orcid }) => Effect.succeedSome<Input>({ orcidId: orcid, persona: 'public' }),
  onPseudonym: ({ pseudonym }) =>
    pipe(
      Prereviewers.getOrcidIdFromPseudonym(pseudonym),
      Effect.map(
        flow(
          Result.getSuccess,
          Option.map((orcidId): Input => ({ orcidId, persona: 'pseudonym' })),
        ),
      ),
    ),
})

const getRecentPreprintPrereview = flow(
  getPreprintReview,
  Effect.map(
    (prereview: Prereview) =>
      new RecentPreprintPrereview({
        id: prereview.id,
        club: prereview.club,
        reviewers: {
          named: Array.map(prereview.authors.named, Struct.get('name')),
          anonymous: prereview.authors.anonymous,
        },
        published: prereview.published,
        fields: Array.dedupe(Array.map(prereview.topics ?? [], getTopicField)),
        subfields: Array.dedupe(Array.map(prereview.topics ?? [], getTopicSubfield)),
        preprint: {
          id: prereview.preprint.id,
          language: prereview.preprint.language,
          title: prereview.preprint.title,
        },
      }),
  ),
)

const getRecentDatasetPrereview = flow(
  DatasetReviewQueries.getPublishedDatasetReview,
  Effect.map(
    datasetReview =>
      new RecentDatasetPrereview({
        author: datasetReview.author,
        otherAuthors: datasetReview.otherAuthors,
        anonymousAuthors: datasetReview.anonymousAuthors,
        club: Option.getOrUndefined(datasetReview.club),
        dataset: Datasets.DatasetTitle.fromDataset(datasetReview.dataset),
        doi: datasetReview.doi,
        id: datasetReview.id,
        published: datasetReview.published,
      }),
  ),
)
