import { Context, Effect, flow, Layer } from 'effect'
import * as Commands from '../Commands.ts'
import * as Queries from '../Queries.ts'
import type { Uuid } from '../types/Uuid.ts'
import { AcceptInvite } from './AcceptInvite.ts'
import type { ChoosePersona } from './ChoosePersona.ts'
import { GetNextExpectedCommandForAPrereviewerOnAReview } from './GetNextExpectedCommandForAPrereviewerOnAReview.ts'
import { GetReviewIdForInvitation } from './GetReviewIdForInvitation.ts'

export class AuthorInvites extends Context.Tag('AuthorInvites')<
  AuthorInvites,
  {
    acceptInvite: (
      args: Omit<Parameters<Commands.FromCommand<typeof AcceptInvite>>[0], 'reviewId'>,
    ) => ReturnType<Commands.FromCommand<typeof AcceptInvite>>
    choosePersona: (
      args: Omit<Parameters<Commands.FromCommand<typeof ChoosePersona>>[0], 'reviewId' | 'orcidId'> & {
        invitationId: Uuid
      },
    ) => ReturnType<Commands.FromCommand<typeof ChoosePersona>>
    getNextExpectedCommandForAPrereviewerOnAReview: (
      args: Omit<
        Parameters<Queries.FromOnDemandQuery<typeof GetNextExpectedCommandForAPrereviewerOnAReview>>[0],
        'reviewId'
      > & {
        invitationId: Uuid
      },
    ) => ReturnType<Queries.FromOnDemandQuery<typeof GetNextExpectedCommandForAPrereviewerOnAReview>>
  }
>() {}

export type { NextExpectedCommand } from './GetNextExpectedCommandForAPrereviewerOnAReview.ts'

export const layer = Layer.effect(
  AuthorInvites,
  Effect.gen(function* () {
    const acceptInvite = yield* Commands.makeCommand(AcceptInvite)
    const getReviewIdForInvitation = yield* Queries.makeOnDemandQuery(GetReviewIdForInvitation)
    const getNextExpectedCommandForAPrereviewerOnAReview = yield* Queries.makeOnDemandQuery(
      GetNextExpectedCommandForAPrereviewerOnAReview,
    )

    return {
      acceptInvite: flow(
        Effect.succeed,
        Effect.bind('reviewId', ({ invitationId }) => getReviewIdForInvitation(invitationId)),
        Effect.andThen(acceptInvite),
        Effect.catchTag('UnableToQuery', error => new Commands.UnableToHandleCommand({ cause: error })),
      ),
      choosePersona: () => new Commands.UnableToHandleCommand({ cause: 'not implemented' }),
      getNextExpectedCommandForAPrereviewerOnAReview: flow(
        Effect.succeed,
        Effect.bind('reviewId', ({ invitationId }) => getReviewIdForInvitation(invitationId)),
        Effect.andThen(getNextExpectedCommandForAPrereviewerOnAReview),
        Effect.catchTag('InvitationNotFound', error => new Queries.UnableToQuery({ cause: error })),
      ),
    }
  }),
)
