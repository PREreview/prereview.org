import { it } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Either, Option } from 'effect'
import type * as Events from '../../../src/Events.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as _ from '../../../src/ReviewRequests/Commands/ChoosePersona.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import { Doi, NonEmptyString, OrcidId, Uuid } from '../../../src/types/index.ts'

const commandPersona = 'pseudonym' as const

const requesterId1 = OrcidId.OrcidId('0000-0002-6109-0367')

const importedRequester1 = { name: NonEmptyString.NonEmptyString('Josiah Carberry') }

const commandRequestId = Uuid.Uuid('18174280-bb72-405b-8ff9-57e788a7a3eb')

const requestId1 = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')

const preprintId1 = new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/12345') })

const now = Temporal.Now.instant()

const started1 = new ReviewRequests.ReviewRequestForAPreprintWasStarted({
  startedAt: now,
  preprintId: preprintId1,
  reviewRequestId: requestId1,
  requesterId: requesterId1,
})

const started2 = new ReviewRequests.ReviewRequestForAPreprintWasStarted({
  startedAt: now,
  preprintId: preprintId1,
  reviewRequestId: commandRequestId,
  requesterId: requesterId1,
})

const chosen1 = new ReviewRequests.PersonaForAReviewRequestForAPreprintWasChosen({
  persona: commandPersona,
  reviewRequestId: commandRequestId,
})

const chosen2 = new ReviewRequests.PersonaForAReviewRequestForAPreprintWasChosen({
  persona: 'public',
  reviewRequestId: commandRequestId,
})

const chosen3 = new ReviewRequests.PersonaForAReviewRequestForAPreprintWasChosen({
  persona: 'pseudonym',
  reviewRequestId: commandRequestId,
})

const chosen4 = new ReviewRequests.PersonaForAReviewRequestForAPreprintWasChosen({
  persona: 'public',
  reviewRequestId: requestId1,
})

const importedByPrereviewer = new ReviewRequests.ReviewRequestByAPrereviewerWasImported({
  publishedAt: now.subtract({ hours: 200 }),
  preprintId: preprintId1,
  requester: {
    orcidId: requesterId1,
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

const published = new ReviewRequests.ReviewRequestForAPreprintWasPublished({
  publishedAt: now,
  reviewRequestId: commandRequestId,
})

const input = {
  persona: commandPersona,
  reviewRequestId: commandRequestId,
} satisfies _.Input

describe.each<[string, ReadonlyArray<Events.Event>]>([
  ['no events', []],
  ['other one started', [started1]],
  ['was received', [received]],
  ['imported by a PREreviewer', [importedByPrereviewer]],
  ['imported from a preprint server', [importedFromPreprintServer]],
])('review request has never been started (%s)', (_case, events) => {
  it('rejects the command with an error', () => {
    const { foldState, decide } = _.ChoosePersona

    const state = foldState(events, input)

    const actual = decide(state, input)

    expect(actual).toStrictEqual(Either.left(new ReviewRequests.UnknownReviewRequest({})))
  })
})

describe.each<[string, ReadonlyArray<Events.Event>]>([
  ['not chosen', [started2]],
  ['other chosen', [started2, chosen4]],
])('persona has not been chosen (%s)', (_case, events) => {
  it('chooses the persona', () => {
    const { foldState, decide } = _.ChoosePersona

    const state = foldState(events, input)

    const actual = decide(state, input)

    expect(actual).toStrictEqual(
      Either.right(
        Option.some(
          new ReviewRequests.PersonaForAReviewRequestForAPreprintWasChosen({
            persona: input.persona,
            reviewRequestId: commandRequestId,
          }),
        ),
      ),
    )
  })
})

describe('persona has been chosen', () => {
  describe.each<[string, ReadonlyArray<Events.Event>]>([
    ['once', [started2, chosen2]],
    ['twice', [started2, chosen1, chosen2]],
  ])('with a different persona (%s)', (_case, events) => {
    it('chooses the persona', () => {
      const { foldState, decide } = _.ChoosePersona

      const state = foldState(events, input)

      const actual = decide(state, input)

      expect(actual).toStrictEqual(
        Either.right(
          Option.some(
            new ReviewRequests.PersonaForAReviewRequestForAPreprintWasChosen({
              persona: input.persona,
              reviewRequestId: commandRequestId,
            }),
          ),
        ),
      )
    })
  })

  describe.each<[string, ReadonlyArray<Events.Event>]>([
    ['once', [started2, chosen1]],
    ['twice', [started2, chosen1, chosen2, chosen3]],
  ])('with the same persona (%s)', (_case, events) => {
    it('does nothing', () => {
      const { foldState, decide } = _.ChoosePersona

      const state = foldState(events, input)

      const actual = decide(state, input)

      expect(actual).toStrictEqual(Either.right(Option.none()))
    })
  })
})

describe.each<[string, ReadonlyArray<Events.Event>]>([
  ['with persona', [started2, chosen1, published]],
  ['without persona', [started2, published]],
])('review request has been published (%s)', (_case, events) => {
  it('rejects the command with an error', () => {
    const { foldState, decide } = _.ChoosePersona

    const state = foldState(events, input)

    const actual = decide(state, input)

    expect(actual).toStrictEqual(Either.left(new ReviewRequests.ReviewRequestHasBeenPublished({})))
  })
})
