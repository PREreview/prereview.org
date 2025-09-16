import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Doi } from 'doi-ts'
import { Array, Either, Option } from 'effect'
import * as _ from '../../src/Comments/Queries.js'
import * as Comments from '../../src/Comments/index.js'
import { html } from '../../src/html.js'
import { OrcidId } from '../../src/types/OrcidId.js'
import { Uuid } from '../../src/types/index.js'
import * as fc from '../fc.js'

describe('GetPrereviewId', () => {
  const commentId = Uuid.Uuid('20d4a551-54fe-48e0-890b-3e08a98f54a2')
  const authorId = OrcidId('0000-0002-1825-0097')
  const prereviewId = 123
  const commentWasStarted = new Comments.CommentWasStarted({ commentId, authorId, prereviewId })

  describe('when a comment flow exists', () => {
    test('returns the PREreview ID', () => {
      const result = _.GetPrereviewId([commentWasStarted])

      expect(result).toStrictEqual(Option.some(prereviewId))
    })
  })

  describe('when the comment flow does not exist', () => {
    test('returns none', () => {
      const result = _.GetPrereviewId([])

      expect(result).toStrictEqual(Option.none())
    })
  })
})

describe('GetNextExpectedCommandForUser', () => {
  const authorId = OrcidId('0000-0002-1825-0097')
  const prereviewId = 123
  const resourceId = Uuid.Uuid('358f7fc0-9725-4192-8673-d7c64f398401')
  const commentWasStarted = new Comments.CommentWasStarted({ commentId: resourceId, authorId, prereviewId })
  const commentWasEntered = new Comments.CommentWasEntered({ commentId: resourceId, comment: html`Some comment` })
  const personaForCommentWasChosen = new Comments.PersonaForCommentWasChosen({
    commentId: resourceId,
    persona: 'public',
  })
  const competingInterestsForCommentWereDeclared = new Comments.CompetingInterestsForCommentWereDeclared({
    commentId: resourceId,
    competingInterests: Option.none(),
  })
  const codeOfConductForCommentWasAgreed = new Comments.CodeOfConductForCommentWasAgreed({
    commentId: resourceId,
  })
  const existenceOfVerifiedEmailAddressForCommentWasConfirmed =
    new Comments.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId: resourceId })

  describe('when at least one comment needs further user input', () => {
    test.each([
      ['ExpectedToEnterAComment', [commentWasStarted]],
      ['ExpectedToChooseAPersona', [commentWasStarted, commentWasEntered]],
      ['ExpectedToDeclareCompetingInterests', [commentWasStarted, commentWasEntered, personaForCommentWasChosen]],
      [
        'ExpectedToAgreeToCodeOfConduct',
        [commentWasStarted, commentWasEntered, personaForCommentWasChosen, competingInterestsForCommentWereDeclared],
      ],
      [
        'ExpectedToVerifyEmailAddress',
        [
          commentWasStarted,
          commentWasEntered,
          personaForCommentWasChosen,
          competingInterestsForCommentWereDeclared,
          codeOfConductForCommentWasAgreed,
        ],
      ],
      [
        'ExpectedToPublishComment',
        [
          commentWasStarted,
          commentWasEntered,
          personaForCommentWasChosen,
          competingInterestsForCommentWereDeclared,
          codeOfConductForCommentWasAgreed,
          existenceOfVerifiedEmailAddressForCommentWasConfirmed,
        ],
      ],
    ])('returns %s', (expected, events) => {
      const actual = _.GetNextExpectedCommandForUser(events)({ authorId, prereviewId })

      expect(actual).toMatchObject({ _tag: expected, commentId: resourceId })
    })

    test('when last answer was changed', () => {
      const events = [commentWasStarted, commentWasEntered, commentWasEntered]
      const actual = _.GetNextExpectedCommandForUser(events)({ authorId, prereviewId })

      expect(actual).toStrictEqual(new Comments.ExpectedToChooseAPersona({ commentId: resourceId }))
    })

    test('when a previous answer was changed', () => {
      const events = [commentWasStarted, commentWasEntered, personaForCommentWasChosen, commentWasEntered]
      const actual = _.GetNextExpectedCommandForUser(events)({ authorId, prereviewId })

      expect(actual).toStrictEqual(new Comments.ExpectedToDeclareCompetingInterests({ commentId: resourceId }))
    })

    test('when a previous answer was changed, after all answers were given', () => {
      const events = [
        commentWasStarted,
        commentWasEntered,
        personaForCommentWasChosen,
        competingInterestsForCommentWereDeclared,
        codeOfConductForCommentWasAgreed,
        existenceOfVerifiedEmailAddressForCommentWasConfirmed,
        personaForCommentWasChosen,
      ]
      const actual = _.GetNextExpectedCommandForUser(events)({ authorId, prereviewId })

      expect(actual).toStrictEqual(new Comments.ExpectedToPublishComment({ commentId: resourceId }))
    })
  })

  test.prop([fc.orcidId(), fc.integer()])(
    'when there are no comments, starts a new comment',
    (authorId, prereviewId) => {
      const actual = _.GetNextExpectedCommandForUser([])({ authorId, prereviewId })

      expect(actual).toStrictEqual(new Comments.ExpectedToStartAComment())
    },
  )

  test.prop([fc.orcidId(), fc.integer(), fc.uuid()])(
    'when in progress comments are by other authors, starts a new comment',
    (authorId, prereviewId, resourceId) => {
      const events = [
        new Comments.CommentWasStarted({
          commentId: resourceId,
          prereviewId,
          authorId: OrcidId('0000-0002-1825-0097'),
        }),
      ]
      const actual = _.GetNextExpectedCommandForUser(events)({ authorId, prereviewId })

      expect(actual).toStrictEqual(new Comments.ExpectedToStartAComment())
    },
  )

  test.prop([fc.orcidId(), fc.integer(), fc.uuid()])(
    'when in progress comments are for other PREreviews, starts a new comment',
    (authorId, prereviewId, resourceId) => {
      const events = [new Comments.CommentWasStarted({ commentId: resourceId, prereviewId: 123, authorId })]
      const actual = _.GetNextExpectedCommandForUser(events)({ authorId, prereviewId })

      expect(actual).toStrictEqual(new Comments.ExpectedToStartAComment())
    },
  )

  test.prop([fc.orcidId(), fc.integer(), fc.uuid()])(
    'when no user input is needed for a comment, starts a new comment',
    (authorId, prereviewId, resourceId) => {
      const events = [new Comments.PublicationOfCommentWasRequested({ commentId: resourceId })]
      const actual = _.GetNextExpectedCommandForUser(events)({ authorId, prereviewId })

      expect(actual).toStrictEqual(new Comments.ExpectedToStartAComment())
    },
  )
})

describe('GetNextExpectedCommandForUserOnAComment', () => {
  const authorId = OrcidId('0000-0002-1825-0097')
  const prereviewId = 123
  const resourceId = Uuid.Uuid('358f7fc0-9725-4192-8673-d7c64f398401')
  const commentWasStarted = new Comments.CommentWasStarted({ commentId: resourceId, authorId, prereviewId })
  const commentWasEntered = new Comments.CommentWasEntered({ commentId: resourceId, comment: html`Some comment` })
  const personaForCommentWasChosen = new Comments.PersonaForCommentWasChosen({
    commentId: resourceId,
    persona: 'public',
  })
  const competingInterestsForCommentWereDeclared = new Comments.CompetingInterestsForCommentWereDeclared({
    commentId: resourceId,
    competingInterests: Option.none(),
  })
  const codeOfConductForCommentWasAgreed = new Comments.CodeOfConductForCommentWasAgreed({ commentId: resourceId })
  const existenceOfVerifiedEmailAddressForCommentWasConfirmed =
    new Comments.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId: resourceId })
  const publicationOfCommentWasRequested = new Comments.PublicationOfCommentWasRequested({ commentId: resourceId })
  const commentWasAssignedADoi = new Comments.CommentWasAssignedADoi({
    commentId: resourceId,
    id: 107286,
    doi: Doi('10.5072/zenodo.107286'),
  })
  const commentWasPublished = new Comments.CommentWasPublished({ commentId: resourceId })

  describe('when the comment needs further user input', () => {
    test.each([
      ['ExpectedToEnterAComment', [commentWasStarted]],
      ['ExpectedToChooseAPersona', [commentWasStarted, commentWasEntered]],
      ['ExpectedToDeclareCompetingInterests', [commentWasStarted, commentWasEntered, personaForCommentWasChosen]],
      [
        'ExpectedToAgreeToCodeOfConduct',
        [commentWasStarted, commentWasEntered, personaForCommentWasChosen, competingInterestsForCommentWereDeclared],
      ],
      [
        'ExpectedToVerifyEmailAddress',
        [
          commentWasStarted,
          commentWasEntered,
          personaForCommentWasChosen,
          competingInterestsForCommentWereDeclared,
          codeOfConductForCommentWasAgreed,
        ],
      ],
      [
        'ExpectedToPublishComment',
        [
          commentWasStarted,
          commentWasEntered,
          personaForCommentWasChosen,
          competingInterestsForCommentWereDeclared,
          codeOfConductForCommentWasAgreed,
          existenceOfVerifiedEmailAddressForCommentWasConfirmed,
        ],
      ],
    ])('returns %s', (expected, events) => {
      const actual = _.GetNextExpectedCommandForUserOnAComment(events)(resourceId)

      expect(actual).toStrictEqual(Either.right(expect.objectContaining({ _tag: expected, commentId: resourceId })))
    })

    test('when last answer was changed', () => {
      const events = [commentWasStarted, commentWasEntered, commentWasEntered]
      const actual = _.GetNextExpectedCommandForUserOnAComment(events)(resourceId)

      expect(actual).toStrictEqual(Either.right(new Comments.ExpectedToChooseAPersona({ commentId: resourceId })))
    })

    test('when a previous answer was changed', () => {
      const events = [commentWasStarted, commentWasEntered, personaForCommentWasChosen, commentWasEntered]
      const actual = _.GetNextExpectedCommandForUserOnAComment(events)(resourceId)

      expect(actual).toStrictEqual(
        Either.right(new Comments.ExpectedToDeclareCompetingInterests({ commentId: resourceId })),
      )
    })

    test('when a previous answer was changed, after all answers were given', () => {
      const events = [
        commentWasStarted,
        commentWasEntered,
        personaForCommentWasChosen,
        competingInterestsForCommentWereDeclared,
        codeOfConductForCommentWasAgreed,
        existenceOfVerifiedEmailAddressForCommentWasConfirmed,
        personaForCommentWasChosen,
      ]
      const actual = _.GetNextExpectedCommandForUserOnAComment(events)(resourceId)

      expect(actual).toStrictEqual(Either.right(new Comments.ExpectedToPublishComment({ commentId: resourceId })))
    })
  })

  test("when the comment hasn't been started", () => {
    const actual = _.GetNextExpectedCommandForUserOnAComment([])(resourceId)

    expect(actual).toStrictEqual(Either.left(new Comments.CommentHasNotBeenStarted()))
  })

  test('when the comment is being published', () => {
    const events = [
      commentWasStarted,
      commentWasEntered,
      personaForCommentWasChosen,
      competingInterestsForCommentWereDeclared,
      codeOfConductForCommentWasAgreed,
      existenceOfVerifiedEmailAddressForCommentWasConfirmed,
      publicationOfCommentWasRequested,
    ]

    const actual = _.GetNextExpectedCommandForUserOnAComment(events)(resourceId)

    expect(actual).toStrictEqual(Either.left(new Comments.CommentIsBeingPublished()))
  })

  test('when the comment has been published', () => {
    const events = [
      commentWasStarted,
      commentWasEntered,
      personaForCommentWasChosen,
      competingInterestsForCommentWereDeclared,
      codeOfConductForCommentWasAgreed,
      existenceOfVerifiedEmailAddressForCommentWasConfirmed,
      publicationOfCommentWasRequested,
      commentWasAssignedADoi,
      commentWasPublished,
    ]

    const actual = _.GetNextExpectedCommandForUserOnAComment(events)(resourceId)

    expect(actual).toStrictEqual(Either.left(new Comments.CommentWasAlreadyPublished()))
  })
})

describe('buildInputForCommentZenodoRecord', () => {
  const commentId = Uuid.Uuid('20d4a551-54fe-48e0-890b-3e08a98f54a2')
  const authorId = OrcidId('0000-0002-1825-0097')
  const prereviewId = 123
  const commentWasStarted = new Comments.CommentWasStarted({ commentId, authorId, prereviewId })
  const commentWasEntered = new Comments.CommentWasEntered({ commentId, comment: html`Some comment` })
  const personaForCommentWasChosen = new Comments.PersonaForCommentWasChosen({ commentId, persona: 'public' })
  const competingInterestsForCommentWereDeclared = new Comments.CompetingInterestsForCommentWereDeclared({
    commentId,
    competingInterests: Option.none(),
  })
  const codeOfConductForCommentWasAgreed = new Comments.CodeOfConductForCommentWasAgreed({ commentId })
  const publicationOfCommentWasRequested = new Comments.PublicationOfCommentWasRequested({ commentId })

  test('builds input', () => {
    const events = [
      commentWasStarted,
      commentWasEntered,
      personaForCommentWasChosen,
      competingInterestsForCommentWereDeclared,
      codeOfConductForCommentWasAgreed,
      publicationOfCommentWasRequested,
    ]

    const expectedInputForCommentZenodoRecord: Comments.InputForCommentZenodoRecord = {
      authorId: commentWasStarted.authorId,
      prereviewId: commentWasStarted.prereviewId,
      comment: commentWasEntered.comment,
      persona: personaForCommentWasChosen.persona,
      competingInterests: competingInterestsForCommentWereDeclared.competingInterests,
    }

    const actual = _.buildInputForCommentZenodoRecord(events)

    expect(actual).toStrictEqual(Either.right(expectedInputForCommentZenodoRecord))
  })

  test.each([
    ['no CommentWasStarted', [commentWasEntered, personaForCommentWasChosen, competingInterestsForCommentWereDeclared]],
    ['no CommentWasEntered', [commentWasStarted, personaForCommentWasChosen, competingInterestsForCommentWereDeclared]],
    ['no PersonaForCommentWasChosen', [commentWasStarted, commentWasEntered, competingInterestsForCommentWereDeclared]],
    ['no CompetingInterestsForCommentWereDeclared', [commentWasStarted, commentWasEntered, personaForCommentWasChosen]],
  ])('returns an UnexpectedSequenceOfEvents when %s', (_name, events) => {
    const actual = _.buildInputForCommentZenodoRecord([...events, publicationOfCommentWasRequested])

    expect(actual).toStrictEqual(Either.left(new _.UnexpectedSequenceOfEvents()))
  })
})

describe('GetACommentInNeedOfADoi', () => {
  const resourceId = Uuid.Uuid('358f7fc0-9725-4192-8673-d7c64f398401')
  const publicationOfCommentWasRequested = new Comments.PublicationOfCommentWasRequested({ commentId: resourceId })
  const commentWasAssignedADoi = new Comments.CommentWasAssignedADoi({
    commentId: resourceId,
    id: 107286,
    doi: Doi('10.5072/zenodo.107286'),
  })

  test('finds a comment in need of a DOI', () => {
    const events = [publicationOfCommentWasRequested]

    const actual = _.GetACommentInNeedOfADoi(events)

    expect(actual).toStrictEqual(Either.right(resourceId))
  })

  test.prop([
    fc.nonEmptyArray(
      fc.publicationOfCommentWasRequested({
        commentId: fc.uuid().filter(otherResourceId => resourceId !== otherResourceId),
      }),
    ),
  ])('finds the newest comment in need of a DOI when multiple comments need a DOI', otherEvents => {
    const actual = _.GetACommentInNeedOfADoi(Array.flatten([otherEvents, Array.of(publicationOfCommentWasRequested)]))

    expect(actual).toStrictEqual(Either.right(resourceId))
  })

  test('ignores comments that already have a DOI', () => {
    const events = [publicationOfCommentWasRequested, commentWasAssignedADoi]

    const actual = _.GetACommentInNeedOfADoi(events)

    expect(actual).toStrictEqual(Either.left(new _.NoCommentsInNeedOfADoi()))
  })
})
