import { expect, test } from '../vitest.ts'
import { Temporal } from '@js-temporal/polyfill'
import { Result, Option } from 'effect'
import * as Events from '../../src/Events.ts'
import * as _ from '../../src/Prereviewers/OptInToNotificationsForReviewsPublishedInResponseToRequests.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Pseudonym } from '../../src/types/Pseudonym.ts'

const now = Temporal.Now.instant()

const input = {
  orcidId: OrcidId('0000-0002-1825-0097'),
  optedInAt: now,
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
  optedInAt: input.optedInAt,
})

const optedInDifferentTime = new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests({
  ...optedIn,
  optedInAt: now.subtract({ hours: 1 }),
})

const optedOut = new Events.PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests({
  orcidId: input.orcidId,
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

test.each<[string, ReadonlyArray<Events.Event>, _.Input, Result.Result<Option.Option<Events.Event>, _.Error>]>([
  ['no events', [], input, Result.fail(new _.UnknownPrereviewer())],
  [
    'imported, not opted in',
    [imported],
    input,
    Result.succeed(
      Option.some(new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
    ),
  ],
  [
    'registered, not opted in',
    [registered],
    input,
    Result.succeed(
      Option.some(new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
    ),
  ],
  ['imported, opted in, same details', [imported, optedIn], input, Result.succeed(Option.none())],
  ['registered, opted in, same details', [registered, optedIn], input, Result.succeed(Option.none())],
  ['imported, opted in, different timestamp', [imported, optedInDifferentTime], input, Result.succeed(Option.none())],
  [
    'registered, opted in, different timestamp',
    [registered, optedInDifferentTime],
    input,
    Result.succeed(Option.none()),
  ],
  [
    'imported, opted in, different PREreviewer',
    [imported, importedDifferentPrereviewer, optedInDifferentPrereviewer],
    input,
    Result.succeed(
      Option.some(new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
    ),
  ],
  [
    'registered, opted in, different PREreviewer',
    [registered, registeredDifferentPrereviewer, optedInDifferentPrereviewer],
    input,
    Result.succeed(
      Option.some(new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
    ),
  ],
  [
    'imported, opted out',
    [imported, optedOut],
    input,
    Result.succeed(
      Option.some(new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
    ),
  ],
  [
    'registered, opted out',
    [registered, optedOut],
    input,
    Result.succeed(
      Option.some(new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
    ),
  ],
  [
    'imported, opted in and out',
    [imported, optedIn, optedOut],
    input,
    Result.succeed(
      Option.some(new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
    ),
  ],
  [
    'registered, opted in and out',
    [registered, optedIn, optedOut],
    input,
    Result.succeed(
      Option.some(new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
    ),
  ],
  [
    'imported, opted in and out, different PREreviewer',
    [imported, importedDifferentPrereviewer, optedInDifferentPrereviewer, optedOutDifferentPrereviewer],
    input,
    Result.succeed(
      Option.some(new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
    ),
  ],
  [
    'registered, opted in and out, different PREreviewer',
    [registered, registeredDifferentPrereviewer, optedInDifferentPrereviewer, optedOutDifferentPrereviewer],
    input,
    Result.succeed(
      Option.some(new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
    ),
  ],
  [
    'imported, opted in again',
    [imported, optedInDifferentTime, optedOut, optedIn],
    input,
    Result.succeed(Option.none()),
  ],
  [
    'registered, opted in again',
    [registered, optedInDifferentTime, optedOut, optedIn],
    input,
    Result.succeed(Option.none()),
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
    Result.succeed(
      Option.some(new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
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
    Result.succeed(
      Option.some(new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
    ),
  ],
])('%s', (_name, events, input, expected) => {
  const { foldState, decide } = _.OptInToNotificationsForReviewsPublishedInResponseToRequests

  const state = foldState(events, input)

  const actual = decide(state, input)

  expect(actual).toStrictEqual(expected)
})
