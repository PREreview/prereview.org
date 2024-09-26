import { Array, Equal, Option, pipe, Record } from 'effect'
import type { Orcid } from 'orcid-id-ts'
import type { Uuid } from '../types/index.js'
import type { FeedbackEvent } from './Events.js'
import { EvolveFeedback } from './Evolve.js'
import { FeedbackNotStarted, type FeedbackState } from './State.js'

export const GetAllUnpublishedFeedbackByAnAuthorForAPrereview =
  (events: ReadonlyArray<{ readonly event: FeedbackEvent; readonly resourceId: Uuid.Uuid }>) =>
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
