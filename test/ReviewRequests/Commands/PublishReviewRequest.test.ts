import { it } from '@fast-check/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Either, Option } from 'effect'
import { describe, expect } from 'vitest'
import type * as Events from '../../../src/Events.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as _ from '../../../src/ReviewRequests/Commands/PublishReviewRequest.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import { Doi, NonEmptyString, OrcidId, Uuid } from '../../../src/types/index.ts'

const commandRequester = OrcidId.OrcidId('0000-0002-6109-0367')

const requester1 = OrcidId.OrcidId('0000-0002-1825-0097')

const importedRequester1 = { name: NonEmptyString.NonEmptyString('Josiah Carberry') }

const commandRequestId = Uuid.Uuid('18174280-bb72-405b-8ff9-57e788a7a3eb')

const requestId1 = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')

const preprintId1 = new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/12345') })

const commandPreprintId = new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/1234567') })

const now = Temporal.Now.instant()

const started = new ReviewRequests.ReviewRequestForAPreprintWasStarted({
  startedAt: now,
  preprintId: commandPreprintId,
  reviewRequestId: commandRequestId,
  requesterId: requester1,
})

const persona1 = new ReviewRequests.PersonaForAReviewRequestForAPreprintWasChosen({
  persona: 'pseudonym',
  reviewRequestId: commandRequestId,
})

const persona2 = new ReviewRequests.PersonaForAReviewRequestForAPreprintWasChosen({
  persona: 'public',
  reviewRequestId: commandRequestId,
})

const persona3 = new ReviewRequests.PersonaForAReviewRequestForAPreprintWasChosen({
  persona: 'pseudonym',
  reviewRequestId: requestId1,
})

const published1 = new ReviewRequests.ReviewRequestForAPreprintWasPublished({
  publishedAt: now,
  reviewRequestId: commandRequestId,
})

const published2 = new ReviewRequests.ReviewRequestForAPreprintWasPublished({
  publishedAt: now,
  reviewRequestId: requestId1,
})

const importedByPrereviewer = new ReviewRequests.ReviewRequestByAPrereviewerWasImported({
  publishedAt: now.subtract({ hours: 200 }),
  preprintId: preprintId1,
  requester: {
    orcidId: commandRequester,
    persona: 'public',
  },
  reviewRequestId: requestId1,
})

const importedFromPreprintServer = new ReviewRequests.ReviewRequestFromAPreprintServerWasImported({
  publishedAt: now.subtract({ hours: 200 }),
  receivedFrom: new URL('http://example.com'),
  preprintId: preprintId1,
  requester: Option.some(importedRequester1),
  reviewRequestId: commandRequestId,
})

const received = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: now.subtract({ hours: 2 }),
  receivedFrom: new URL('http://example.com'),
  preprintId: preprintId1,
  requester: Option.some(importedRequester1),
  reviewRequestId: commandRequestId,
})

const input = {
  publishedAt: now,
  reviewRequestId: commandRequestId,
} satisfies _.Input

describe.each<[string, ReadonlyArray<Events.Event>]>([
  ['no events', []],
  ['was received', [received]],
  ['imported by a PREreviewer', [importedByPrereviewer]],
  ['imported from a preprint server', [importedFromPreprintServer]],
])('review request has never been started (%s)', (_case, events) => {
  it('rejects the command with an error', () => {
    const { foldState, decide } = _.PublishReviewRequest

    const state = foldState(events, input)

    const actual = decide(state, input)

    expect(actual).toStrictEqual(Either.left(new ReviewRequests.UnknownReviewRequest({})))
  })
})

describe.each<[string, ReadonlyArray<Events.Event>, ReviewRequests.ReviewRequestNotReadyToBePublished['missing']]>([
  ['missing a persona', [started], ['PersonaForAReviewRequestForAPreprintWasChosen']],
  ["another request's persona", [started, persona3], ['PersonaForAReviewRequestForAPreprintWasChosen']],
])('not ready to be published (%s)', (_case, events, expectedMissing) => {
  it('rejects the command with an error', () => {
    const { foldState, decide } = _.PublishReviewRequest

    const state = foldState(events, input)

    const actual = decide(state, input)

    expect(actual).toStrictEqual(
      Either.left(new ReviewRequests.ReviewRequestNotReadyToBePublished({ missing: expectedMissing })),
    )
  })
})

describe.each<[string, ReadonlyArray<Events.Event>]>([
  ['one choice', [started, persona1]],
  ['multiple choices', [started, persona1, persona2]],
  ['another request already published', [started, persona1, published2]],
])('is ready to be published (%s)', (_case, events) => {
  it('published the request', () => {
    const { foldState, decide } = _.PublishReviewRequest

    const state = foldState(events, input)

    const actual = decide(state, input)

    expect(actual).toStrictEqual(
      Either.right(
        Option.some(
          new ReviewRequests.ReviewRequestForAPreprintWasPublished({
            publishedAt: input.publishedAt,
            reviewRequestId: input.reviewRequestId,
          }),
        ),
      ),
    )
  })
})

describe.each<[string, ReadonlyArray<Events.Event>]>([
  ['already published', [started, persona1, published1]],
  ['missing a persona', [started, published1]],
])('has been published (%s)', (_case, events) => {
  it('rejects the command with an error', () => {
    const { foldState, decide } = _.PublishReviewRequest

    const state = foldState(events, input)

    const actual = decide(state, input)

    expect(actual).toStrictEqual(Either.left(new ReviewRequests.ReviewRequestHasBeenPublished({})))
  })
})
