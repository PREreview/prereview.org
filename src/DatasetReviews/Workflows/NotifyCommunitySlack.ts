import { Effect } from 'effect'
import { CommunitySlack } from '../../ExternalInteractions/index.ts'
import * as Prereviewers from '../../Prereviewers/index.ts'
import * as PublicUrl from '../../public-url.ts'
import * as Routes from '../../routes.ts'
import type { Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'
import * as Queries from '../Queries/index.ts'

export const NotifyCommunitySlack = Effect.fn(
  function* (datasetReviewId: Uuid.Uuid) {
    const datasetReview = yield* Queries.getPublishedReview(datasetReviewId)

    const { author, url } = yield* Effect.all(
      {
        author: Prereviewers.getPersona(datasetReview.author),
        url: PublicUrl.forRoute(Routes.DatasetReview, { datasetReviewId: datasetReview.id }),
      },
      { concurrency: 'inherit' },
    )

    yield* CommunitySlack.shareDatasetReview({
      author,
      otherAuthors: (datasetReview.otherAuthors?.length ?? 0) + (datasetReview.anonymousAuthors ?? 0),
      url,
    })
  },
  Effect.catchAll(error => new Errors.FailedToNotifyCommunitySlack({ cause: error })),
)
