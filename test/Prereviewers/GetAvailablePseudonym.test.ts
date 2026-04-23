import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
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
  orcidId: OrcidId.OrcidId('0000-0002-6109-0367'),
  pseudonym: Pseudonym.Pseudonym('Blue Sheep'),
  registeredAt: Temporal.Now.instant().subtract({ hours: 1 }),
})

const possiblePseudonyms = [Pseudonym.Pseudonym('Orange Panda'), Pseudonym.Pseudonym('Blue Sheep')]

test.each<[string, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', [], Either.right(Pseudonym.Pseudonym('Orange Panda'))],
  ['first pseudonym used', [imported1], Either.right(Pseudonym.Pseudonym('Blue Sheep'))],
  ['second pseudonym used', [imported2], Either.right(Pseudonym.Pseudonym('Orange Panda'))],
  ['all pseudonyms used', [imported1, imported2], Either.left(new _.NoPseudonymAvailable())],
])('%s', (_name, events, expected) => {
  const { initialState, updateStateWithEvents, query } = _.GetAvailablePseudonym(possiblePseudonyms)

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state)

  expect(actual).toStrictEqual(expected)
})
