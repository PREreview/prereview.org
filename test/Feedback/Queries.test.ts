import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Doi } from 'doi-ts'
import { Orcid } from 'orcid-id-ts'
import type { Uuid } from 'uuid-ts'
import * as Feedback from '../../src/Feedback/index.js'
import * as _ from '../../src/Feedback/Queries.js'
import { html } from '../../src/html.js'

describe('GetAllUnpublishedFeedbackByAnAuthorForAPrereview', () => {
  test('gets all unpublished feedback', () => {
    const events = [
      {
        event: new Feedback.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        resourceId: '358f7fc0-9725-4192-8673-d7c64f398401' as Uuid,
      },
      {
        event: new Feedback.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid,
      },
      {
        event: new Feedback.FeedbackWasEntered({ feedback: html`Some text` }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid,
      },
    ]

    const actual = _.GetAllUnpublishedFeedbackByAnAuthorForAPrereview(events)({
      prereviewId: 123,
      authorId: Orcid('0000-0002-1825-0097'),
    })

    expect(actual).toStrictEqual({
      '358f7fc0-9725-4192-8673-d7c64f398401': new Feedback.FeedbackInProgress(),
      '2b9e777b-f14d-4294-8e27-2b442e496050': new Feedback.FeedbackReadyForPublishing({ feedback: html`Some text` }),
    })
  })

  test('ignores feedback by other authors', () => {
    const events = [
      {
        event: new Feedback.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        resourceId: '358f7fc0-9725-4192-8673-d7c64f398401' as Uuid,
      },
      {
        event: new Feedback.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-9079-593X') }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid,
      },
    ]

    const actual = _.GetAllUnpublishedFeedbackByAnAuthorForAPrereview(events)({
      prereviewId: 123,
      authorId: Orcid('0000-0002-1825-0097'),
    })

    expect(actual).toStrictEqual({ '358f7fc0-9725-4192-8673-d7c64f398401': new Feedback.FeedbackInProgress() })
  })

  test('ignores feedback for other PREreviews', () => {
    const events = [
      {
        event: new Feedback.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        resourceId: '358f7fc0-9725-4192-8673-d7c64f398401' as Uuid,
      },
      {
        event: new Feedback.FeedbackWasStarted({ prereviewId: 124, authorId: Orcid('0000-0002-1825-0097') }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid,
      },
    ]

    const actual = _.GetAllUnpublishedFeedbackByAnAuthorForAPrereview(events)({
      prereviewId: 123,
      authorId: Orcid('0000-0002-1825-0097'),
    })

    expect(actual).toStrictEqual({ '358f7fc0-9725-4192-8673-d7c64f398401': new Feedback.FeedbackInProgress() })
  })

  test('ignores feedback that has been published', () => {
    const events = [
      {
        event: new Feedback.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        resourceId: '358f7fc0-9725-4192-8673-d7c64f398401' as Uuid,
      },
      {
        event: new Feedback.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid,
      },
      {
        event: new Feedback.FeedbackWasEntered({ feedback: html`Some text` }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid,
      },
      {
        event: new Feedback.FeedbackWasPublished({ id: 456, doi: Doi('10.5072/zenodo.456') }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid,
      },
    ]

    const actual = _.GetAllUnpublishedFeedbackByAnAuthorForAPrereview(events)({
      prereviewId: 123,
      authorId: Orcid('0000-0002-1825-0097'),
    })

    expect(actual).toStrictEqual({ '358f7fc0-9725-4192-8673-d7c64f398401': new Feedback.FeedbackInProgress() })
  })
})
