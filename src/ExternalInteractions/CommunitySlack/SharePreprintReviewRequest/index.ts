import { Data, Effect, Exit, pipe } from 'effect'
import { Slack } from '../../../ExternalApis/index.ts'
import { requestAReviewChannelId } from '../ChannelIds.ts'
import { GenerateThread, type PreprintReviewRequest } from './GenerateThread.ts'
import { PreprintReviewRequestToChatPostMessageInputs } from './PreprintReviewRequestToChatPostMessageInputs.ts'

export type { PreprintReviewRequest } from './GenerateThread.ts'

export class FailedToSharePreprintReviewRequest extends Data.TaggedError('FailedToSharePreprintReviewRequest')<{
  cause?: unknown
}> {}

export const SharePreprintReviewRequest = Effect.fn(
  function* (reviewRequest: PreprintReviewRequest) {
    const [post, ...replies] = yield* pipe(
      Effect.succeed(reviewRequest),
      Effect.bind('thread', GenerateThread),
      Effect.andThen(PreprintReviewRequestToChatPostMessageInputs),
    )

    const message = yield* postMessageOnSlack({ ...post, channel: yield* requestAReviewChannelId })

    yield* Effect.forEach(replies, post =>
      Effect.delay(postMessageOnSlack({ ...post, channel: message.channel, threadTs: message.ts }), '100 millis'),
    )

    return message
  },
  Effect.catchAll(error => new FailedToSharePreprintReviewRequest({ cause: error })),
  Effect.andThen(message => ({ channelId: message.channel, messageTimestamp: message.ts })),
)

function postMessageOnSlack(message: Slack.ChatPostMessageInput) {
  return Effect.acquireRelease(Slack.chatPostMessage(message), (id, exit) =>
    Exit.matchEffect(exit, {
      onFailure: () =>
        Effect.catchAll(Slack.chatDelete(id), error =>
          Effect.logError('Unable to delete Slack message').pipe(Effect.annotateLogs({ id, error })),
        ),
      onSuccess: () => Effect.void,
    }),
  )
}
