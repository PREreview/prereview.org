import { expect } from '@effect/vitest'
import { test } from '@fast-check/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either } from 'effect'
import * as Events from '../../src/Events.ts'
import * as _ from '../../src/Prereviewers/GetAvailablePseudonym.ts'
import { OrcidId, Pseudonym } from '../../src/types/index.ts'

const imported1 = new Events.RegisteredPrereviewerImported({
  orcidId: OrcidId.OrcidId('0000-0002-1825-0097'),
  pseudonym: Pseudonym.Pseudonym('Orange Panda'),
  registeredAt: Temporal.Now.instant().subtract({ hours: 1 }),
})

const imported2 = new Events.RegisteredPrereviewerImported({
  orcidId: OrcidId.OrcidId('0000-0002-5753-2556'),
  pseudonym: Pseudonym.Pseudonym('Orange Panda 1'),
  registeredAt: Temporal.Now.instant().subtract({ hours: 1 }),
})

const registered2 = new Events.PrereviewerRegistered({
  orcidId: OrcidId.OrcidId('0000-0002-6109-0367'),
  pseudonym: Pseudonym.Pseudonym('Blue Sheep'),
  registeredAt: Temporal.Now.instant().subtract({ hours: 1 }),
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const imported2replaced = new Events.LegacyPseudonymReplaced({
  orcidId: OrcidId.OrcidId('0000-0002-5753-2556'),
  pseudonym: Pseudonym.Pseudonym('Green Horse'),
  replacedAt: Temporal.Now.instant().subtract({ hours: 1 }),
})

const possiblePseudonyms = new Set([
  Pseudonym.Pseudonym('Orange Panda'),
  Pseudonym.Pseudonym('Blue Sheep'),
  Pseudonym.Pseudonym('Green Horse'),
])

test.each<[string, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', [], Either.right(Pseudonym.Pseudonym('Orange Panda'))],
  ['first pseudonym used', [imported1], Either.right(Pseudonym.Pseudonym('Blue Sheep'))],
  ['second pseudonym used', [registered2], Either.right(Pseudonym.Pseudonym('Orange Panda'))],
  ['legacy pseudonym in use', [imported1, imported2, registered2], Either.right(Pseudonym.Pseudonym('Green Horse'))],
  [
    'all pseudonyms used',
    [imported1, registered2, imported2, imported2replaced],
    Either.left(new _.NoPseudonymAvailable()),
  ],
])('%s', (_name, events, expected) => {
  const { initialState, updateStateWithEvents, query } = _.GetAvailablePseudonym(possiblePseudonyms)

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state)

  expect(actual).toStrictEqual(expected)
})
