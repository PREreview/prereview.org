import { expect, test } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Either, type Option } from 'effect'
import type * as Events from '../../src/Events.ts'
import * as _ from '../../src/Prereviewers/ReplaceLegacyPseudonym.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Pseudonym } from '../../src/types/Pseudonym.ts'

const input = {
  orcidId: OrcidId('0000-0002-1825-0097'),
  replacedAt: Temporal.Now.instant(),
  pseudonym: Pseudonym('Orange Panda'),
} satisfies _.Input

test.fails.each<[string, ReadonlyArray<Events.Event>, _.Input, Either.Either<Option.Option<Events.Event>, _.Error>]>([
  ['no events', [], input, Either.left(new _.PrereviewerNotRegistered())],
])('%s', (_name, events, input, expected) => {
  const { foldState, decide } = _.ReplaceLegacyPseudonym

  const state = foldState(events, input)

  const actual = decide(state, input)

  expect(actual).toStrictEqual(expected)
})
