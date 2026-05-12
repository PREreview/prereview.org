import { expect } from '@effect/vitest'
import { test } from '@fast-check/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Either } from 'effect'
import * as Events from '../../src/Events.ts'
import * as _ from '../../src/PreprintReviews/HasAPrereviewerBeenNotifiedOfAReview.ts'
import { OrcidId } from '../../src/types/index.ts'

const input = { orcidId: OrcidId.OrcidId('0000-0002-1825-0097'), prereviewId: 12345 } satisfies _.Input

const sent = new Events.EmailToNotifyPrereviewerOfAPrereviewWasSent({
  orcidId: input.orcidId,
  prereviewId: input.prereviewId,
  sentAt: Temporal.Now.instant(),
})

const sentDifferentOrcidId = new Events.EmailToNotifyPrereviewerOfAPrereviewWasSent({
  ...sent,
  orcidId: OrcidId.OrcidId('0000-0002-6109-0367'),
})

const sentDifferentPrereviewId = new Events.EmailToNotifyPrereviewerOfAPrereviewWasSent({
  ...sent,
  prereviewId: 67890,
})

test.each<[string, _.Input, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', input, [], false],
  ['email sent', input, [sent], true],
  ['email sent, different ORCID iD', input, [sentDifferentOrcidId], false],
  ['email sent, different prereview ID', input, [sentDifferentPrereviewId], false],
])('%s', (_name, input, events, expected) => {
  const { query } = _.HasAPrereviewerBeenNotifiedOfAReview

  const actual = query(events, input)

  expect(actual).toStrictEqual(Either.right(expected))
})
