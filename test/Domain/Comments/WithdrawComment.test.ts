import { Temporal } from '@js-temporal/polyfill'
import { Option, Result } from 'effect'
import * as Comments from '../../../src/Domain/Comments/index.ts'
import * as _ from '../../../src/Domain/Comments/WithdrawComment.ts'
import * as Events from '../../../src/Domain/Events/Events.ts'
import { html } from '../../../src/html.ts'
import { Doi } from '../../../src/types/Doi.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import { Uuid } from '../../../src/types/Uuid.ts'
import { expect, test } from '../../vitest.ts'

const input = {
  commentId: Uuid('e51a69b7-df03-4b89-b803-2f452767ecf8'),
  withdrawnAt: Temporal.Instant.from('2026-11-27T12:00:00Z'),
  reason: 'spam',
} satisfies _.Input

const started = new Events.CommentWasStarted({
  commentId: input.commentId,
  prereviewId: 123,
  authorId: OrcidId('0000-0002-1825-0097'),
})

const entered = new Events.CommentWasEntered({ commentId: input.commentId, comment: html`<p>Some comment.</p>` })

const assignedADoi = new Events.CommentWasAssignedADoi({
  commentId: input.commentId,
  id: 107286,
  doi: Doi('10.5072/zenodo.107286'),
})

const published = new Events.CommentWasPublished({
  commentId: input.commentId,
  publishedAt: Temporal.Instant.from('2026-11-26T12:00:00Z'),
})

const withdrawn = new Events.CommentWasWithdrawn(input)

const withdrawnAtADifferentTime = new Events.CommentWasWithdrawn({
  ...input,
  withdrawnAt: Temporal.Instant.from('2026-11-26T13:00:00Z'),
})

test.each<[string, ReadonlyArray<Events.Event>, Result.Result<Option.Option<Events.Event>, _.Error>]>([
  ['no events', [], Result.fail(new Comments.CommentHasNotBeenStarted())],
  ['started', [started, entered], Result.fail(new Comments.CommentHasNotBeenPublished())],
  ['being published', [started, entered, assignedADoi], Result.fail(new Comments.CommentHasNotBeenPublished())],
  [
    'published',
    [started, entered, assignedADoi, published],
    Result.succeed(Option.some(new Events.CommentWasWithdrawn(input))),
  ],
  ['already withdrawn', [started, entered, assignedADoi, published, withdrawn], Result.succeed(Option.none())],
  [
    'already withdrawn at a different time',
    [started, entered, assignedADoi, published, withdrawnAtADifferentTime],
    Result.succeed(Option.none()),
  ],
])('%s', (_name, events, expected) => {
  const { foldState, decide } = _.WithdrawComment

  const state = foldState(events, input)

  const actual = decide(state, input)

  expect(actual).toStrictEqual(expected)
})
