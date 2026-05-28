import { expect, test } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Either, type Option } from 'effect'
import * as _ from '../../src/AuthorInvites/AcceptInvite.ts'
import type * as Events from '../../src/Events.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Uuid } from '../../src/types/Uuid.ts'

const input = {
  invitationId: Uuid('4ecba4c3-f0f7-4631-8011-58e7a0a62e6a'),
  orcidId: OrcidId('0000-0002-1825-0097'),
  acceptedAt: Temporal.Now.instant(),
} satisfies _.Input

test.fails.each<[string, ReadonlyArray<Events.Event>, _.Input, Either.Either<Option.Option<Events.Event>, _.Error>]>([
  ['no events', [], input, Either.left(new _.InvitationNotFound())],
])('%s', (_name, events, input, expected) => {
  const { foldState, decide } = _.AcceptInvite

  const state = foldState(events, input)

  const actual = decide(state, input)

  expect(actual).toStrictEqual(expected)
})
