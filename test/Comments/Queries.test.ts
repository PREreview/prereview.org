import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Doi } from 'doi-ts'
import { Option } from 'effect'
import { Orcid } from 'orcid-id-ts'
import * as _ from '../../src/Comments/Queries.js'
import * as Comments from '../../src/Comments/index.js'
import { html } from '../../src/html.js'
import type { NonEmptyString, Uuid } from '../../src/types/index.js'

describe('GetAllUnpublishedCommentsByAnAuthorForAPrereview', () => {
  test('gets all unpublished comments', () => {
    const events = [
      {
        event: new Comments.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        resourceId: '358f7fc0-9725-4192-8673-d7c64f398401' as Uuid.Uuid,
      },
      {
        event: new Comments.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        resourceId: '51a9ea9e-a960-4b51-83a5-9901a47690c2' as Uuid.Uuid,
      },
      {
        event: new Comments.CommentWasEntered({ comment: html`Some text` }),
        resourceId: '51a9ea9e-a960-4b51-83a5-9901a47690c2' as Uuid.Uuid,
      },
      {
        event: new Comments.PersonaWasChosen({ persona: 'pseudonym' }),
        resourceId: '51a9ea9e-a960-4b51-83a5-9901a47690c2' as Uuid.Uuid,
      },
      {
        event: new Comments.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
      {
        event: new Comments.CommentWasEntered({ comment: html`Some text` }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
      {
        event: new Comments.PersonaWasChosen({ persona: 'public' }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
      {
        event: new Comments.CompetingInterestsWereDeclared({
          competingInterests: Option.some('Some competing interests' as NonEmptyString.NonEmptyString),
        }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
      {
        event: new Comments.CodeOfConductWasAgreed(),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
      {
        event: new Comments.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        resourceId: 'eb8146ea-e643-4ca3-9dc1-2f26013c42b0' as Uuid.Uuid,
      },
      {
        event: new Comments.CommentWasEntered({ comment: html`Some other text` }),
        resourceId: 'eb8146ea-e643-4ca3-9dc1-2f26013c42b0' as Uuid.Uuid,
      },
      {
        event: new Comments.PersonaWasChosen({ persona: 'public' }),
        resourceId: 'eb8146ea-e643-4ca3-9dc1-2f26013c42b0' as Uuid.Uuid,
      },
      {
        event: new Comments.CompetingInterestsWereDeclared({ competingInterests: Option.none() }),
        resourceId: 'eb8146ea-e643-4ca3-9dc1-2f26013c42b0' as Uuid.Uuid,
      },
      {
        event: new Comments.CodeOfConductWasAgreed(),
        resourceId: 'eb8146ea-e643-4ca3-9dc1-2f26013c42b0' as Uuid.Uuid,
      },
      {
        event: new Comments.CommentPublicationWasRequested(),
        resourceId: 'eb8146ea-e643-4ca3-9dc1-2f26013c42b0' as Uuid.Uuid,
      },
    ]

    const actual = _.GetAllUnpublishedCommentsByAnAuthorForAPrereview(events)({
      prereviewId: 123,
      authorId: Orcid('0000-0002-1825-0097'),
    })

    expect(actual).toStrictEqual({
      '358f7fc0-9725-4192-8673-d7c64f398401': new Comments.CommentInProgress({
        authorId: Orcid('0000-0002-1825-0097'),
        prereviewId: 123,
      }),
      '51a9ea9e-a960-4b51-83a5-9901a47690c2': new Comments.CommentInProgress({
        authorId: Orcid('0000-0002-1825-0097'),
        comment: html`Some text`,
        persona: 'pseudonym',
        prereviewId: 123,
      }),
      '2b9e777b-f14d-4294-8e27-2b442e496050': new Comments.CommentReadyForPublishing({
        authorId: Orcid('0000-0002-1825-0097'),
        competingInterests: Option.some('Some competing interests' as NonEmptyString.NonEmptyString),
        comment: html`Some text`,
        persona: 'public',
        prereviewId: 123,
      }),
      'eb8146ea-e643-4ca3-9dc1-2f26013c42b0': new Comments.CommentBeingPublished({
        authorId: Orcid('0000-0002-1825-0097'),
        competingInterests: Option.none(),
        comment: html`Some other text`,
        persona: 'public',
        prereviewId: 123,
      }),
    })
  })

  test('ignores comments by other authors', () => {
    const events = [
      {
        event: new Comments.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        resourceId: '358f7fc0-9725-4192-8673-d7c64f398401' as Uuid.Uuid,
      },
      {
        event: new Comments.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-9079-593X') }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
    ]

    const actual = _.GetAllUnpublishedCommentsByAnAuthorForAPrereview(events)({
      prereviewId: 123,
      authorId: Orcid('0000-0002-1825-0097'),
    })

    expect(actual).toStrictEqual({
      '358f7fc0-9725-4192-8673-d7c64f398401': new Comments.CommentInProgress({
        authorId: Orcid('0000-0002-1825-0097'),
        prereviewId: 123,
      }),
    })
  })

  test('ignores comments for other PREreviews', () => {
    const events = [
      {
        event: new Comments.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        resourceId: '358f7fc0-9725-4192-8673-d7c64f398401' as Uuid.Uuid,
      },
      {
        event: new Comments.CommentWasStarted({ prereviewId: 124, authorId: Orcid('0000-0002-1825-0097') }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
    ]

    const actual = _.GetAllUnpublishedCommentsByAnAuthorForAPrereview(events)({
      prereviewId: 123,
      authorId: Orcid('0000-0002-1825-0097'),
    })

    expect(actual).toStrictEqual({
      '358f7fc0-9725-4192-8673-d7c64f398401': new Comments.CommentInProgress({
        authorId: Orcid('0000-0002-1825-0097'),
        prereviewId: 123,
      }),
    })
  })

  test('ignores comments that has been published', () => {
    const events = [
      {
        event: new Comments.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        resourceId: '358f7fc0-9725-4192-8673-d7c64f398401' as Uuid.Uuid,
      },
      {
        event: new Comments.CommentWasStarted({ prereviewId: 123, authorId: Orcid('0000-0002-1825-0097') }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
      {
        event: new Comments.CommentWasEntered({ comment: html`Some text` }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
      {
        event: new Comments.PersonaWasChosen({ persona: 'public' }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
      {
        event: new Comments.CompetingInterestsWereDeclared({ competingInterests: Option.none() }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
      {
        event: new Comments.CodeOfConductWasAgreed(),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
      {
        event: new Comments.DoiWasAssigned({ id: 456, doi: Doi('10.5072/zenodo.456') }),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
      {
        event: new Comments.CommentWasPublished(),
        resourceId: '2b9e777b-f14d-4294-8e27-2b442e496050' as Uuid.Uuid,
      },
    ]

    const actual = _.GetAllUnpublishedCommentsByAnAuthorForAPrereview(events)({
      prereviewId: 123,
      authorId: Orcid('0000-0002-1825-0097'),
    })

    expect(actual).toStrictEqual({
      '358f7fc0-9725-4192-8673-d7c64f398401': new Comments.CommentInProgress({
        authorId: Orcid('0000-0002-1825-0097'),
        prereviewId: 123,
      }),
    })
  })
})

describe('GetUnpublishedCommentId', () => {
  test.todo('returns at most one unpublished comment')

  test.todo('when there are no comments returns None')

  test.todo('ignores comments by other authors')

  test.todo('ignores comments for other PREreviews')

  test.todo('ignores comments that have been published')
})
