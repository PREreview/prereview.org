import { Array, Result } from 'effect'
import * as _ from '../../../../src/Domain/Comments/GetCommentIdForADoi/Query.ts'
import { CommentIsNotFound } from '../../../../src/Domain/Comments/GetCommentIdForADoi/Types.ts'
import * as Events from '../../../../src/Domain/Events/Events.ts'
import { Doi } from '../../../../src/types/Doi.ts'
import { Uuid } from '../../../../src/types/Uuid.ts'
import { expect, test } from '../../../vitest.ts'

const input = Doi('10.5281/zenodo.12345') satisfies _.Input

const commentId = Uuid('e51a69b7-df03-4b89-b803-2f452767ecf8')

const assigned = new Events.CommentWasAssignedADoi({ commentId, id: 12345, doi: input })

const assignedWithDifferentCase = new Events.CommentWasAssignedADoi({
  ...assigned,
  doi: Doi('10.5281/ZENODO.12345'),
})

const assignedOtherComment = new Events.CommentWasAssignedADoi({
  commentId: Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753'),
  id: 67890,
  doi: Doi('10.5281/zenodo.67890'),
})

test.each<[string, _.Input, ReadonlyArray<Events.Event>, Result.Result<_.Result, CommentIsNotFound>]>([
  ['no events', input, [], Result.fail(new CommentIsNotFound())],
  ['assigned', input, [assigned], Result.succeed(commentId)],
  ['assigned, DOI in a different case', input, [assignedWithDifferentCase], Result.succeed(commentId)],
  ['input in a different case', Doi('10.5281/ZENODO.12345'), [assigned], Result.succeed(commentId)],
  ['other comment assigned', input, [assignedOtherComment], Result.fail(new CommentIsNotFound())],
  ['both assigned', input, [assignedOtherComment, assigned], Result.succeed(commentId)],
])('%s', (_name, input, events, expected) => {
  const { initialState, updateStateWithEvents, query } = _.Query

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state, input)

  expect(actual).toStrictEqual(expected)
})
