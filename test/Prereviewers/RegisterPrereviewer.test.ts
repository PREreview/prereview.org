import { expect, test } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Either, Option } from 'effect'
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

test.failing.each<
  [
    string,
    ReadonlyArray<Events.Event>,
    _.Input,
    Either.Either<Option.Option<Events.Event>, _.PseudonymAlreadyInUse | _.MismatchWithExistingDataForOrcid>,
  ]
>([
  ['no events', [], input, Either.right(Option.some(new Events.RegisteredPrereviewerImported(input)))],
  [
    'different PREreviewer imported',
    [importedDifferentPrereviewer],
    input,
    Either.right(Option.some(new Events.PrereviewerRegistered(input))),
  ],
  [
    'different PREreviewer registered',
    [registeredDifferentPrereviewer],
    input,
    Either.right(Option.some(new Events.PrereviewerRegistered(input))),
  ],
  ['already imported, same details', [imported], input, Either.right(Option.none())],
  ['already registered, same details', [registered], input, Either.right(Option.none())],
  [
    'already imported, different registeredAt',
    [importedDifferentTime],
    input,
    Either.left(
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
    Either.left(
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
    Either.left(
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
    Either.left(
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
    Either.left(
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
    Either.left(new _.PseudonymAlreadyInUse()),
  ],
  [
    'different orcid registered with same pseudonym',
    [registeredDifferentOrcidId],
    input,
    Either.left(new _.PseudonymAlreadyInUse()),
  ],
])('%s', (_name, events, input, expected) => {
  const { foldState, decide } = _.RegisterPrereviewer

  const state = foldState(events, input)

  const actual = decide(state, input)

  expect(actual).toStrictEqual(expected)
})
