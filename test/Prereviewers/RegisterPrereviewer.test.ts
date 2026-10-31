import { expect, test } from '../vitest.ts'
import { Temporal } from '@js-temporal/polyfill'
import { Result, Option } from 'effect'
import * as Events from '../../src/Events.ts'
import * as _ from '../../src/Prereviewers/RegisterPrereviewer.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Pseudonym } from '../../src/types/Pseudonym.ts'

const input = {
  orcidId: OrcidId('0000-0002-1825-0097'),
  registeredAt: Temporal.Now.instant(),
  pseudonym: Pseudonym('Orange Panda'),
} satisfies _.Input

const imported = new Events.RegisteredPrereviewerImported(input)
const registered = new Events.PrereviewerRegistered(input)

const importedLegacy = new Events.RegisteredPrereviewerImported({
  orcidId: OrcidId('0000-0002-6109-0367'),
  registeredAt: Temporal.Now.instant(),
  pseudonym: Pseudonym('Orange Panda 0'),
})

const legacyReplaced = new Events.LegacyPseudonymReplaced({
  orcidId: OrcidId('0000-0002-6109-0367'),
  replacedAt: Temporal.Now.instant(),
  pseudonym: Pseudonym('Orange Panda'),
})

const importedDifferentTime = new Events.RegisteredPrereviewerImported({
  ...input,
  registeredAt: input.registeredAt.subtract({ hours: 1 }),
})
const registeredDifferentTime = new Events.PrereviewerRegistered({
  ...input,
  registeredAt: input.registeredAt.subtract({ hours: 1 }),
})

const importedWithoutRegisteredAt = new Events.RegisteredPrereviewerImported({
  ...input,
  registeredAt: 'not available from import source',
})

const importedDifferentPseudonym = new Events.RegisteredPrereviewerImported({
  ...input,
  pseudonym: Pseudonym('Blue Panda'),
})
const registeredDifferentPseudonym = new Events.PrereviewerRegistered({
  ...input,
  pseudonym: Pseudonym('Blue Panda'),
})

const importedDifferentOrcidId = new Events.RegisteredPrereviewerImported({
  ...input,
  orcidId: OrcidId('0000-0002-6109-0367'),
})
const registeredDifferentOrcidId = new Events.PrereviewerRegistered({
  ...input,
  orcidId: OrcidId('0000-0002-6109-0367'),
})

const importedDifferentPrereviewer = new Events.RegisteredPrereviewerImported({
  orcidId: OrcidId('0000-0002-6109-0367'),
  pseudonym: Pseudonym('Blue Panda'),
  registeredAt: Temporal.Now.instant(),
})
const registeredDifferentPrereviewer = new Events.PrereviewerRegistered({
  orcidId: OrcidId('0000-0002-6109-0367'),
  pseudonym: Pseudonym('Blue Panda'),
  registeredAt: Temporal.Now.instant(),
})

test.each<
  [
    string,
    ReadonlyArray<Events.Event>,
    _.Input,
    Result.Result<Option.Option<Events.Event>, _.PseudonymAlreadyInUse | _.MismatchWithExistingDataForOrcid>,
  ]
>([
  ['no events', [], input, Result.succeed(Option.some(new Events.PrereviewerRegistered(input)))],
  [
    'different PREreviewer imported',
    [importedDifferentPrereviewer],
    input,
    Result.succeed(Option.some(new Events.PrereviewerRegistered(input))),
  ],
  [
    'different PREreviewer registered',
    [registeredDifferentPrereviewer],
    input,
    Result.succeed(Option.some(new Events.PrereviewerRegistered(input))),
  ],
  ['already imported, same details', [imported], input, Result.succeed(Option.none())],
  ['already registered, same details', [registered], input, Result.succeed(Option.none())],
  [
    'already imported, different registeredAt',
    [importedDifferentTime],
    input,
    Result.fail(
      new _.MismatchWithExistingDataForOrcid({
        existingPseudonym: input.pseudonym,
        existingRegisteredAt: importedDifferentTime.registeredAt,
      }),
    ),
  ],
  [
    'already registered, different registeredAt',
    [registeredDifferentTime],
    input,
    Result.fail(
      new _.MismatchWithExistingDataForOrcid({
        existingPseudonym: input.pseudonym,
        existingRegisteredAt: registeredDifferentTime.registeredAt,
      }),
    ),
  ],
  [
    'already imported, registeredAt was not available',
    [importedWithoutRegisteredAt],
    input,
    Result.fail(
      new _.MismatchWithExistingDataForOrcid({
        existingPseudonym: input.pseudonym,
        existingRegisteredAt: 'not available from import source',
      }),
    ),
  ],
  [
    'already imported, different pseudonym',
    [importedDifferentPseudonym],
    input,
    Result.fail(
      new _.MismatchWithExistingDataForOrcid({
        existingPseudonym: importedDifferentPseudonym.pseudonym,
        existingRegisteredAt: input.registeredAt,
      }),
    ),
  ],
  [
    'already registered, different pseudonym',
    [registeredDifferentPseudonym],
    input,
    Result.fail(
      new _.MismatchWithExistingDataForOrcid({
        existingPseudonym: registeredDifferentPseudonym.pseudonym,
        existingRegisteredAt: input.registeredAt,
      }),
    ),
  ],
  [
    'different orcid import with same pseudonym',
    [importedDifferentOrcidId],
    input,
    Result.fail(new _.PseudonymAlreadyInUse()),
  ],
  [
    'different orcid registered with same pseudonym',
    [registeredDifferentOrcidId],
    input,
    Result.fail(new _.PseudonymAlreadyInUse()),
  ],
  [
    'different orcid, but same pseudonym is use due to legacy pseudonym replacement',
    [importedLegacy, legacyReplaced],
    input,
    Result.fail(new _.PseudonymAlreadyInUse()),
  ],
])('%s', (_name, events, input, expected) => {
  const { foldState, decide } = _.RegisterPrereviewer

  const state = foldState(events, input)

  const actual = decide(state, input)

  expect(actual).toStrictEqual(expected)
})
