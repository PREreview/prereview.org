import { expect, test } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Either, Option } from 'effect'
import * as Events from '../../src/Events.ts'
import * as _ from '../../src/Prereviewers/OptOutOfNotificationsForReviewsPublishedInResponseToRequests.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Pseudonym } from '../../src/types/Pseudonym.ts'

const now = Temporal.Now.instant()

const input = {
  orcidId: OrcidId('0000-0002-1825-0097'),
  optedOutAt: now,
} satisfies _.Input

const imported = new Events.RegisteredPrereviewerImported({
  orcidId: input.orcidId,
  registeredAt: now,
  pseudonym: Pseudonym('Orange Panda'),
})

const registered = new Events.PrereviewerRegistered({
  orcidId: input.orcidId,
  registeredAt: now,
  pseudonym: Pseudonym('Orange Panda'),
})

const importedDifferentPrereviewer = new Events.RegisteredPrereviewerImported({
  orcidId: OrcidId('0000-0002-6109-0367'),
  pseudonym: Pseudonym('Blue Panda'),
  registeredAt: now,
})

const registeredDifferentPrereviewer = new Events.PrereviewerRegistered({
  orcidId: OrcidId('0000-0002-6109-0367'),
  pseudonym: Pseudonym('Blue Panda'),
  registeredAt: now,
})

const optedIn = new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests({
  orcidId: input.orcidId,
  optedInAt: now.subtract({ hours: 1 }),
})

const optedOut = new Events.PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests({
  orcidId: input.orcidId,
  optedOutAt: input.optedOutAt,
})

const optedInAgain = new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests({
  orcidId: input.orcidId,
  optedInAt: now,
})

const optedOutDifferentTimestamp =
  new Events.PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests({
    orcidId: input.orcidId,
    optedOutAt: now.subtract({ hours: 1 }),
  })

const optedInDifferentPrereviewer =
  new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests({
    orcidId: importedDifferentPrereviewer.orcidId,
    optedInAt: now.subtract({ hours: 1 }),
  })

const optedOutDifferentPrereviewer =
  new Events.PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests({
    orcidId: importedDifferentPrereviewer.orcidId,
    optedOutAt: now.subtract({ hours: 30 }),
  })

const optedOutAgainDifferentPrereviewer =
  new Events.PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests({
    orcidId: importedDifferentPrereviewer.orcidId,
    optedOutAt: now.subtract({ hours: 10 }),
  })

test.each<[string, ReadonlyArray<Events.Event>, _.Input, Either.Either<Option.Option<Events.Event>, _.Error>]>([
  ['no events', [], input, Either.left(new _.UnknownPrereviewer())],
  [
    'imported, not opted in',
    [imported],
    input,
    Either.right(
      Option.some(new Events.PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
    ),
  ],
  [
    'registered, not opted in',
    [registered],
    input,
    Either.right(
      Option.some(new Events.PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
    ),
  ],
  [
    'imported, opted in',
    [imported, optedIn],
    input,
    Either.right(
      Option.some(new Events.PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
    ),
  ],
  [
    'registered, opted in',
    [registered, optedIn],
    input,
    Either.right(
      Option.some(new Events.PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
    ),
  ],
  ['imported, opted out, same details', [imported, optedOut], input, Either.right(Option.none())],
  ['registered, opted out, same details', [registered, optedOut], input, Either.right(Option.none())],
  ['imported, opted in and out, same details', [imported, optedIn, optedOut], input, Either.right(Option.none())],
  ['registered, opted in and out, same details', [registered, optedIn, optedOut], input, Either.right(Option.none())],
  [
    'imported, opted in and out, different timestamp',
    [imported, optedIn, optedOutDifferentTimestamp],
    input,
    Either.right(Option.none()),
  ],
  [
    'registered, opted in and out, different timestamp',
    [registered, optedIn, optedOutDifferentTimestamp],
    input,
    Either.right(Option.none()),
  ],
  [
    'imported, opted in and out, different PREreviewer',
    [imported, importedDifferentPrereviewer, optedInDifferentPrereviewer, optedOutDifferentPrereviewer],
    input,
    Either.right(
      Option.some(new Events.PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
    ),
  ],
  [
    'registered, opted in and out, different PREreviewer',
    [registered, registeredDifferentPrereviewer, optedInDifferentPrereviewer, optedOutDifferentPrereviewer],
    input,
    Either.right(
      Option.some(new Events.PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
    ),
  ],
  [
    'imported, opted in again',
    [imported, optedIn, optedOutDifferentTimestamp, optedInAgain],
    input,
    Either.right(
      Option.some(new Events.PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
    ),
  ],
  [
    'registered, opted in again',
    [registered, optedIn, optedOutDifferentTimestamp, optedInAgain],
    input,
    Either.right(
      Option.some(new Events.PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
    ),
  ],
  [
    'imported, opted in again, different PREreviewer',
    [
      imported,
      importedDifferentPrereviewer,
      optedInDifferentPrereviewer,
      optedOutDifferentPrereviewer,
      optedOutAgainDifferentPrereviewer,
    ],
    input,
    Either.right(
      Option.some(new Events.PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
    ),
  ],
  [
    'registered, opted in again, different PREreviewer',
    [
      registered,
      registeredDifferentPrereviewer,
      optedInDifferentPrereviewer,
      optedOutDifferentPrereviewer,
      optedOutAgainDifferentPrereviewer,
    ],
    input,
    Either.right(
      Option.some(new Events.PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
    ),
  ],
])('%s', (_name, events, input, expected) => {
  const { foldState, decide } = _.OptOutOfNotificationsForReviewsPublishedInResponseToRequests

  const state = foldState(events, input)

  const actual = decide(state, input)

  expect(actual).toStrictEqual(expected)
})
