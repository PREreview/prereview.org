import { expect } from '@effect/vitest'
import { test } from '@fast-check/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either } from 'effect'
import * as Events from '../../src/Events.ts'
import * as _ from '../../src/Prereviewers/ListAllPrereviewersForStats.ts'
import { OrcidId, Pseudonym } from '../../src/types/index.ts'

const imported1 = new Events.RegisteredPrereviewerImported({
  orcidId: OrcidId.OrcidId('0000-0002-1825-0097'),
  pseudonym: Pseudonym.Pseudonym('Orange Panda'),
  registeredAt: Temporal.Now.instant().subtract({ hours: 1 }),
})

const registered2 = new Events.PrereviewerRegistered({
  orcidId: OrcidId.OrcidId('0000-0002-6109-0367'),
  pseudonym: Pseudonym.Pseudonym('Blue Panda'),
  registeredAt: Temporal.Now.instant(),
})

const imported3 = new Events.RegisteredPrereviewerImported({
  orcidId: OrcidId.OrcidId('0000-0003-4921-6155'),
  pseudonym: Pseudonym.Pseudonym('Green Panda'),
  registeredAt: 'not available from import source',
})

const imported1OptedInToReviewNotifications =
  new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests({
    orcidId: imported1.orcidId,
    optedInAt: Temporal.Now.instant().subtract({ hours: 1 }),
  })

const imported1OptedInAgainToReviewNotifications =
  new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests({
    ...imported1OptedInToReviewNotifications,
    optedInAt: Temporal.Now.instant().subtract({ minutes: 10 }),
  })

const imported1OptedOutOfReviewNotifications =
  new Events.PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests({
    orcidId: imported1.orcidId,
    optedOutAt: Temporal.Now.instant().subtract({ minutes: 30 }),
  })

const registered2OptedInToReviewNotifications =
  new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests({
    orcidId: registered2.orcidId,
    optedInAt: Temporal.Now.instant().subtract({ hours: 30 }),
  })

test.each<[string, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', [], []],
  [
    'imported',
    [imported1],
    [{ orcidId: imported1.orcidId, registeredAt: imported1.registeredAt, requestNotifications: 'not-opted-in' }],
  ],
  [
    'imported, request notifications',
    [imported1, imported1OptedInToReviewNotifications],
    [{ orcidId: imported1.orcidId, registeredAt: imported1.registeredAt, requestNotifications: 'opted-in' }],
  ],
  [
    'imported, request notifications opted out',
    [imported1, imported1OptedInToReviewNotifications, imported1OptedOutOfReviewNotifications],
    [{ orcidId: imported1.orcidId, registeredAt: imported1.registeredAt, requestNotifications: 'opted-out' }],
  ],
  [
    'imported, request notifications opted in again',
    [
      imported1,
      imported1OptedInToReviewNotifications,
      imported1OptedOutOfReviewNotifications,
      imported1OptedInAgainToReviewNotifications,
    ],
    [{ orcidId: imported1.orcidId, registeredAt: imported1.registeredAt, requestNotifications: 'opted-in' }],
  ],
  [
    'multiple registered',
    [imported1, registered2, imported3],
    [
      { orcidId: imported3.orcidId, registeredAt: imported3.registeredAt, requestNotifications: 'not-opted-in' },
      { orcidId: imported1.orcidId, registeredAt: imported1.registeredAt, requestNotifications: 'not-opted-in' },
      { orcidId: registered2.orcidId, registeredAt: registered2.registeredAt, requestNotifications: 'not-opted-in' },
    ],
  ],
  [
    'multiple registered, request notifications',
    [imported1, registered2, imported3, imported1OptedInToReviewNotifications, registered2OptedInToReviewNotifications],
    [
      { orcidId: imported3.orcidId, registeredAt: imported3.registeredAt, requestNotifications: 'not-opted-in' },
      { orcidId: imported1.orcidId, registeredAt: imported1.registeredAt, requestNotifications: 'opted-in' },
      { orcidId: registered2.orcidId, registeredAt: registered2.registeredAt, requestNotifications: 'opted-in' },
    ],
  ],
])('%s', (_name, events, expected) => {
  const { initialState, updateStateWithEvents, query } = _.ListAllPrereviewersForStats

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state)

  expect(actual).toStrictEqual(Either.right(expected))
})
