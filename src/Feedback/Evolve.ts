import { flow, Function, identity, Match, Option, pipe } from 'effect'
import type * as Events from './Events.js'
import * as State from './State.js'

const onCommentWasStarted = (event: Events.CommentWasStarted) =>
  flow(
    Match.value<State.FeedbackState>,
    Match.tag(
      'FeedbackNotStarted',
      () => new State.FeedbackInProgress({ authorId: event.authorId, prereviewId: event.prereviewId }),
    ),
    Match.tag('FeedbackInProgress', identity),
    Match.tag('FeedbackReadyForPublishing', identity),
    Match.tag('FeedbackBeingPublished', identity),
    Match.tag('FeedbackPublished', identity),
    Match.exhaustive,
  )

const onCommentWasEntered = (event: Events.CommentWasEntered) =>
  flow(
    Match.value<State.FeedbackState>,
    Match.tag('FeedbackNotStarted', identity),
    Match.tag('FeedbackInProgress', state => new State.FeedbackInProgress({ ...state, feedback: event.comment })),
    Match.tag(
      'FeedbackReadyForPublishing',
      state => new State.FeedbackReadyForPublishing({ ...state, feedback: event.comment }),
    ),
    Match.tag('FeedbackBeingPublished', identity),
    Match.tag('FeedbackPublished', identity),
    Match.exhaustive,
  )

const onPersonaWasChosen = (event: Events.PersonaWasChosen) =>
  flow(
    Match.value<State.FeedbackState>,
    Match.tag('FeedbackNotStarted', identity),
    Match.tag('FeedbackInProgress', state => new State.FeedbackInProgress({ ...state, persona: event.persona })),
    Match.tag(
      'FeedbackReadyForPublishing',
      state => new State.FeedbackReadyForPublishing({ ...state, persona: event.persona }),
    ),
    Match.tag('FeedbackBeingPublished', identity),
    Match.tag('FeedbackPublished', identity),
    Match.exhaustive,
  )

const onCompetingInterestsWereDeclared = (event: Events.CompetingInterestsWereDeclared) =>
  flow(
    Match.value<State.FeedbackState>,
    Match.tag('FeedbackNotStarted', identity),
    Match.tag(
      'FeedbackInProgress',
      state => new State.FeedbackInProgress({ ...state, competingInterests: event.competingInterests }),
    ),
    Match.tag(
      'FeedbackReadyForPublishing',
      state => new State.FeedbackReadyForPublishing({ ...state, competingInterests: event.competingInterests }),
    ),
    Match.tag('FeedbackBeingPublished', identity),
    Match.tag('FeedbackPublished', identity),
    Match.exhaustive,
  )

const onCodeOfConductWasAgreed = () =>
  flow(
    Match.value<State.FeedbackState>,
    Match.tag('FeedbackNotStarted', identity),
    Match.tag('FeedbackInProgress', state => new State.FeedbackInProgress({ ...state, codeOfConductAgreed: true })),
    Match.tag('FeedbackReadyForPublishing', identity),
    Match.tag('FeedbackBeingPublished', identity),
    Match.tag('FeedbackPublished', identity),
    Match.exhaustive,
  )

const onCommentPublicationWasRequested = () =>
  flow(
    Match.value<State.FeedbackState>,
    Match.tag('FeedbackNotStarted', identity),
    Match.tag('FeedbackInProgress', identity),
    Match.tag('FeedbackReadyForPublishing', state => new State.FeedbackBeingPublished(state)),
    Match.tag('FeedbackBeingPublished', identity),
    Match.tag('FeedbackPublished', identity),
    Match.exhaustive,
  )

const onDoiWasAssigned = (event: Events.DoiWasAssigned) =>
  flow(
    Match.value<State.FeedbackState>,
    Match.tag('FeedbackNotStarted', identity),
    Match.tag('FeedbackInProgress', identity),
    Match.tag(
      'FeedbackReadyForPublishing',
      state => new State.FeedbackBeingPublished({ ...state, id: event.id, doi: event.doi }),
    ),
    Match.tag(
      'FeedbackBeingPublished',
      state => new State.FeedbackBeingPublished({ ...state, id: event.id, doi: event.doi }),
    ),
    Match.tag('FeedbackPublished', identity),
    Match.exhaustive,
  )

const onCommentWasPublished = () =>
  flow(
    Match.value<State.FeedbackState>,
    Match.tag('FeedbackNotStarted', identity),
    Match.tag('FeedbackInProgress', identity),
    Match.tag('FeedbackReadyForPublishing', identity),
    Match.tag('FeedbackBeingPublished', ({ id, doi, ...state }) =>
      typeof id === 'number' && typeof doi === 'string' ? new State.FeedbackPublished({ ...state, id, doi }) : state,
    ),
    Match.tag('FeedbackPublished', identity),
    Match.exhaustive,
  )

const onEvent = pipe(
  Match.type<Events.CommentEvent>(),
  Match.tag('CommentWasStarted', onCommentWasStarted),
  Match.tag('CommentWasEntered', onCommentWasEntered),
  Match.tag('PersonaWasChosen', onPersonaWasChosen),
  Match.tag('CompetingInterestsWereDeclared', onCompetingInterestsWereDeclared),
  Match.tag('CodeOfConductWasAgreed', onCodeOfConductWasAgreed),
  Match.tag('CommentPublicationWasRequested', onCommentPublicationWasRequested),
  Match.tag('DoiWasAssigned', onDoiWasAssigned),
  Match.tag('CommentWasPublished', onCommentWasPublished),
  Match.exhaustive,
)

export const EvolveFeedback = (state: State.FeedbackState): ((event: Events.CommentEvent) => State.FeedbackState) =>
  flow(onEvent, Function.apply(state)<State.FeedbackState>, checkIsReadyForPublication)

const checkIsReadyForPublication = (state: State.FeedbackState) => {
  if (state._tag !== 'FeedbackInProgress') {
    return state
  }

  const { codeOfConductAgreed, competingInterests, feedback, persona, ...rest } = state

  if (
    typeof feedback !== 'object' ||
    typeof persona !== 'string' ||
    !Option.isOption(competingInterests) ||
    codeOfConductAgreed !== true
  ) {
    return state
  }

  return new State.FeedbackReadyForPublishing({ ...rest, competingInterests, feedback, persona })
}
