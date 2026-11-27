import { Temporal } from '@js-temporal/polyfill'
import { Option, Result } from 'effect'
import * as _ from '../../../../src/Domain/Comments/GetDataForZenodoRecord/Query.ts'
import * as Comments from '../../../../src/Domain/Comments/index.ts'
import * as Events from '../../../../src/Domain/Events/Events.ts'
import { Queries } from '../../../../src/Domain/Events/index.ts'
import { html } from '../../../../src/html.ts'
import { Doi } from '../../../../src/types/Doi.ts'
import { NonEmptyString, OrcidId, Uuid } from '../../../../src/types/index.ts'
import { expect, test } from '../../../vitest.ts'

const commentId = Uuid.Uuid('e51a69b7-df03-4b89-b803-2f452767ecf8')
const otherCommentId = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')

const started = new Events.CommentWasStarted({ commentId, prereviewId: 123, authorId })
const entered = new Events.CommentWasEntered({ commentId, comment: html`<p>Some comment.</p>` })
const enteredAgain = new Events.CommentWasEntered({ commentId, comment: html`<p>Some other comment.</p>` })
const personaChosen = new Events.PersonaForCommentWasChosen({ commentId, persona: 'pseudonym' })
const competingInterestsDeclared = new Events.CompetingInterestsForCommentWereDeclared({
  commentId,
  competingInterests: Option.some(NonEmptyString.NonEmptyString('Some competing interests')),
})
const codeOfConductAgreed = new Events.CodeOfConductForCommentWasAgreed({ commentId })
const verifiedEmailAddressConfirmed = new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId })
const publicationRequested = new Events.PublicationOfCommentWasRequested({ commentId })
const doiAssigned = new Events.CommentWasAssignedADoi({ commentId, id: 107286, doi: Doi('10.5072/zenodo.107286') })
const published = new Events.CommentWasPublished({ commentId })
const withdrawn = new Events.CommentWasWithdrawn({
  commentId,
  withdrawnAt: Temporal.Instant.from('2026-11-27T12:00:00Z'),
  reason: 'spam',
})
const otherCommentStarted = new Events.CommentWasStarted({ commentId: otherCommentId, prereviewId: 456, authorId })

const readyForPublication = [
  started,
  entered,
  personaChosen,
  competingInterestsDeclared,
  codeOfConductAgreed,
  verifiedEmailAddressConfirmed,
]

const expected: _.DataForZenodoRecord = {
  authorId,
  persona: 'pseudonym',
  prereviewId: 123,
  comment: html`<p>Some comment.</p>`,
  competingInterests: Option.some(NonEmptyString.NonEmptyString('Some competing interests')),
}

test.each<[string, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', [], Result.fail(new Comments.CommentHasNotBeenStarted())],
  ['only another comment', [otherCommentStarted], Result.fail(new Comments.CommentHasNotBeenStarted())],
  ['in progress', [started, entered], Result.fail(new Comments.CommentIsIncomplete())],
  ['ready, but not requested', readyForPublication, Result.fail(new Comments.CommentIsIncomplete())],
  ['publication requested', [...readyForPublication, publicationRequested], Result.succeed(expected)],
  [
    'publication requested, alongside another comment',
    [otherCommentStarted, ...readyForPublication, publicationRequested],
    Result.succeed(expected),
  ],
  [
    'comment entered again',
    [...readyForPublication, enteredAgain, publicationRequested],
    Result.succeed({ ...expected, comment: html`<p>Some other comment.</p>` }),
  ],
  ['DOI assigned', [...readyForPublication, publicationRequested, doiAssigned], Result.succeed(expected)],
  [
    'already published',
    [...readyForPublication, publicationRequested, doiAssigned, published],
    Result.fail(new Comments.CommentWasAlreadyPublished()),
  ],
  [
    'withdrawn',
    [...readyForPublication, publicationRequested, doiAssigned, published, withdrawn],
    Result.fail(new Comments.CommentHasBeenWithdrawn()),
  ],
  [
    'requested without a comment',
    [started, personaChosen, competingInterestsDeclared, publicationRequested],
    Result.fail(new Queries.UnexpectedSequenceOfEvents({})),
  ],
])('%s', (_name, events, expected) => {
  const actual = _.GetDataForZenodoRecord.query(events, commentId)

  expect(actual).toStrictEqual(expected)
})
