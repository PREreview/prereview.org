import { Effect, pipe } from 'effect'
import { Slack } from '../../ExternalApis/index.ts'
import * as Personas from '../../Personas/index.ts'
import * as PublicUrl from '../../public-url.ts'
import * as Routes from '../../routes.ts'
import type { Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'
import * as Queries from '../Queries/index.ts'
import { DatasetReviewToChatPostMessageInput } from './DatasetReviewToChatPostMessageInput.ts'

export const NotifyCommunitySlack = Effect.fn(
  function* (datasetReviewId: Uuid.Uuid) {
    const datasetReview = yield* Queries.getPublishedReview(datasetReviewId)

    const { author, url } = yield* Effect.all(
      {
        author: Personas.getPersona(datasetReview.author),
        url: PublicUrl.forRoute(Routes.DatasetReview, { datasetReviewId: datasetReview.id }),
      },
      { concurrency: 'inherit' },
    )

    yield* pipe(DatasetReviewToChatPostMessageInput({ author, url }), Effect.andThen(Slack.chatPostMessage))
  },
  Effect.catchAll(error => new Errors.FailedToNotifyCommunitySlack({ cause: error })),
)
