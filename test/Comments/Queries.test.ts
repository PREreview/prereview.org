import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Doi } from 'doi-ts'
import { Array, Option } from 'effect'
import { Orcid } from 'orcid-id-ts'
import * as _ from '../../src/Comments/Queries.js'
import * as Comments from '../../src/Comments/index.js'
import { html } from '../../src/html.js'
import type { NonEmptyString, Uuid } from '../../src/types/index.js'
import * as fc from '../fc.js'

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

describe('GetNextExpectedCommandForUser', () => {
  const authorId = Orcid('0000-0002-1825-0097')
  const prereviewId = 123
  const resourceId = '358f7fc0-9725-4192-8673-d7c64f398401' as Uuid.Uuid
  const commentWasStarted = new Comments.CommentWasStarted({ authorId, prereviewId })
  const commentWasEntered = new Comments.CommentWasEntered({ comment: html`Some comment` })
  const personaWasChosen = new Comments.PersonaWasChosen({ persona: 'public' })
  const competingInterestsWereDeclared = new Comments.CompetingInterestsWereDeclared({
    competingInterests: Option.none(),
  })
  const codeOfConductWasAgreed = new Comments.CodeOfConductWasAgreed({ competingInterests: Option.none() })

  describe('when at least one comment needs further user input', () => {
    test.each([['EnterComment', [commentWasStarted]]])('returns %s', (expected, events) => {
      const actual = _.GetNextExpectedCommandForUser(Array.map(events, event => ({ event, resourceId })))({
        authorId,
        prereviewId,
      })

      expect(actual).toStrictEqual(expected)
    })

    test.failing.each([
      ['ChoosePersona', [commentWasStarted, commentWasEntered]],
      ['DeclareCompetingInterests', [commentWasStarted, commentWasEntered, personaWasChosen]],
      [
        'AgreeToCodeOfConduct',
        [commentWasStarted, commentWasEntered, personaWasChosen, competingInterestsWereDeclared],
      ],
      [
        'PublishComment',
        [
          commentWasStarted,
          commentWasEntered,
          personaWasChosen,
          competingInterestsWereDeclared,
          codeOfConductWasAgreed,
        ],
      ],
    ])('returns %s', (expected, events) => {
      const actual = _.GetNextExpectedCommandForUser(Array.map(events, event => ({ event, resourceId })))({
        authorId,
        prereviewId,
      })

      expect(actual).toStrictEqual(expected)
    })

    test.failing('when last answer was changed', () => {
      const events = [commentWasStarted, commentWasEntered, commentWasEntered]
      const actual = _.GetNextExpectedCommandForUser(Array.map(events, event => ({ event, resourceId })))({
        authorId,
        prereviewId,
      })

      expect(actual).toStrictEqual('ChoosePersona')
    })

    test.failing('when a previous answer was changed', () => {
      const events = [commentWasStarted, commentWasEntered, personaWasChosen, commentWasEntered]
      const actual = _.GetNextExpectedCommandForUser(Array.map(events, event => ({ event, resourceId })))({
        authorId,
        prereviewId,
      })

      expect(actual).toStrictEqual('DeclareCompetingInterests')
    })

    test.failing('when a previous answer was changed, after all answers were given', () => {
      const events = [
        commentWasStarted,
        commentWasEntered,
        personaWasChosen,
        competingInterestsWereDeclared,
        codeOfConductWasAgreed,
        personaWasChosen,
      ]
      const actual = _.GetNextExpectedCommandForUser(Array.map(events, event => ({ event, resourceId })))({
        authorId,
        prereviewId,
      })

      expect(actual).toStrictEqual('PublishComment')
    })
  })

  test.prop([fc.orcid(), fc.integer()])('when there are no comments, starts a new comment', (authorId, prereviewId) => {
    const actual = _.GetNextExpectedCommandForUser([])({ authorId, prereviewId })

    expect(actual).toStrictEqual('StartComment')
  })

  test.prop([fc.orcid(), fc.integer(), fc.uuid()])(
    'when in progress comments are by other authors, starts a new comment',
    (authorId, prereviewId, resourceId) => {
      const events = [
        {
          event: new Comments.CommentWasStarted({ prereviewId, authorId: Orcid('0000-0002-1825-0097') }),
          resourceId,
        },
      ]
      const actual = _.GetNextExpectedCommandForUser(events)({ authorId, prereviewId })

      expect(actual).toStrictEqual('StartComment')
    },
  )

  test.prop([fc.orcid(), fc.integer(), fc.uuid()])(
    'when in progress comments are for other PREreviews, starts a new comment',
    (authorId, prereviewId, resourceId) => {
      const events = [
        {
          event: new Comments.CommentWasStarted({ prereviewId: 123, authorId }),
          resourceId,
        },
      ]
      const actual = _.GetNextExpectedCommandForUser(events)({ authorId, prereviewId })

      expect(actual).toStrictEqual('StartComment')
    },
  )

  test.prop([fc.orcid(), fc.integer(), fc.uuid()])(
    'when no user input is needed for a comment, starts a new comment',
    (authorId, prereviewId, resourceId) => {
      const events = [
        {
          event: new Comments.CommentPublicationWasRequested({ prereviewId, authorId }),
          resourceId,
        },
      ]
      const actual = _.GetNextExpectedCommandForUser(events)({ authorId, prereviewId })

      expect(actual).toStrictEqual('StartComment')
    },
  )
})
