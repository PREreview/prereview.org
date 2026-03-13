import type { Temporal } from '@js-temporal/polyfill'
import { Array, Data, Either, flow, Match, Option } from 'effect'
import * as Commands from '../../Commands.ts'
import * as Events from '../../Events.ts'
import type * as Preprints from '../../Preprints/index.ts'
import type { OrcidId, Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface Input {
  readonly startedAt: Temporal.Instant
  readonly preprintId: Preprints.IndeterminatePreprintId
  readonly reviewRequestId: Uuid.Uuid
  readonly requesterId: OrcidId.OrcidId
}

export type Error = Errors.ReviewRequestWasAlreadyStarted

type State = NotStarted | HasBeenStarted

class NotStarted extends Data.TaggedClass('NotStarted') {}

class HasBeenStarted extends Data.TaggedClass('HasBeenStarted') {}

const createFilter = (input: Input) =>
  Events.EventFilter({
    types: [
      'ReviewRequestForAPreprintWasStarted',
      'ReviewRequestForAPreprintWasReceived',
      'ReviewRequestByAPrereviewerWasImported',
      'ReviewRequestFromAPreprintServerWasImported',
    ],
    predicates: { reviewRequestId: input.reviewRequestId },
  })

const foldState = (events: ReadonlyArray<Events.Event>, input: Input): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(input)))

  return Array.match(filteredEvents, { onNonEmpty: () => new HasBeenStarted(), onEmpty: () => new NotStarted() })
}

const decide = (state: State, input: Input): Either.Either<Events.ReviewRequestEvent, Error> =>
  Match.valueTags(state, {
    HasBeenStarted: () => Either.left(new Errors.ReviewRequestWasAlreadyStarted({})),
    NotStarted: () =>
      Either.right(
        new Events.ReviewRequestForAPreprintWasStarted({
          startedAt: input.startedAt,
          preprintId: input.preprintId,
          reviewRequestId: input.reviewRequestId,
          requesterId: input.requesterId,
        }),
      ),
  })

export const StartReviewRequest = Commands.Command({
  name: 'ReviewRequestCommands.startReviewRequest',
  createFilter,
  foldState,
  decide: flow(decide, Either.map(Option.some)),
})
