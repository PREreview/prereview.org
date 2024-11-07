import { flow, Function, identity, Match, Option, pipe } from 'effect'
import type * as Events from './Events.js'
import * as State from './State.js'

const onFeedbackWasStarted = (event: Events.FeedbackWasStarted) =>
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

const onFeedbackWasEntered = (event: Events.FeedbackWasEntered) =>
  flow(
    Match.value<State.FeedbackState>,
    Match.tag('FeedbackNotStarted', identity),
    Match.tag('FeedbackInProgress', state => new State.FeedbackInProgress({ ...state, feedback: event.feedback })),
    Match.tag(
      'FeedbackReadyForPublishing',
      state => new State.FeedbackReadyForPublishing({ ...state, feedback: event.feedback }),
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

const onFeedbackPublicationWasRequested = () =>
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

const onFeedbackWasPublished = () =>
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
  Match.type<Events.FeedbackEvent>(),
  Match.tag('FeedbackWasStarted', onFeedbackWasStarted),
  Match.tag('FeedbackWasEntered', onFeedbackWasEntered),
  Match.tag('PersonaWasChosen', onPersonaWasChosen),
  Match.tag('CompetingInterestsWereDeclared', onCompetingInterestsWereDeclared),
  Match.tag('CodeOfConductWasAgreed', onCodeOfConductWasAgreed),
  Match.tag('FeedbackPublicationWasRequested', onFeedbackPublicationWasRequested),
  Match.tag('DoiWasAssigned', onDoiWasAssigned),
  Match.tag('FeedbackWasPublished', onFeedbackWasPublished),
  Match.exhaustive,
)

export const EvolveFeedback = (state: State.FeedbackState): ((event: Events.FeedbackEvent) => State.FeedbackState) =>
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
