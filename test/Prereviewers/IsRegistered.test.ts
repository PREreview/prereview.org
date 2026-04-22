import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Either } from 'effect'
import * as Events from '../../src/Events.ts'
import * as _ from '../../src/Prereviewers/IsRegistered.ts'
import { OrcidId, Pseudonym } from '../../src/types/index.ts'

const input = OrcidId.OrcidId('0000-0002-1825-0097')

const imported = new Events.RegisteredPrereviewerImported({
  orcidId: input,
  pseudonym: Pseudonym.Pseudonym('Blue Panda'),
  registeredAt: Temporal.Now.instant(),
})

const importedDifferentPrereviewer = new Events.RegisteredPrereviewerImported({
  orcidId: OrcidId.OrcidId('0000-0002-6109-0367'),
  pseudonym: Pseudonym.Pseudonym('Blue Panda'),
  registeredAt: Temporal.Now.instant(),
})

test.each<[string, _.Input, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', input, [], false],
  ['imported', input, [imported], true],
  ['different PREreviewer imported', input, [importedDifferentPrereviewer], false],
])('%s', (_name, input, events, expected) => {
  const { query } = _.IsRegistered

  const actual = query(events, input)

  expect(actual).toStrictEqual(Either.right(expected))
})
