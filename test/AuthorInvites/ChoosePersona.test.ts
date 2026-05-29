import { expect, test } from '@effect/vitest'
import { Either, type Option } from 'effect'
import * as _ from '../../src/AuthorInvites/ChoosePersona.ts'
import type * as Events from '../../src/Events.ts'
import { Uuid } from '../../src/types/Uuid.ts'

const input = {
  invitationId: Uuid('4ecba4c3-f0f7-4631-8011-58e7a0a62e6a'),
  persona: 'public',
} satisfies _.Input

test.fails.each<[string, ReadonlyArray<Events.Event>, _.Input, Either.Either<Option.Option<Events.Event>, _.Error>]>([
  ['no events', [], input, Either.left(new _.InvitationNotFound())],
])('%s', (_name, events, input, expected) => {
  const { foldState, decide } = _.ChoosePersona

  const state = foldState(events, input)

  const actual = decide(state, input)

  expect(actual).toStrictEqual(expected)
})
