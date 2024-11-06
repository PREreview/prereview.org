import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Doi } from 'doi-ts'
import { Option } from 'effect'
import { Orcid } from 'orcid-id-ts'
import * as Feedback from '../../src/Feedback/index.js'
import * as _ from '../../src/Feedback/Queries.js'
import { html } from '../../src/html.js'
import type { NonEmptyString, Uuid } from '../../src/types/index.js'

describe('GetAllUnpublishedFeedbackByAnAuthorForAPrereview', () => {
  test('gets all unpublished feedback', () => {
    const events = [
      {
        event: new Feedback.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        resourceId: '358f7fc0-9725-4192-8673-d7c64f398401' as Uuid.Uuid,
      },
      {
        event: new Feedback.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        resourceId: '51a9ea9e-a960-4b51-83a5-9901a47690c2' as Uuid.Uuid,
      },
      {
        event: new Feedback.FeedbackWasEntered({ feedback: html`Some text` }),
        resourceId: '51a9ea9e-a960-4b51-83a5-9901a47690c2' as Uuid.Uuid,
      },
      {
        event: new Feedback.PersonaWasChosen({ persona: 'pseudonym' }),
        resourceId: '51a9ea9e-a960-4b51-83a5-9901a47690c2' as Uuid.Uuid,
      },
      {
        event: new Feedback.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
      {
        event: new Feedback.FeedbackWasEntered({ feedback: html`Some text` }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
      {
        event: new Feedback.PersonaWasChosen({ persona: 'public' }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
      {
        event: new Feedback.CompetingInterestsWereDeclared({
          competingInterests: Option.some('Some competing interests' as NonEmptyString.NonEmptyString),
        }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
      {
        event: new Feedback.CodeOfConductWasAgreed(),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
      {
        event: new Feedback.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        resourceId: 'eb8146ea-e643-4ca3-9dc1-2f26013c42b0' as Uuid.Uuid,
      },
      {
        event: new Feedback.FeedbackWasEntered({ feedback: html`Some other text` }),
        resourceId: 'eb8146ea-e643-4ca3-9dc1-2f26013c42b0' as Uuid.Uuid,
      },
      {
        event: new Feedback.PersonaWasChosen({ persona: 'public' }),
        resourceId: 'eb8146ea-e643-4ca3-9dc1-2f26013c42b0' as Uuid.Uuid,
      },
      {
        event: new Feedback.CodeOfConductWasAgreed(),
        resourceId: 'eb8146ea-e643-4ca3-9dc1-2f26013c42b0' as Uuid.Uuid,
      },
      {
        event: new Feedback.FeedbackPublicationWasRequested(),
        resourceId: 'eb8146ea-e643-4ca3-9dc1-2f26013c42b0' as Uuid.Uuid,
      },
    ]

    const actual = _.GetAllUnpublishedFeedbackByAnAuthorForAPrereview(events)({
      prereviewId: 123,
      authorId: Orcid('0000-0002-1825-0097'),
    })

    expect(actual).toStrictEqual({
      '358f7fc0-9725-4192-8673-d7c64f398401': new Feedback.FeedbackInProgress({
        authorId: Orcid('0000-0002-1825-0097'),
        prereviewId: 123,
      }),
      '51a9ea9e-a960-4b51-83a5-9901a47690c2': new Feedback.FeedbackInProgress({
        authorId: Orcid('0000-0002-1825-0097'),
        feedback: html`Some text`,
        persona: 'pseudonym',
        prereviewId: 123,
      }),
      '2b9e777b-f14d-4294-8e27-2b442e496050': new Feedback.FeedbackReadyForPublishing({
        authorId: Orcid('0000-0002-1825-0097'),
        competingInterests: Option.some('Some competing interests' as NonEmptyString.NonEmptyString),
        feedback: html`Some text`,
        persona: 'public',
        prereviewId: 123,
      }),
      'eb8146ea-e643-4ca3-9dc1-2f26013c42b0': new Feedback.FeedbackBeingPublished({
        authorId: Orcid('0000-0002-1825-0097'),
        feedback: html`Some other text`,
        persona: 'public',
        prereviewId: 123,
      }),
    })
  })

  test('ignores feedback by other authors', () => {
    const events = [
      {
        event: new Feedback.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        resourceId: '358f7fc0-9725-4192-8673-d7c64f398401' as Uuid.Uuid,
      },
      {
        event: new Feedback.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-9079-593X') }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
    ]

    const actual = _.GetAllUnpublishedFeedbackByAnAuthorForAPrereview(events)({
      prereviewId: 123,
      authorId: Orcid('0000-0002-1825-0097'),
    })

    expect(actual).toStrictEqual({
      '358f7fc0-9725-4192-8673-d7c64f398401': new Feedback.FeedbackInProgress({
        authorId: Orcid('0000-0002-1825-0097'),
        prereviewId: 123,
      }),
    })
  })

  test('ignores feedback for other PREreviews', () => {
    const events = [
      {
        event: new Feedback.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        resourceId: '358f7fc0-9725-4192-8673-d7c64f398401' as Uuid.Uuid,
      },
      {
        event: new Feedback.FeedbackWasStarted({ prereviewId: 124, authorId: Orcid('0000-0002-1825-0097') }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
    ]

    const actual = _.GetAllUnpublishedFeedbackByAnAuthorForAPrereview(events)({
      prereviewId: 123,
      authorId: Orcid('0000-0002-1825-0097'),
    })

    expect(actual).toStrictEqual({
      '358f7fc0-9725-4192-8673-d7c64f398401': new Feedback.FeedbackInProgress({
        authorId: Orcid('0000-0002-1825-0097'),
        prereviewId: 123,
      }),
    })
  })

  test('ignores feedback that has been published', () => {
    const events = [
      {
        event: new Feedback.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        resourceId: '358f7fc0-9725-4192-8673-d7c64f398401' as Uuid.Uuid,
      },
      {
        event: new Feedback.FeedbackWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
      {
        event: new Feedback.FeedbackWasEntered({ feedback: html`Some text` }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
      {
        event: new Feedback.PersonaWasChosen({ persona: 'public' }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
      {
        event: new Feedback.CodeOfConductWasAgreed(),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
      {
        event: new Feedback.DoiWasAssigned({ id: 456, doi: Doi('10.5072/zenodo.456') }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
      {
        event: new Feedback.FeedbackWasPublished(),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
    ]

    const actual = _.GetAllUnpublishedFeedbackByAnAuthorForAPrereview(events)({
      prereviewId: 123,
      authorId: Orcid('0000-0002-1825-0097'),
    })

    expect(actual).toStrictEqual({
      '358f7fc0-9725-4192-8673-d7c64f398401': new Feedback.FeedbackInProgress({
        authorId: Orcid('0000-0002-1825-0097'),
        prereviewId: 123,
      }),
    })
  })
})
