import { expect } from '@effect/vitest'
import { test } from '@fast-check/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Either } from 'effect'
import * as Events from '../../src/Events.ts'
import * as _ from '../../src/Prereviewers/HasAPrereviewerOptedInToNotificationsForReviewsPublishedInResponseToRequests.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Pseudonym } from '../../src/types/Pseudonym.ts'

const now = Temporal.Now.instant()

const input = OrcidId('0000-0002-1825-0097')

const imported = new Events.RegisteredPrereviewerImported({
  orcidId: input,
  registeredAt: now,
  pseudonym: Pseudonym('Orange Panda'),
})

const registered = new Events.PrereviewerRegistered({
  orcidId: input,
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
  orcidId: input,
  optedInAt: now.subtract({ hours: 1 }),
})

const optedInAgain = new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests({
  ...optedIn,
  optedInAt: now.subtract({ minutes: 10 }),
})

const optedOut = new Events.PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests({
  orcidId: input,
  optedOutAt: now.subtract({ minutes: 30 }),
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

test.each<[string, _.Input, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', input, [], Either.left(new _.UnknownPrereviewer({}))],
  ['imported, not opted in', input, [imported], Either.right(new _.HasNotOptedIn())],
  ['registered, not opted in', input, [registered], Either.right(new _.HasNotOptedIn())],
  ['imported, opted in', input, [imported, optedIn], Either.right(new _.HasOptedIn())],
  ['registered, opted in', input, [registered, optedIn], Either.right(new _.HasOptedIn())],
  [
    'imported, opted in, different PREreviewer',
    input,
    [imported, importedDifferentPrereviewer, optedInDifferentPrereviewer],
    Either.right(new _.HasNotOptedIn()),
  ],
  [
    'registered, opted in, different PREreviewer',
    input,
    [registered, registeredDifferentPrereviewer, optedInDifferentPrereviewer],
    Either.right(new _.HasNotOptedIn()),
  ],
  ['imported, opted out', input, [imported, optedIn, optedOut], Either.right(new _.HasOptedOut())],
  ['registered, opted out', input, [registered, optedIn, optedOut], Either.right(new _.HasOptedOut())],
  [
    'imported, opted out, different PREreviewer',
    input,
    [imported, importedDifferentPrereviewer, optedInDifferentPrereviewer, optedOutDifferentPrereviewer],
    Either.right(new _.HasNotOptedIn()),
  ],
  [
    'registered, opted out, different PREreviewer',
    input,
    [registered, registeredDifferentPrereviewer, optedInDifferentPrereviewer, optedOutDifferentPrereviewer],
    Either.right(new _.HasNotOptedIn()),
  ],
  ['imported, opted in again', input, [imported, optedIn, optedOut, optedInAgain], Either.right(new _.HasOptedIn())],
  [
    'registered, opted in again',
    input,
    [registered, optedIn, optedOut, optedInAgain],
    Either.right(new _.HasOptedIn()),
  ],
  [
    'imported, opted in again, different PREreviewer',
    input,
    [
      imported,
      importedDifferentPrereviewer,
      optedInDifferentPrereviewer,
      optedOutDifferentPrereviewer,
      optedOutAgainDifferentPrereviewer,
    ],
    Either.right(new _.HasNotOptedIn()),
  ],
  [
    'registered, opted in again, different PREreviewer',
    input,
    [
      registered,
      registeredDifferentPrereviewer,
      optedInDifferentPrereviewer,
      optedOutDifferentPrereviewer,
      optedOutAgainDifferentPrereviewer,
    ],
    Either.right(new _.HasNotOptedIn()),
  ],
])('%s', (_name, input, events, expected) => {
  const { query } = _.HasAPrereviewerOptedInToNotificationsForReviewsPublishedInResponseToRequests

  const actual = query(events, input)

  expect(actual).toStrictEqual(expected)
})
