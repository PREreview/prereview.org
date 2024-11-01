import { Array, type Effect, Equal, Option, pipe, Record } from 'effect'
import type { Orcid } from 'orcid-id-ts'
import type { Uuid } from '../types/index.js'
import type { FeedbackReadmodel } from './Context.js'
import type { FeedbackEvent } from './Events.js'
import { EvolveFeedback } from './Evolve.js'
import { FeedbackNotStarted, type FeedbackState } from './State.js'

type Events = ReadonlyArray<{
  readonly event: FeedbackEvent
  readonly resourceId: Uuid.Uuid
}>

export const GetOneFeedbackWaitingToBePublished = (
  events: Events,
): Effect.Effect.Success<ReturnType<(typeof FeedbackReadmodel)['Service']['getOneFeedbackWaitingToBePublished']>> => {
  const published = []
  for (const entry of events.toReversed()) {
    if (entry.event._tag === 'FeedbackWasPublished') {
      published.push(entry.resourceId)
      continue
    }
    if (entry.event._tag === 'FeedbackPublicationWasRequested' && !published.includes(entry.resourceId)) {
      return Option.some(entry.resourceId)
    }
  }
  return Option.none()
}

export const GetAllUnpublishedFeedbackByAnAuthorForAPrereview =
  (events: Events) =>
  ({ authorId, prereviewId }: { readonly authorId: Orcid; readonly prereviewId: number }) =>
    pipe(
      Array.reduce(
        events,
        {} as Record.ReadonlyRecord<Uuid.Uuid, ReadonlyArray<FeedbackEvent>>,
        (candidates, { event, resourceId }) =>
          pipe(
            Record.modifyOption(candidates, resourceId, Array.append(event)),
            Option.getOrElse(() => {
              if (
                event._tag === 'FeedbackWasStarted' &&
                Equal.equals(event.authorId, authorId) &&
                Equal.equals(event.prereviewId, prereviewId)
              ) {
                return Record.set(candidates, resourceId, Array.of(event))
              }

              return candidates
            }),
          ),
      ),
      Record.map(
        Array.reduce(new FeedbackNotStarted() as FeedbackState, (state, event) => EvolveFeedback(state)(event)),
      ),
      Record.filter(
        state =>
          state._tag === 'FeedbackInProgress' ||
          state._tag === 'FeedbackReadyForPublishing' ||
          state._tag === 'FeedbackBeingPublished',
      ),
    )

export const HasAuthorUnpublishedFeedbackForAPrereview =
  (events: Events) =>
  ({ authorId, prereviewId }: { readonly authorId: Orcid; readonly prereviewId: number }) =>
    pipe(
      Array.reduce(
        events,
        {} as Record.ReadonlyRecord<Uuid.Uuid, ReadonlyArray<FeedbackEvent>>,
        (candidates, { event, resourceId }) =>
          pipe(
            Record.modifyOption(candidates, resourceId, Array.append(event)),
            Option.getOrElse(() => {
              if (
                event._tag === 'FeedbackWasStarted' &&
                Equal.equals(event.authorId, authorId) &&
                Equal.equals(event.prereviewId, prereviewId)
              ) {
                return Record.set(candidates, resourceId, Array.of(event))
              }

              return candidates
            }),
          ),
      ),
      Record.map(
        Array.reduce(new FeedbackNotStarted() as FeedbackState, (state, event) => EvolveFeedback(state)(event)),
      ),
      Record.some(
        state =>
          state._tag === 'FeedbackInProgress' ||
          state._tag === 'FeedbackReadyForPublishing' ||
          state._tag === 'FeedbackBeingPublished',
      ),
    )
