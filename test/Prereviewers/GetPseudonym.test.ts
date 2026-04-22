import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Either } from 'effect'
import * as Events from '../../src/Events.ts'
import * as _ from '../../src/Prereviewers/GetPseudonym.ts'
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
  ['no events', input, [], Either.left(new _.UnknownPrereviewer({}))],
  ['imported', input, [imported], Either.right(imported.pseudonym)],
  ['different PREreviewer imported', input, [importedDifferentPrereviewer], Either.left(new _.UnknownPrereviewer({}))],
])('%s', (_name, input, events, expected) => {
  const { query } = _.GetPseudonym

  const actual = query(events, input)

  expect(actual).toStrictEqual(expected)
})
