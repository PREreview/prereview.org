import { flow, Function, identity, Match } from 'effect'
import type * as Events from './Events.js'
import * as State from './State.js'

const onFeedbackWasStarted = () =>
  flow(
    Match.value<State.FeedbackState>,
    Match.tag('FeedbackNotStarted', () => new State.FeedbackInProgress({})),
    Match.tag('FeedbackInProgress', identity),
    Match.tag('FeedbackPublished', identity),
    Match.exhaustive,
  )

const onFeedbackWasEntered = (event: Events.FeedbackWasEntered) =>
  flow(
    Match.value<State.FeedbackState>,
    Match.tag('FeedbackNotStarted', identity),
    Match.tag('FeedbackInProgress', () => new State.FeedbackInProgress({ text: event.feedback })),
    Match.tag('FeedbackPublished', identity),
    Match.exhaustive,
  )

const onFeedbackWasPublished = (event: Events.FeedbackWasPublished) =>
  flow(
    Match.value<State.FeedbackState>,
    Match.tag('FeedbackNotStarted', identity),
    Match.tag('FeedbackInProgress', identity),
    Match.tag('FeedbackPublished', () => new State.FeedbackPublished({ id: event.id, doi: event.doi })),
    Match.exhaustive,
  )

export const EvolveFeedback = (state: State.FeedbackState): ((event: Events.FeedbackEvent) => State.FeedbackState) =>
  flow(
    Match.value,
    Match.tag('FeedbackWasStarted', onFeedbackWasStarted),
    Match.tag('FeedbackWasEntered', onFeedbackWasEntered),
    Match.tag('FeedbackWasPublished', onFeedbackWasPublished),
    Match.exhaustive,
    Function.apply(state),
  )
