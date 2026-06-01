import { Context, Effect, flow, Layer } from 'effect'
import * as Commands from '../Commands.ts'
import * as Queries from '../Queries.ts'
import { AcceptInvite } from './AcceptInvite.ts'
import type { ChoosePersona } from './ChoosePersona.ts'
import type { GetNextExpectedCommandForAPrereviewerOnAReview } from './GetNextExpectedCommandForAPrereviewerOnAReview.ts'
import { GetReviewIdForInvitation } from './GetReviewIdForInvitation.ts'

export class AuthorInvites extends Context.Tag('AuthorInvites')<
  AuthorInvites,
  {
    acceptInvite: (
      args: Omit<Parameters<Commands.FromCommand<typeof AcceptInvite>>[0], 'reviewId'>,
    ) => ReturnType<Commands.FromCommand<typeof AcceptInvite>>
    choosePersona: Commands.FromCommand<typeof ChoosePersona>
    getNextExpectedCommandForAPrereviewerOnAReview: Queries.FromOnDemandQuery<
      typeof GetNextExpectedCommandForAPrereviewerOnAReview
    >
  }
>() {}

export const layer = Layer.effect(
  AuthorInvites,
  Effect.gen(function* () {
    const acceptInvite = yield* Commands.makeCommand(AcceptInvite)
    const getReviewIdForInvitation = yield* Queries.makeOnDemandQuery(GetReviewIdForInvitation)

    return {
      acceptInvite: flow(
        Effect.succeed,
        Effect.bind('reviewId', ({ invitationId }) => getReviewIdForInvitation(invitationId)),
        Effect.andThen(acceptInvite),
        Effect.catchTag('UnableToQuery', error => new Commands.UnableToHandleCommand({ cause: error })),
      ),
      choosePersona: () => new Commands.UnableToHandleCommand({ cause: 'not implemented' }),
      getNextExpectedCommandForAPrereviewerOnAReview: () => new Queries.UnableToQuery({ cause: 'not implemented' }),
    }
  }),
)
