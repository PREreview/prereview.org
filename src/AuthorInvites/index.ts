import { Context, Effect, flow, Layer } from 'effect'
import * as Commands from '../Commands.ts'
import * as Queries from '../Queries.ts'
import { AcceptInvite } from './AcceptInvite.ts'
import { ChoosePersona } from './ChoosePersona.ts'
import { ConfirmAuthorChoices } from './ConfirmAuthorChoices.ts'
import { GetAuthorChoicesToConfirm } from './GetAuthorChoicesToConfirm.ts'
import { GetNextExpectedCommandForAPrereviewerOnAReview } from './GetNextExpectedCommandForAPrereviewerOnAReview.ts'
import { GetPersonaChoice } from './GetPersonaChoice.ts'
import { GetReviewIdForInvitation } from './GetReviewIdForInvitation.ts'
import { HasAPrereviewerConfirmedTheirAuthorChoices } from './HasAPrereviewerConfirmedTheirAuthorChoices.ts'

export class AuthorInvites extends Context.Tag('AuthorInvites')<
  AuthorInvites,
  {
    acceptInvite: (
      args: Omit<Parameters<Commands.FromCommand<typeof AcceptInvite>>[0], 'reviewId'>,
    ) => ReturnType<Commands.FromCommand<typeof AcceptInvite>>
    choosePersona: Commands.FromCommand<typeof ChoosePersona>
    confirmAuthorChoices: Commands.FromCommand<typeof ConfirmAuthorChoices>
    getPersonaChoice: Queries.FromOnDemandQuery<typeof GetPersonaChoice>
    getAuthorChoicesToConfirm: Queries.FromOnDemandQuery<typeof GetAuthorChoicesToConfirm>
    hasAPrereviewerConfirmedTheirAuthorChoices: Queries.FromOnDemandQuery<
      typeof HasAPrereviewerConfirmedTheirAuthorChoices
    >
    getReviewIdForInvitation: Queries.FromOnDemandQuery<typeof GetReviewIdForInvitation>
    getNextExpectedCommandForAPrereviewerOnAReview: Queries.FromOnDemandQuery<
      typeof GetNextExpectedCommandForAPrereviewerOnAReview
    >
  }
>() {}

export type { NextExpectedCommand } from './GetNextExpectedCommandForAPrereviewerOnAReview.ts'

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
      choosePersona: yield* Commands.makeCommand(ChoosePersona),
      confirmAuthorChoices: yield* Commands.makeCommand(ConfirmAuthorChoices),
      getPersonaChoice: yield* Queries.makeOnDemandQuery(GetPersonaChoice),
      getAuthorChoicesToConfirm: yield* Queries.makeOnDemandQuery(GetAuthorChoicesToConfirm),
      hasAPrereviewerConfirmedTheirAuthorChoices: yield* Queries.makeOnDemandQuery(
        HasAPrereviewerConfirmedTheirAuthorChoices,
      ),
      getReviewIdForInvitation,
      getNextExpectedCommandForAPrereviewerOnAReview: yield* Queries.makeOnDemandQuery(
        GetNextExpectedCommandForAPrereviewerOnAReview,
      ),
    }
  }),
)
