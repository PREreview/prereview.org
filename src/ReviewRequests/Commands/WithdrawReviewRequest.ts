import type { Temporal } from '@js-temporal/polyfill'
import { Data, Either, Match, Option } from 'effect'
import * as Events from '../../Events.js'
import type { Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface Command {
  readonly withdrawnAt: Temporal.Instant
  readonly reviewRequestId: Uuid.Uuid
  readonly reason: 'preprint-withdrawn-from-preprint-server'
}

export type Error = Errors.UnknownReviewRequest

export type State = NotAccepted | HasBeenPublished | HasBeenWithdrawn

export class NotAccepted extends Data.TaggedClass('NotAccepted') {}

export class HasBeenPublished extends Data.TaggedClass('HasBeenPublished') {}

export class HasBeenWithdrawn extends Data.TaggedClass('HasBeenWithdrawn') {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const foldState = (events: ReadonlyArray<Events.ReviewRequestEvent>, command: Command): State =>
  new NotAccepted()

export const decide = (
  state: State,
  command: Command,
): Either.Either<Option.Option<Events.ReviewRequestEvent>, Error> =>
  Match.valueTags(state, {
    NotAccepted: () => Either.left(new Errors.UnknownReviewRequest({})),
    HasBeenPublished: () =>
      Either.right(
        Option.some(
          new Events.ReviewRequestForAPreprintWasWithdrawn({
            withdrawnAt: command.withdrawnAt,
            reviewRequestId: command.reviewRequestId,
            reason: command.reason,
          }),
        ),
      ),
    HasBeenWithdrawn: () => Either.right(Option.none()),
  })
