import { Effect, Option, Struct } from 'effect'
import { Clubs } from '../../../Clubs/index.ts'
import * as Datasets from '../../../Datasets/index.ts'
import { Prereviewers } from '../../../Prereviewers/index.ts'
import type { PublishedReview } from '../GetPublishedReview.ts'
import { PublishedDatasetReview } from './Types.ts'

export const Enrich = Effect.fn('DatasetReviews.getPublishedDatasetReview.Enrich')(function* (
  publishedReview: PublishedReview,
) {
  const { author, otherAuthors, dataset, club } = yield* Effect.all(
    {
      author: Prereviewers.getPersona(publishedReview.author),
      otherAuthors: Effect.forEach(publishedReview.otherAuthors ?? [], Prereviewers.getPersona, {
        concurrency: 'unbounded',
      }),
      dataset: Datasets.getDataset(publishedReview.dataset),
      club: Effect.transposeOption(Option.map(publishedReview.clubId, Clubs.getClubName)),
    },
    { concurrency: 'unbounded' },
  )

  return new PublishedDatasetReview({
    ...Struct.omit(publishedReview, ['clubId']),
    author,
    otherAuthors,
    anonymousAuthors: publishedReview.anonymousAuthors ?? 0,
    club,
    dataset,
  })
})
