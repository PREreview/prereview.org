import { Either, flow, Function, Match, Option, pipe } from 'effect'
import type * as Commands from './Commands.ts'
import * as Errors from './Errors.ts'
import * as Events from './Events.ts'
import type * as State from './State.ts'

const onStartComment = (command: Commands.StartComment) =>
  flow(
    Match.value<State.CommentState>,
    Match.tag('CommentNotStarted', () =>
      Either.right(
        Option.some(
          new Events.CommentWasStarted({
            commentId: command.commentId,
            prereviewId: command.prereviewId,
            authorId: command.authorId,
          }),
        ),
      ),
    ),
    Match.tag('CommentInProgress', () => Either.left(new Errors.CommentWasAlreadyStarted())),
    Match.tag('CommentReadyForPublishing', () => Either.left(new Errors.CommentWasAlreadyStarted())),
    Match.tag('CommentBeingPublished', () => Either.left(new Errors.CommentIsBeingPublished())),
    Match.tag('CommentPublished', () => Either.left(new Errors.CommentWasAlreadyPublished())),
    Match.exhaustive,
  )

const onEnterComment = (command: Commands.EnterComment) =>
  flow(
    Match.value<State.CommentState>,
    Match.tag('CommentNotStarted', () => Either.left(new Errors.CommentHasNotBeenStarted())),
    Match.tag('CommentInProgress', () =>
      Either.right(
        Option.some(new Events.CommentWasEntered({ commentId: command.commentId, comment: command.comment })),
      ),
    ),
    Match.tag('CommentReadyForPublishing', () =>
      Either.right(
        Option.some(new Events.CommentWasEntered({ commentId: command.commentId, comment: command.comment })),
      ),
    ),
    Match.tag('CommentBeingPublished', () => Either.left(new Errors.CommentIsBeingPublished())),
    Match.tag('CommentPublished', () => Either.left(new Errors.CommentWasAlreadyPublished())),
    Match.exhaustive,
  )

const onChoosePersona = (command: Commands.ChoosePersona) =>
  flow(
    Match.value<State.CommentState>,
    Match.tag('CommentNotStarted', () => Either.left(new Errors.CommentHasNotBeenStarted())),
    Match.tag('CommentInProgress', () =>
      Either.right(
        Option.some(new Events.PersonaForCommentWasChosen({ commentId: command.commentId, persona: command.persona })),
      ),
    ),
    Match.tag('CommentReadyForPublishing', () =>
      Either.right(
        Option.some(new Events.PersonaForCommentWasChosen({ commentId: command.commentId, persona: command.persona })),
      ),
    ),
    Match.tag('CommentBeingPublished', () => Either.left(new Errors.CommentIsBeingPublished())),
    Match.tag('CommentPublished', () => Either.left(new Errors.CommentWasAlreadyPublished())),
    Match.exhaustive,
  )

const onAgreeToCodeOfConduct = (command: Commands.AgreeToCodeOfConduct) =>
  flow(
    Match.value<State.CommentState>,
    Match.tag('CommentNotStarted', () => Either.left(new Errors.CommentHasNotBeenStarted())),
    Match.tag('CommentInProgress', state =>
      Either.right(
        !state.codeOfConductAgreed
          ? Option.some(new Events.CodeOfConductForCommentWasAgreed({ commentId: command.commentId }))
          : Option.none(),
      ),
    ),
    Match.tag('CommentReadyForPublishing', () => Either.right(Option.none())),
    Match.tag('CommentBeingPublished', () => Either.left(new Errors.CommentIsBeingPublished())),
    Match.tag('CommentPublished', () => Either.left(new Errors.CommentWasAlreadyPublished())),
    Match.exhaustive,
  )

const onDeclareCompetingInterests = (command: Commands.DeclareCompetingInterests) =>
  flow(
    Match.value<State.CommentState>,
    Match.tag('CommentNotStarted', () => Either.left(new Errors.CommentHasNotBeenStarted())),
    Match.tag('CommentInProgress', () =>
      Either.right(
        Option.some(
          new Events.CompetingInterestsForCommentWereDeclared({
            commentId: command.commentId,
            competingInterests: command.competingInterests,
          }),
        ),
      ),
    ),
    Match.tag('CommentReadyForPublishing', () =>
      Either.right(
        Option.some(
          new Events.CompetingInterestsForCommentWereDeclared({
            commentId: command.commentId,
            competingInterests: command.competingInterests,
          }),
        ),
      ),
    ),
    Match.tag('CommentBeingPublished', () => Either.left(new Errors.CommentIsBeingPublished())),
    Match.tag('CommentPublished', () => Either.left(new Errors.CommentWasAlreadyPublished())),
    Match.exhaustive,
  )

const onConfirmExistenceOfVerifiedEmailAddress = (command: Commands.ConfirmExistenceOfVerifiedEmailAddress) =>
  flow(
    Match.value<State.CommentState>,
    Match.tag('CommentNotStarted', () => Either.left(new Errors.CommentHasNotBeenStarted())),
    Match.tag('CommentInProgress', state =>
      Either.right(
        !state.verifiedEmailAddressExists
          ? Option.some(
              new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId: command.commentId }),
            )
          : Option.none(),
      ),
    ),
    Match.tag('CommentReadyForPublishing', () => Either.right(Option.none())),
    Match.tag('CommentBeingPublished', () => Either.left(new Errors.CommentIsBeingPublished())),
    Match.tag('CommentPublished', () => Either.left(new Errors.CommentWasAlreadyPublished())),
    Match.exhaustive,
  )

const onPublishComment = (command: Commands.PublishComment) =>
  flow(
    Match.value<State.CommentState>,
    Match.tag('CommentNotStarted', () => Either.left(new Errors.CommentHasNotBeenStarted())),
    Match.tag('CommentInProgress', () => Either.left(new Errors.CommentIsIncomplete())),
    Match.tag('CommentReadyForPublishing', () =>
      Either.right(Option.some(new Events.PublicationOfCommentWasRequested({ commentId: command.commentId }))),
    ),
    Match.tag('CommentBeingPublished', () => Either.right(Option.none())),
    Match.tag('CommentPublished', () => Either.left(new Errors.CommentWasAlreadyPublished())),
    Match.exhaustive,
  )

const onMarkDoiAsAssigned = (command: Commands.MarkDoiAsAssigned) =>
  flow(
    Match.value<State.CommentState>,
    Match.tag('CommentNotStarted', () => Either.left(new Errors.CommentHasNotBeenStarted())),
    Match.tag('CommentInProgress', () => Either.left(new Errors.CommentIsIncomplete())),
    Match.tag('CommentReadyForPublishing', () =>
      Either.right(
        Option.some(
          new Events.CommentWasAssignedADoi({ commentId: command.commentId, doi: command.doi, id: command.id }),
        ),
      ),
    ),
    Match.tag('CommentBeingPublished', state =>
      state.doi === undefined || state.id === undefined
        ? Either.right(
            Option.some(
              new Events.CommentWasAssignedADoi({ commentId: command.commentId, doi: command.doi, id: command.id }),
            ),
          )
        : Either.left(new Errors.DoiIsAlreadyAssigned()),
    ),
    Match.tag('CommentPublished', () => Either.left(new Errors.CommentWasAlreadyPublished())),
    Match.exhaustive,
  )

const onMarkCommentAsPublished = (command: Commands.MarkCommentAsPublished) =>
  flow(
    Match.value<State.CommentState>,
    Match.tag('CommentNotStarted', () => Either.left(new Errors.CommentHasNotBeenStarted())),
    Match.tag('CommentInProgress', () => Either.left(new Errors.CommentIsIncomplete())),
    Match.tag('CommentReadyForPublishing', () => Either.left(new Errors.DoiIsNotAssigned())),
    Match.tag('CommentBeingPublished', state =>
      state.doi === undefined || state.id === undefined
        ? Either.left(new Errors.DoiIsNotAssigned())
        : Either.right(Option.some(new Events.CommentWasPublished({ commentId: command.commentId }))),
    ),
    Match.tag('CommentPublished', () => Either.left(new Errors.CommentWasAlreadyPublished())),
    Match.exhaustive,
  )

const onCommand = pipe(
  Match.type<Commands.CommentCommand>(),
  Match.tag('StartComment', onStartComment),
  Match.tag('EnterComment', onEnterComment),
  Match.tag('ChoosePersona', onChoosePersona),
  Match.tag('AgreeToCodeOfConduct', onAgreeToCodeOfConduct),
  Match.tag('DeclareCompetingInterests', onDeclareCompetingInterests),
  Match.tag('ConfirmExistenceOfVerifiedEmailAddress', onConfirmExistenceOfVerifiedEmailAddress),
  Match.tag('PublishComment', onPublishComment),
  Match.tag('MarkDoiAsAssigned', onMarkDoiAsAssigned),
  Match.tag('MarkCommentAsPublished', onMarkCommentAsPublished),
  Match.exhaustive,
)

export const DecideComment = (
  state: State.CommentState,
): ((command: Commands.CommentCommand) => Either.Either<Option.Option<Events.CommentEvent>, Errors.CommentError>) =>
  flow(onCommand, Function.apply(state)<Either.Either<Option.Option<Events.CommentEvent>, Errors.CommentError>>)
