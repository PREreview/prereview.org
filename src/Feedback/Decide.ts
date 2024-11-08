import { Array, Either, flow, Function, Match, pipe } from 'effect'
import type * as Commands from './Commands.js'
import * as Errors from './Errors.js'
import * as Events from './Events.js'
import type * as State from './State.js'

const onStartComment = (command: Commands.StartComment) =>
  flow(
    Match.value<State.CommentState>,
    Match.tag('CommentNotStarted', () =>
      Either.right(
        Array.of(new Events.CommentWasStarted({ prereviewId: command.prereviewId, authorId: command.authorId })),
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
      Either.right(Array.of(new Events.CommentWasEntered({ comment: command.comment }))),
    ),
    Match.tag('CommentReadyForPublishing', () =>
      Either.right(Array.of(new Events.CommentWasEntered({ comment: command.comment }))),
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
      Either.right(Array.of(new Events.PersonaWasChosen({ persona: command.persona }))),
    ),
    Match.tag('CommentReadyForPublishing', () =>
      Either.right(Array.of(new Events.PersonaWasChosen({ persona: command.persona }))),
    ),
    Match.tag('CommentBeingPublished', () => Either.left(new Errors.CommentIsBeingPublished())),
    Match.tag('CommentPublished', () => Either.left(new Errors.CommentWasAlreadyPublished())),
    Match.exhaustive,
  )

const onAgreeToCodeOfConduct = () =>
  flow(
    Match.value<State.CommentState>,
    Match.tag('CommentNotStarted', () => Either.left(new Errors.CommentHasNotBeenStarted())),
    Match.tag('CommentInProgress', state =>
      Either.right(!state.codeOfConductAgreed ? Array.of(new Events.CodeOfConductWasAgreed()) : Array.empty()),
    ),
    Match.tag('CommentReadyForPublishing', () => Either.right(Array.empty())),
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
        Array.of(new Events.CompetingInterestsWereDeclared({ competingInterests: command.competingInterests })),
      ),
    ),
    Match.tag('CommentReadyForPublishing', () =>
      Either.right(
        Array.of(new Events.CompetingInterestsWereDeclared({ competingInterests: command.competingInterests })),
      ),
    ),
    Match.tag('CommentBeingPublished', () => Either.left(new Errors.CommentIsBeingPublished())),
    Match.tag('CommentPublished', () => Either.left(new Errors.CommentWasAlreadyPublished())),
    Match.exhaustive,
  )

const onPublishComment = () =>
  flow(
    Match.value<State.CommentState>,
    Match.tag('CommentNotStarted', () => Either.left(new Errors.CommentHasNotBeenStarted())),
    Match.tag('CommentInProgress', () => Either.left(new Errors.CommentIsIncomplete())),
    Match.tag('CommentReadyForPublishing', () => Either.right(Array.of(new Events.CommentPublicationWasRequested()))),
    Match.tag('CommentBeingPublished', () => Either.right(Array.empty())),
    Match.tag('CommentPublished', () => Either.left(new Errors.CommentWasAlreadyPublished())),
    Match.exhaustive,
  )

const onMarkDoiAsAssigned = (command: Commands.MarkDoiAsAssigned) =>
  flow(
    Match.value<State.CommentState>,
    Match.tag('CommentNotStarted', () => Either.left(new Errors.CommentHasNotBeenStarted())),
    Match.tag('CommentInProgress', () => Either.left(new Errors.CommentIsIncomplete())),
    Match.tag('CommentReadyForPublishing', () =>
      Either.right(Array.of(new Events.DoiWasAssigned({ doi: command.doi, id: command.id }))),
    ),
    Match.tag('CommentBeingPublished', state =>
      state.doi === undefined || state.id === undefined
        ? Either.right(Array.of(new Events.DoiWasAssigned({ doi: command.doi, id: command.id })))
        : Either.left(new Errors.DoiIsAlreadyAssigned()),
    ),
    Match.tag('CommentPublished', () => Either.left(new Errors.CommentWasAlreadyPublished())),
    Match.exhaustive,
  )

const onMarkCommentAsPublished = () =>
  flow(
    Match.value<State.CommentState>,
    Match.tag('CommentNotStarted', () => Either.left(new Errors.CommentHasNotBeenStarted())),
    Match.tag('CommentInProgress', () => Either.left(new Errors.CommentIsIncomplete())),
    Match.tag('CommentReadyForPublishing', () => Either.left(new Errors.DoiIsNotAssigned())),
    Match.tag('CommentBeingPublished', state =>
      state.doi === undefined || state.id === undefined
        ? Either.left(new Errors.DoiIsNotAssigned())
        : Either.right(Array.of(new Events.CommentWasPublished())),
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
  Match.tag('PublishComment', onPublishComment),
  Match.tag('MarkDoiAsAssigned', onMarkDoiAsAssigned),
  Match.tag('MarkCommentAsPublished', onMarkCommentAsPublished),
  Match.exhaustive,
)

export const DecideFeedback = (
  state: State.CommentState,
): ((command: Commands.CommentCommand) => Either.Either<ReadonlyArray<Events.CommentEvent>, Errors.CommentError>) =>
  flow(onCommand, Function.apply(state)<Either.Either<ReadonlyArray<Events.CommentEvent>, Errors.CommentError>>)
