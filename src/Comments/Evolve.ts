import { flow, Function, identity, Match, Option, pipe } from 'effect'
import type * as Events from './Events.js'
import * as State from './State.js'

const onCommentWasStarted = (event: Events.CommentWasStarted) =>
  flow(
    Match.value<State.CommentState>,
    Match.tag(
      'CommentNotStarted',
      () => new State.CommentInProgress({ authorId: event.authorId, prereviewId: event.prereviewId }),
    ),
    Match.tag('CommentInProgress', identity),
    Match.tag('CommentReadyForPublishing', identity),
    Match.tag('CommentBeingPublished', identity),
    Match.tag('CommentPublished', identity),
    Match.exhaustive,
  )

const onCommentWasEntered = (event: Events.CommentWasEntered) =>
  flow(
    Match.value<State.CommentState>,
    Match.tag('CommentNotStarted', identity),
    Match.tag('CommentInProgress', state => new State.CommentInProgress({ ...state, comment: event.comment })),
    Match.tag(
      'CommentReadyForPublishing',
      state => new State.CommentReadyForPublishing({ ...state, comment: event.comment }),
    ),
    Match.tag('CommentBeingPublished', identity),
    Match.tag('CommentPublished', identity),
    Match.exhaustive,
  )

const onPersonaWasChosen = (event: Events.PersonaWasChosen) =>
  flow(
    Match.value<State.CommentState>,
    Match.tag('CommentNotStarted', identity),
    Match.tag('CommentInProgress', state => new State.CommentInProgress({ ...state, persona: event.persona })),
    Match.tag(
      'CommentReadyForPublishing',
      state => new State.CommentReadyForPublishing({ ...state, persona: event.persona }),
    ),
    Match.tag('CommentBeingPublished', identity),
    Match.tag('CommentPublished', identity),
    Match.exhaustive,
  )

const onCompetingInterestsWereDeclared = (event: Events.CompetingInterestsWereDeclared) =>
  flow(
    Match.value<State.CommentState>,
    Match.tag('CommentNotStarted', identity),
    Match.tag(
      'CommentInProgress',
      state => new State.CommentInProgress({ ...state, competingInterests: event.competingInterests }),
    ),
    Match.tag(
      'CommentReadyForPublishing',
      state => new State.CommentReadyForPublishing({ ...state, competingInterests: event.competingInterests }),
    ),
    Match.tag('CommentBeingPublished', identity),
    Match.tag('CommentPublished', identity),
    Match.exhaustive,
  )

const onCodeOfConductWasAgreed = () =>
  flow(
    Match.value<State.CommentState>,
    Match.tag('CommentNotStarted', identity),
    Match.tag('CommentInProgress', state => new State.CommentInProgress({ ...state, codeOfConductAgreed: true })),
    Match.tag('CommentReadyForPublishing', identity),
    Match.tag('CommentBeingPublished', identity),
    Match.tag('CommentPublished', identity),
    Match.exhaustive,
  )

const onExistenceOfVerifiedEmailAddressWasConfirmed = () =>
  flow(
    Match.value<State.CommentState>,
    Match.tag('CommentNotStarted', identity),
    Match.tag(
      'CommentInProgress',
      state => new State.CommentInProgress({ ...state, verifiedEmailAddressExists: true }),
    ),
    Match.tag('CommentReadyForPublishing', identity),
    Match.tag('CommentBeingPublished', identity),
    Match.tag('CommentPublished', identity),
    Match.exhaustive,
  )

const onCommentPublicationWasRequested = () =>
  flow(
    Match.value<State.CommentState>,
    Match.tag('CommentNotStarted', identity),
    Match.tag('CommentInProgress', identity),
    Match.tag('CommentReadyForPublishing', state => new State.CommentBeingPublished(state)),
    Match.tag('CommentBeingPublished', identity),
    Match.tag('CommentPublished', identity),
    Match.exhaustive,
  )

const onDoiWasAssigned = (event: Events.DoiWasAssigned) =>
  flow(
    Match.value<State.CommentState>,
    Match.tag('CommentNotStarted', identity),
    Match.tag('CommentInProgress', identity),
    Match.tag(
      'CommentReadyForPublishing',
      state => new State.CommentBeingPublished({ ...state, id: event.id, doi: event.doi }),
    ),
    Match.tag(
      'CommentBeingPublished',
      state => new State.CommentBeingPublished({ ...state, id: event.id, doi: event.doi }),
    ),
    Match.tag('CommentPublished', identity),
    Match.exhaustive,
  )

const onCommentWasPublished = () =>
  flow(
    Match.value<State.CommentState>,
    Match.tag('CommentNotStarted', identity),
    Match.tag('CommentInProgress', identity),
    Match.tag('CommentReadyForPublishing', identity),
    Match.tag('CommentBeingPublished', ({ id, doi, ...state }) =>
      typeof id === 'number' && typeof doi === 'string' ? new State.CommentPublished({ ...state, id, doi }) : state,
    ),
    Match.tag('CommentPublished', identity),
    Match.exhaustive,
  )

const onEvent = pipe(
  Match.type<Events.CommentEvent>(),
  Match.tag('CommentWasStarted', onCommentWasStarted),
  Match.tag('CommentWasEntered', onCommentWasEntered),
  Match.tag('PersonaWasChosen', onPersonaWasChosen),
  Match.tag('CompetingInterestsWereDeclared', onCompetingInterestsWereDeclared),
  Match.tag('CodeOfConductWasAgreed', onCodeOfConductWasAgreed),
  Match.tag('ExistenceOfVerifiedEmailAddressWasConfirmed', onExistenceOfVerifiedEmailAddressWasConfirmed),
  Match.tag('CommentPublicationWasRequested', onCommentPublicationWasRequested),
  Match.tag('DoiWasAssigned', onDoiWasAssigned),
  Match.tag('CommentWasPublished', onCommentWasPublished),
  Match.exhaustive,
)

export const EvolveComment =
  (requireVerifiedEmailAddress: boolean) =>
  (state: State.CommentState): ((event: Events.CommentEvent) => State.CommentState) =>
    flow(onEvent, Function.apply(state)<State.CommentState>, checkIsReadyForPublication(requireVerifiedEmailAddress))

const checkIsReadyForPublication = (requireVerifiedEmailAddress: boolean) => (state: State.CommentState) => {
  if (state._tag !== 'CommentInProgress') {
    return state
  }

  const { codeOfConductAgreed, competingInterests, comment, persona, verifiedEmailAddressExists, ...rest } = state

  if (
    typeof comment !== 'object' ||
    typeof persona !== 'string' ||
    !Option.isOption(competingInterests) ||
    codeOfConductAgreed !== true ||
    (requireVerifiedEmailAddress && verifiedEmailAddressExists !== true)
  ) {
    return state
  }

  return new State.CommentReadyForPublishing({ ...rest, competingInterests, comment, persona })
}
