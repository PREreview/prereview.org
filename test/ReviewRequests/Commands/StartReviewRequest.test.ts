import { it } from '@fast-check/jest'
import { describe } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Option } from 'effect'
import type * as Events from '../../../src/Events.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
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

const started1 = new ReviewRequests.ReviewRequestForAPreprintWasStarted({
  startedAt: now,
  preprintId: preprintId1,
  reviewRequestId: requestId1,
  requesterId: commandRequester,
})

const started2 = new ReviewRequests.ReviewRequestForAPreprintWasStarted({
  startedAt: now,
  preprintId: commandPreprintId,
  reviewRequestId: requestId1,
  requesterId: requester1,
})

const started3 = new ReviewRequests.ReviewRequestForAPreprintWasStarted({
  startedAt: now,
  preprintId: commandPreprintId,
  reviewRequestId: commandRequestId,
  requesterId: requester1,
})

const importedByPrereviewer1 = new ReviewRequests.ReviewRequestByAPrereviewerWasImported({
  publishedAt: now.subtract({ hours: 200 }),
  preprintId: preprintId1,
  requester: {
    orcidId: commandRequester,
    persona: 'public',
  },
  reviewRequestId: requestId1,
})

const importedByPrereviewer2 = new ReviewRequests.ReviewRequestByAPrereviewerWasImported({
  publishedAt: now.subtract({ hours: 200 }),
  preprintId: commandPreprintId,
  requester: {
    orcidId: requester1,
    persona: 'public',
  },
  reviewRequestId: requestId1,
})

const importedByPrereviewer3 = new ReviewRequests.ReviewRequestByAPrereviewerWasImported({
  publishedAt: now.subtract({ hours: 200 }),
  preprintId: commandPreprintId,
  requester: {
    orcidId: requester1,
    persona: 'public',
  },
  reviewRequestId: commandRequestId,
})

const importedFromPreprintServer = new ReviewRequests.ReviewRequestFromAPreprintServerWasImported({
  publishedAt: now.subtract({ hours: 200 }),
  receivedFrom: new URL('http://example.com'),
  preprintId: preprintId1,
  requester: Option.some(importedRequester1),
  reviewRequestId: requestId1,
})

const received = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: now.subtract({ hours: 2 }),
  receivedFrom: new URL('http://example.com'),
  preprintId: preprintId1,
  requester: Option.some(importedRequester1),
  reviewRequestId: commandRequestId,
})

describe.each<[string, ReadonlyArray<Events.Event>]>([
  ['no events', []],
  ['same requester different preprint ID', [started1]],
  ['different requester same preprint ID', [started2]],
  ['same requester different preprint ID (imported)', [importedByPrereviewer1]],
  ['different requester same preprint ID (imported)', [importedByPrereviewer2]],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
])('review request has never been started (%s)', (_case, events) => {
  it.todo('starts the review request')
})

describe.each<[string, ReadonlyArray<Events.Event>]>([
  ['started event with matching id', [started3]],
  ['received event with matching id', [received]],
  ['imported by prereviewer event with matching id', [importedByPrereviewer3]],
  ['imported from preprint server event with matching id', [importedFromPreprintServer]],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
])('review request id already exists (%s)', (_case, events) => {
  it.todo('rejects the command with an error')
})
