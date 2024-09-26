import { flow, Function, identity, Match } from 'effect'
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
    Match.tag(
      'FeedbackInProgress',
      state => new State.FeedbackReadyForPublishing({ ...state, feedback: event.feedback }),
    ),
    Match.tag(
      'FeedbackReadyForPublishing',
      state => new State.FeedbackReadyForPublishing({ ...state, feedback: event.feedback }),
    ),
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

const onFeedbackWasPublished = (event: Events.FeedbackWasPublished) =>
  flow(
    Match.value<State.FeedbackState>,
    Match.tag('FeedbackNotStarted', identity),
    Match.tag('FeedbackInProgress', identity),
    Match.tag(
      'FeedbackReadyForPublishing',
      state => new State.FeedbackPublished({ ...state, id: event.id, doi: event.doi }),
    ),
    Match.tag(
      'FeedbackBeingPublished',
      state => new State.FeedbackPublished({ ...state, id: event.id, doi: event.doi }),
    ),
    Match.tag('FeedbackPublished', identity),
    Match.exhaustive,
  )

export const EvolveFeedback = (state: State.FeedbackState): ((event: Events.FeedbackEvent) => State.FeedbackState) =>
  flow(
    Match.value,
    Match.tag('FeedbackWasStarted', onFeedbackWasStarted),
    Match.tag('FeedbackWasEntered', onFeedbackWasEntered),
    Match.tag('FeedbackPublicationWasRequested', onFeedbackPublicationWasRequested),
    Match.tag('FeedbackWasPublished', onFeedbackWasPublished),
    Match.exhaustive,
    Function.apply(state)<State.FeedbackState>,
  )
