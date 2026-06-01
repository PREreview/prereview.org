import { Context, Effect, flow, Layer } from 'effect'
import * as Commands from '../Commands.ts'
import * as Queries from '../Queries.ts'
import type { Uuid } from '../types/Uuid.ts'
import { AcceptInvite } from './AcceptInvite.ts'
import { ChoosePersona, PersonaDoesNotNeedToBeChosen } from './ChoosePersona.ts'
import { ChoicesDoNotNeedToBeConfirmed, ConfirmAuthorChoices } from './ConfirmAuthorChoices.ts'
import { GetAuthorChoicesToConfirm, PrereviewerIsNotListedOnTheReview } from './GetAuthorChoicesToConfirm.ts'
import { GetNextExpectedCommandForAPrereviewerOnAReview } from './GetNextExpectedCommandForAPrereviewerOnAReview.ts'
import { GetPersonaChoice } from './GetPersonaChoice.ts'
import { GetReviewIdForInvitation } from './GetReviewIdForInvitation.ts'
import type { HasAPrereviewerConfirmedTheirAuthorChoices } from './HasAPrereviewerConfirmedTheirAuthorChoices.ts'

export class AuthorInvites extends Context.Tag('AuthorInvites')<
  AuthorInvites,
  {
    acceptInvite: (
      args: Omit<Parameters<Commands.FromCommand<typeof AcceptInvite>>[0], 'reviewId'>,
    ) => ReturnType<Commands.FromCommand<typeof AcceptInvite>>
    choosePersona: (
      args: Omit<Parameters<Commands.FromCommand<typeof ChoosePersona>>[0], 'reviewId'> & {
        invitationId: Uuid
      },
    ) => ReturnType<Commands.FromCommand<typeof ChoosePersona>>
    confirmAuthorChoices: (
      args: Omit<Parameters<Commands.FromCommand<typeof ConfirmAuthorChoices>>[0], 'reviewId'> & {
        invitationId: Uuid
      },
    ) => ReturnType<Commands.FromCommand<typeof ConfirmAuthorChoices>>
    getPersonaChoice: (
      args: Omit<Parameters<Queries.FromOnDemandQuery<typeof GetPersonaChoice>>[0], 'reviewId'> & {
        invitationId: Uuid
      },
    ) => ReturnType<Queries.FromOnDemandQuery<typeof GetPersonaChoice>>
    getAuthorChoicesToConfirm: (
      args: Omit<Parameters<Queries.FromOnDemandQuery<typeof GetAuthorChoicesToConfirm>>[0], 'reviewId'> & {
        invitationId: Uuid
      },
    ) => ReturnType<Queries.FromOnDemandQuery<typeof GetAuthorChoicesToConfirm>>
    hasAPrereviewerConfirmedTheirAuthorChoices: (
      args: Omit<
        Parameters<Queries.FromOnDemandQuery<typeof HasAPrereviewerConfirmedTheirAuthorChoices>>[0],
        'reviewId'
      > & {
        invitationId: Uuid
      },
    ) => ReturnType<Queries.FromOnDemandQuery<typeof HasAPrereviewerConfirmedTheirAuthorChoices>>
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
    const choosePersona = yield* Commands.makeCommand(ChoosePersona)
    const confirmAuthorChoices = yield* Commands.makeCommand(ConfirmAuthorChoices)
    const getReviewIdForInvitation = yield* Queries.makeOnDemandQuery(GetReviewIdForInvitation)
    const getPersonaChoice = yield* Queries.makeOnDemandQuery(GetPersonaChoice)
    const getAuthorChoicesToConfirm = yield* Queries.makeOnDemandQuery(GetAuthorChoicesToConfirm)
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
      choosePersona: flow(
        Effect.succeed,
        Effect.bind('reviewId', ({ invitationId }) => getReviewIdForInvitation(invitationId)),
        Effect.andThen(choosePersona),
        Effect.catchTags({
          InvitationNotFound: () => new PersonaDoesNotNeedToBeChosen(),
          UnableToQuery: error => new Commands.UnableToHandleCommand({ cause: error }),
        }),
      ),
      confirmAuthorChoices: flow(
        Effect.succeed,
        Effect.bind('reviewId', ({ invitationId }) => getReviewIdForInvitation(invitationId)),
        Effect.andThen(confirmAuthorChoices),
        Effect.catchTags({
          InvitationNotFound: () => new ChoicesDoNotNeedToBeConfirmed(),
          UnableToQuery: error => new Commands.UnableToHandleCommand({ cause: error }),
        }),
      ),
      getPersonaChoice: flow(
        Effect.succeed,
        Effect.bind('reviewId', ({ invitationId }) => getReviewIdForInvitation(invitationId)),
        Effect.andThen(getPersonaChoice),
        Effect.catchTag('InvitationNotFound', () => new PrereviewerIsNotListedOnTheReview()),
      ),
      getAuthorChoicesToConfirm: flow(
        Effect.succeed,
        Effect.bind('reviewId', ({ invitationId }) => getReviewIdForInvitation(invitationId)),
        Effect.andThen(getAuthorChoicesToConfirm),
        Effect.catchTag('InvitationNotFound', () => new PrereviewerIsNotListedOnTheReview()),
      ),
      hasAPrereviewerConfirmedTheirAuthorChoices: () => new Queries.UnableToQuery({ cause: 'not implemented' }),
      getNextExpectedCommandForAPrereviewerOnAReview: flow(
        Effect.succeed,
        Effect.bind('reviewId', ({ invitationId }) => getReviewIdForInvitation(invitationId)),
        Effect.andThen(getNextExpectedCommandForAPrereviewerOnAReview),
        Effect.catchTag('InvitationNotFound', error => new Queries.UnableToQuery({ cause: error })),
      ),
    }
  }),
)
