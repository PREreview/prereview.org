import { expect, test } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Either, Option } from 'effect'
import * as Events from '../../src/Events.ts'
import * as _ from '../../src/Prereviewers/ReplaceLegacyPseudonym.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Pseudonym } from '../../src/types/Pseudonym.ts'

const input = {
  orcidId: OrcidId('0000-0002-1825-0097'),
  replacedAt: Temporal.Now.instant(),
  pseudonym: Pseudonym('Orange Panda'),
} satisfies _.Input

const importWithLegacy = new Events.RegisteredPrereviewerImported({
  orcidId: input.orcidId,
  registeredAt: 'not available from import source',
  pseudonym: Pseudonym('Orange Panda 0'),
})

const importWithSameNonLegacy = new Events.RegisteredPrereviewerImported({
  orcidId: input.orcidId,
  registeredAt: 'not available from import source',
  pseudonym: input.pseudonym,
})

const importWithDifferentNonLegacy = new Events.RegisteredPrereviewerImported({
  orcidId: input.orcidId,
  registeredAt: 'not available from import source',
  pseudonym: Pseudonym('Green Horse'),
})

const replacedWithSame = new Events.LegacyPseudonymReplaced({
  orcidId: input.orcidId,
  replacedAt: Temporal.Now.instant(),
  pseudonym: input.pseudonym,
})

const replacedWithDifferent = new Events.LegacyPseudonymReplaced({
  orcidId: input.orcidId,
  replacedAt: Temporal.Now.instant(),
  pseudonym: Pseudonym('Green Horse'),
})

const registered = new Events.PrereviewerRegistered({
  orcidId: input.orcidId,
  registeredAt: Temporal.Now.instant(),
  pseudonym: Pseudonym('Orange Panda'),
})

const otherPrereviewerImportedWithSame = new Events.RegisteredPrereviewerImported({
  orcidId: OrcidId('0000-0002-6109-0367'),
  registeredAt: Temporal.Now.instant(),
  pseudonym: input.pseudonym,
})

const otherPrereviewerRegisteredWithSame = new Events.PrereviewerRegistered({
  orcidId: OrcidId('0000-0002-6109-0367'),
  registeredAt: Temporal.Now.instant(),
  pseudonym: input.pseudonym,
})

const otherPrereviewerImportedWithLegacy = new Events.RegisteredPrereviewerImported({
  orcidId: OrcidId('0000-0002-6109-0367'),
  registeredAt: Temporal.Now.instant(),
  pseudonym: Pseudonym('Orange Panda 0'),
})

const otherPrereviewerReplacedWithSame = new Events.LegacyPseudonymReplaced({
  orcidId: OrcidId('0000-0002-6109-0367'),
  replacedAt: Temporal.Now.instant(),
  pseudonym: input.pseudonym,
})

test.fails.each<[string, ReadonlyArray<Events.Event>, _.Input, Either.Either<Option.Option<Events.Event>, _.Error>]>([
  ['no events', [], input, Either.left(new _.PrereviewerNotRegistered())],
  [
    'imported with legacy pseudonym',
    [importWithLegacy],
    input,
    Either.right(Option.some(new Events.LegacyPseudonymReplaced(input))),
  ],
  ['imported with same non-legacy pseudonym', [importWithSameNonLegacy], input, Either.right(Option.none())],
  [
    'imported with different non-legacy pseudonym',
    [importWithDifferentNonLegacy],
    input,
    Either.left(new _.PrereviewerDoesNotHaveLegacyPseudonym()),
  ],
  ['already replaced with same pseudonym', [importWithLegacy, replacedWithSame], input, Either.right(Option.none())],
  [
    'already replaced with different pseudonym',
    [importWithLegacy, replacedWithDifferent],
    input,
    Either.left(new _.PrereviewerDoesNotHaveLegacyPseudonym()),
  ],
  ['registered rather than imported', [registered], input, Either.left(new _.PrereviewerDoesNotHaveLegacyPseudonym())],
  [
    'pseudonym already in use by imported PREreviewer',
    [importWithLegacy, otherPrereviewerImportedWithSame],
    input,
    Either.left(new _.PseudonymAlreadyInUse()),
  ],
  [
    'pseudonym already in use by registered PREreviewer',
    [importWithLegacy, otherPrereviewerRegisteredWithSame],
    input,
    Either.left(new _.PseudonymAlreadyInUse()),
  ],
  [
    'pseudonym already in use by a legacy replacement',
    [importWithLegacy, otherPrereviewerImportedWithLegacy, otherPrereviewerReplacedWithSame],
    input,
    Either.left(new _.PseudonymAlreadyInUse()),
  ],
])('%s', (_name, events, input, expected) => {
  const { foldState, decide } = _.ReplaceLegacyPseudonym

  const state = foldState(events, input)

  const actual = decide(state, input)

  expect(actual).toStrictEqual(expected)
})
