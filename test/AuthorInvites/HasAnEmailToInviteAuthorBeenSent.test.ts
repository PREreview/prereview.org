import { expect } from '@effect/vitest'
import { test } from '@fast-check/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Either } from 'effect'
import * as _ from '../../src/AuthorInvites/HasAnEmailToInviteAuthorBeenSent.ts'
import * as Events from '../../src/Events.ts'
import { Uuid } from '../../src/types/Uuid.ts'

const input = Uuid('61be8ff8-24a2-4a0f-b2f6-05c4f8db4436') satisfies _.Input

const inputDifferentInvitationId = Uuid('641752da-dfc0-4ed3-8e86-f028c635243f') satisfies _.Input

const sent = new Events.EmailToInviteAuthorSent({
  invitationId: input,
  sentAt: Temporal.Now.instant(),
})

test.each<[string, _.Input, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', input, [], false],
  ['email sent', input, [sent], true],
  ['email sent, different invitation ID', inputDifferentInvitationId, [sent], false],
])('%s', (_name, input, events, expected) => {
  const { query } = _.HasAnEmailToInviteAuthorBeenSent

  const actual = query(events, input)

  expect(actual).toStrictEqual(Either.right(expected))
})
