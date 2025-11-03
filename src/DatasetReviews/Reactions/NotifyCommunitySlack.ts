import { Effect, Struct } from 'effect'
import { Slack } from '../../ExternalApis/index.ts'
import * as Personas from '../../Personas/index.ts'
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
        author: Personas.getPersona(datasetReview.author),
        url: PublicUrl.forRoute(Routes.DatasetReview, { datasetReviewId: datasetReview.id }),
      },
      { concurrency: 'inherit' },
    )

    yield* Slack.chatPostMessage({
      channel: Slack.ChannelId.make('C05V6TXHETS'),
      text: `${displayPersona(author)} has published a PREreview: ${url.href}`,
      unfurlLinks: true,
      unfurlMedia: false,
    })
  },
  Effect.catchAll(error => new Errors.FailedToNotifyCommunitySlack({ cause: error })),
)

const displayPersona = Personas.match({
  onPublic: Struct.get('name'),
  onPseudonym: Struct.get('pseudonym'),
})
