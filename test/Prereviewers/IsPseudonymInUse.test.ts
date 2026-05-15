import { expect } from '@effect/vitest'
import { test } from '@fast-check/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either } from 'effect'
import * as Events from '../../src/Events.ts'
import * as _ from '../../src/Prereviewers/IsPseudonymInUse.ts'
import { OrcidId, Pseudonym } from '../../src/types/index.ts'

const input = Pseudonym.Pseudonym('Orange Panda')
const inputLegacy = Pseudonym.Pseudonym('Orange Panda 0')

const orcidId1 = OrcidId.OrcidId('0000-0002-1825-0097')
const orcidId2 = OrcidId.OrcidId('0000-0002-6109-0367')

const imported = new Events.RegisteredPrereviewerImported({
  orcidId: orcidId1,
  pseudonym: input,
  registeredAt: Temporal.Now.instant(),
})

const registered = new Events.PrereviewerRegistered({
  orcidId: orcidId1,
  pseudonym: input,
  registeredAt: Temporal.Now.instant(),
})

const importedDifferentPrereviewer = new Events.RegisteredPrereviewerImported({
  orcidId: orcidId2,
  pseudonym: Pseudonym.Pseudonym('Blue Panda'),
  registeredAt: Temporal.Now.instant(),
})

const registeredDifferentPrereviewer = new Events.PrereviewerRegistered({
  orcidId: orcidId2,
  pseudonym: Pseudonym.Pseudonym('Blue Panda'),
  registeredAt: Temporal.Now.instant(),
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const importedLegacy = new Events.RegisteredPrereviewerImported({
  orcidId: orcidId1,
  pseudonym: inputLegacy,
  registeredAt: Temporal.Now.instant(),
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const replaced = new Events.LegacyPseudonymReplaced({
  orcidId: orcidId1,
  pseudonym: input,
  replacedAt: Temporal.Now.instant(),
})

const importedSameWithNumber = new Events.RegisteredPrereviewerImported({
  orcidId: orcidId2,
  pseudonym: inputLegacy,
  registeredAt: Temporal.Now.instant(),
})

const orcid1rerolled = new Events.LegacyPseudonymReplaced({
  orcidId: orcidId1,
  pseudonym: Pseudonym.Pseudonym('Blue Panda'),
  replacedAt: Temporal.Now.instant(),
})

const orcid2replacedWithFreedUp = new Events.LegacyPseudonymReplaced({
  orcidId: orcidId2,
  pseudonym: input,
  replacedAt: Temporal.Now.instant(),
})

test.each<[string, _.Input, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', input, [], new _.PseudonymNotInUse()],
  ['imported', input, [imported], new _.PseudonymInUse()],
  // [
  //   'imported legacy replaced',
  //   inputLegacy,
  //   [importedLegacy, replaced],
  //   new _.PseudonymHasBeenReplaced({ replacedWith: input }),
  // ],
  ['registered', input, [registered], new _.PseudonymInUse()],
  ['different PREreviewer imported', input, [importedDifferentPrereviewer], new _.PseudonymNotInUse()],
  ['different PREreviewer registered', input, [registeredDifferentPrereviewer], new _.PseudonymNotInUse()],
])('%s', (_name, input, events, expected) => {
  const { initialState, updateStateWithEvents, query } = _.IsPseudonymInUse

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state, input)

  expect(actual).toStrictEqual(Either.right(expected))
})

test.each<[string, _.Result]>([
  ['Orange Panda', new _.PseudonymInUse()],
  // ['Orange Panda 0', new _.PseudonymHasBeenReplaced({replacedWith: Pseudonym.Pseudonym('Orange Panda')})],
  // ['Blue Panda', new _.PseudonymInUse()],
])('re-rolled scenario with input: %s', (input, expected) => {
  const { initialState, updateStateWithEvents, query } = _.IsPseudonymInUse

  const events = [imported, importedSameWithNumber, orcid1rerolled, orcid2replacedWithFreedUp]

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state, Pseudonym.Pseudonym(input))

  expect(actual).toStrictEqual(Either.right(expected))
})
