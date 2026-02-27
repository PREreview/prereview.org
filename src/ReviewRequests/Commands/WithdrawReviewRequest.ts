import type { Temporal } from '@js-temporal/polyfill'
import { Either, type Option } from 'effect'
import type * as Events from '../../Events.ts'
import type { Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface Command {
  readonly withdrawnAt: Temporal.Instant
  readonly reviewRequestId: Uuid.Uuid
  readonly reason: 'preprint-withdrawn-from-preprint-server'
}

export type Error = Errors.UnknownReviewRequest

export type State = undefined

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const foldState = (events: ReadonlyArray<Events.ReviewRequestEvent>, command: Command): State => undefined

export const decide = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  state: State,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  command: Command,
): Either.Either<Option.Option<Events.ReviewRequestEvent>, Error> =>
  Either.left(new Errors.UnknownReviewRequest({ cause: 'not implemented' }))
