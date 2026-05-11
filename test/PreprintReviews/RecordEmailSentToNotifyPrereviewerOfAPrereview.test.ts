import { expect } from '@effect/vitest'
import { test } from '@fast-check/vitest'
import { Temporal } from '@js-temporal/polyfill'
import * as Events from '../../src/Events.ts'
import * as _ from '../../src/PreprintReviews/RecordEmailSentToNotifyPrereviewerOfAPrereview.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'

const input = {
  orcidId: OrcidId('0000-0002-1825-0097'),
  prereviewId: 123,
  sentAt: Temporal.Now.instant(),
} satisfies _.Input

test('RecordEmailSentToNotifyPrereviewerOfAPrereview', () => {
  const { decide } = _.RecordEmailSentToNotifyPrereviewerOfAPrereview

  const actual = decide(input)

  expect(actual).toStrictEqual(
    new Events.EmailToNotifyPrereviewerOfAPrereviewWasSent({
      orcidId: input.orcidId,
      prereviewId: input.prereviewId,
      sentAt: input.sentAt,
    }),
  )
})
