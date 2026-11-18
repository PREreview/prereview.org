import { Temporal } from '@js-temporal/polyfill'
import * as _ from '../../../src/Domain/PreprintReviews/RecordEmailSentToNotifyPrereviewerOfAPrereview.ts'
import * as Events from '../../../src/Events.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import { expect, test } from '../../vitest.ts'

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
