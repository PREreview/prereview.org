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

test.each<[string, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', [], []],
  ['imported', [imported1], [{ orcidId: imported1.orcidId, registeredAt: imported1.registeredAt }]],
  [
    'multiple registered',
    [imported1, registered2, imported3],
    [
      { orcidId: imported3.orcidId, registeredAt: imported3.registeredAt },
      { orcidId: imported1.orcidId, registeredAt: imported1.registeredAt },
      { orcidId: registered2.orcidId, registeredAt: registered2.registeredAt },
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
