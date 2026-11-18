import { expect, test } from '../../vitest.ts'
import { Result } from 'effect'
import * as _ from '../../../src/Domain/Comments/GetCommentIdForDoi.ts'
import * as Events from '../../../src/Events.ts'
import { Doi, Uuid } from '../../../src/types/index.ts'

const doi = Doi.Doi('10.5281/zenodo.14198719')
const commentId = Uuid.Uuid('e51a69b7-df03-4b89-b803-2f452767ecf8')

test.each<[string, _.Input, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', doi, [], Result.fail(new _.CommentIsNotFound())],
  [
    'comment assigned the DOI',
    doi,
    [new Events.CommentWasAssignedADoi({ commentId, id: 14198719, doi })],
    Result.succeed(commentId),
  ],
  [
    'comment assigned the DOI, in a different case',
    Doi.Doi('10.5281/ZENODO.14198719'),
    [new Events.CommentWasAssignedADoi({ commentId, id: 14198719, doi })],
    Result.succeed(commentId),
  ],
  [
    'another comment assigned a different DOI',
    doi,
    [
      new Events.CommentWasAssignedADoi({
        commentId: Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753'),
        id: 14198720,
        doi: Doi.Doi('10.5281/zenodo.14198720'),
      }),
    ],
    Result.fail(new _.CommentIsNotFound()),
  ],
])('%s', (_name, input, events, expected) => {
  const { query } = _.GetCommentIdForDoi

  const actual = query(events, input)

  expect(actual).toStrictEqual(expected)
})
