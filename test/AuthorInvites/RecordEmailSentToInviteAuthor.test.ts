import { expect } from '@effect/vitest'
import { test } from '@fast-check/vitest'
import { Temporal } from '@js-temporal/polyfill'
import * as _ from '../../src/AuthorInvites/RecordEmailSentToInviteAuthor.ts'
import * as Events from '../../src/Events.ts'
import { Uuid } from '../../src/types/Uuid.ts'

const input = {
  invitationId: Uuid('578467ae-11e2-4ce9-876f-5fa2714282a5'),
  sentAt: Temporal.Now.instant(),
} satisfies _.Input

test('RecordEmailSentToInviteAuthor', () => {
  const { decide } = _.RecordEmailSentToInviteAuthor

  const actual = decide(input)

  expect(actual).toStrictEqual(
    new Events.EmailToInviteAuthorSent({
      invitationId: input.invitationId,
      sentAt: input.sentAt,
    }),
  )
})
