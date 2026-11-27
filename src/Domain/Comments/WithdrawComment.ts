import type { Temporal } from '@js-temporal/polyfill'
import { Array, Option, Result, type Types } from 'effect'
import type { Uuid } from '../../types/Uuid.ts'
import * as Events from '../Events/index.ts'
import { Commands } from '../Events/index.ts'
import { CommentHasNotBeenPublished, CommentHasNotBeenStarted } from './Errors.ts'

export interface Input {
  readonly commentId: Uuid
  readonly withdrawnAt: Temporal.Instant
  readonly reason: 'spam'
}

export type Error = CommentHasNotBeenStarted | CommentHasNotBeenPublished

interface State {
  readonly started: boolean
  readonly published: boolean
  readonly withdrawn: boolean
}

const createFilter = (input: Input) =>
  Events.EventFilter({
    types: ['CommentWasStarted', 'CommentWasPublished', 'CommentWasWithdrawn'],
    predicates: { commentId: input.commentId },
  })

const foldState = (events: ReadonlyArray<Events.Event>, input: Input): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(input)))

  return {
    started: Array.some(filteredEvents, hasTag('CommentWasStarted')),
    published: Array.some(filteredEvents, hasTag('CommentWasPublished')),
    withdrawn: Array.some(filteredEvents, hasTag('CommentWasWithdrawn')),
  }
}

const decide = (state: State, input: Input): Result.Result<Option.Option<Events.Event>, Error> => {
  if (!state.started) {
    return Result.fail(new CommentHasNotBeenStarted())
  }

  if (!state.published) {
    return Result.fail(new CommentHasNotBeenPublished())
  }

  if (state.withdrawn) {
    return Result.succeed(Option.none())
  }

  return Result.succeed(Option.some(new Events.CommentWasWithdrawn(input)))
}

export const WithdrawComment = Commands.Command({
  name: 'Comments.withdrawComment',
  createFilter,
  foldState,
  decide,
})

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
