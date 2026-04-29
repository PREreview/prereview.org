import { test } from '@fast-check/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Either } from 'effect'
import { expect } from 'vitest'
import * as Events from '../../src/Events.ts'
import * as _ from '../../src/Prereviewers/CountAvailablePseudonyms.ts'
import { OrcidId, Pseudonym } from '../../src/types/index.ts'

const imported1 = new Events.RegisteredPrereviewerImported({
  orcidId: OrcidId.OrcidId('0000-0002-1825-0097'),
  pseudonym: Pseudonym.Pseudonym('Orange Panda'),
  registeredAt: Temporal.Now.instant().subtract({ hours: 1 }),
})

const imported2 = new Events.RegisteredPrereviewerImported({
  orcidId: OrcidId.OrcidId('0000-0002-1825-0097'),
  pseudonym: Pseudonym.Pseudonym('Orange Panda 1'),
  registeredAt: Temporal.Now.instant().subtract({ hours: 1 }),
})

const registered3 = new Events.PrereviewerRegistered({
  orcidId: OrcidId.OrcidId('0000-0002-6109-0367'),
  pseudonym: Pseudonym.Pseudonym('Blue Sheep'),
  registeredAt: Temporal.Now.instant().subtract({ hours: 1 }),
})

const possiblePseudonyms = new Set([Pseudonym.Pseudonym('Orange Panda'), Pseudonym.Pseudonym('Blue Sheep')])

test.each<[string, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', [], { used: 0, legacyUsed: 0, available: 2 }],
  ['first pseudonym used', [imported1], { used: 1, legacyUsed: 0, available: 1 }],
  ['second pseudonym used', [registered3], { used: 1, legacyUsed: 0, available: 1 }],
  ['all pseudonyms used', [imported1, imported2, registered3], { used: 2, legacyUsed: 1, available: 0 }],
])('%s', (_name, events, expected) => {
  const { query } = _.CountAvailablePseudonyms(possiblePseudonyms)

  const actual = query(events)

  expect(actual).toStrictEqual(Either.right(expected))
})
