import { Option, Result } from 'effect'
import * as _ from '../../../src/Domain/Comments/Queries.ts'
import * as Comments from '../../../src/Domain/Comments/index.ts'
import * as Events from '../../../src/Domain/Events/Events.ts'
import { html } from '../../../src/html.ts'
import { Doi } from '../../../src/types/Doi.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import { Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'
import { describe, expect, it, test } from '../../vitest.ts'

describe('GetNextExpectedCommandForUser', () => {
  const authorId = OrcidId('0000-0002-1825-0097')
  const prereviewId = 123
  const resourceId = Uuid.Uuid('358f7fc0-9725-4192-8673-d7c64f398401')
  const commentWasStarted = new Events.CommentWasStarted({ commentId: resourceId, authorId, prereviewId })
  const commentWasEntered = new Events.CommentWasEntered({ commentId: resourceId, comment: html`Some comment` })
  const personaForCommentWasChosen = new Events.PersonaForCommentWasChosen({
    commentId: resourceId,
    persona: 'public',
  })
  const competingInterestsForCommentWereDeclared = new Events.CompetingInterestsForCommentWereDeclared({
    commentId: resourceId,
    competingInterests: Option.none(),
  })
  const codeOfConductForCommentWasAgreed = new Events.CodeOfConductForCommentWasAgreed({
    commentId: resourceId,
  })
  const existenceOfVerifiedEmailAddressForCommentWasConfirmed =
    new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId: resourceId })

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

  it.prop(
    'when there are no comments, starts a new comment',
    [fc.orcidId(), fc.integer()],
    ([authorId, prereviewId]) => {
      const actual = _.GetNextExpectedCommandForUser([])({ authorId, prereviewId })

      expect(actual).toStrictEqual(new Comments.ExpectedToStartAComment())
    },
  )

  it.prop(
    'when in progress comments are by other authors, starts a new comment',
    [fc.orcidId(), fc.integer(), fc.uuid()],
    ([authorId, prereviewId, resourceId]) => {
      const events = [
        new Events.CommentWasStarted({
          commentId: resourceId,
          prereviewId,
          authorId: OrcidId('0000-0002-1825-0097'),
        }),
      ]
      const actual = _.GetNextExpectedCommandForUser(events)({ authorId, prereviewId })

      expect(actual).toStrictEqual(new Comments.ExpectedToStartAComment())
    },
  )

  it.prop(
    'when in progress comments are for other PREreviews, starts a new comment',
    [fc.orcidId(), fc.integer(), fc.uuid()],
    ([authorId, prereviewId, resourceId]) => {
      const events = [new Events.CommentWasStarted({ commentId: resourceId, prereviewId: 123, authorId })]
      const actual = _.GetNextExpectedCommandForUser(events)({ authorId, prereviewId })

      expect(actual).toStrictEqual(new Comments.ExpectedToStartAComment())
    },
  )

  it.prop(
    'when no user input is needed for a comment, starts a new comment',
    [fc.orcidId(), fc.integer(), fc.uuid()],
    ([authorId, prereviewId, resourceId]) => {
      const events = [new Events.PublicationOfCommentWasRequested({ commentId: resourceId })]
      const actual = _.GetNextExpectedCommandForUser(events)({ authorId, prereviewId })

      expect(actual).toStrictEqual(new Comments.ExpectedToStartAComment())
    },
  )
})

describe('GetNextExpectedCommandForUserOnAComment', () => {
  const authorId = OrcidId('0000-0002-1825-0097')
  const prereviewId = 123
  const resourceId = Uuid.Uuid('358f7fc0-9725-4192-8673-d7c64f398401')
  const commentWasStarted = new Events.CommentWasStarted({ commentId: resourceId, authorId, prereviewId })
  const commentWasEntered = new Events.CommentWasEntered({ commentId: resourceId, comment: html`Some comment` })
  const personaForCommentWasChosen = new Events.PersonaForCommentWasChosen({
    commentId: resourceId,
    persona: 'public',
  })
  const competingInterestsForCommentWereDeclared = new Events.CompetingInterestsForCommentWereDeclared({
    commentId: resourceId,
    competingInterests: Option.none(),
  })
  const codeOfConductForCommentWasAgreed = new Events.CodeOfConductForCommentWasAgreed({ commentId: resourceId })
  const existenceOfVerifiedEmailAddressForCommentWasConfirmed =
    new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId: resourceId })
  const publicationOfCommentWasRequested = new Events.PublicationOfCommentWasRequested({ commentId: resourceId })
  const commentWasAssignedADoi = new Events.CommentWasAssignedADoi({
    commentId: resourceId,
    id: 107286,
    doi: Doi('10.5072/zenodo.107286'),
  })
  const commentWasPublished = new Events.CommentWasPublished({ commentId: resourceId })

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

      expect(actual).toStrictEqual(Result.succeed(expect.objectContaining({ _tag: expected, commentId: resourceId })))
    })

    test('when last answer was changed', () => {
      const events = [commentWasStarted, commentWasEntered, commentWasEntered]
      const actual = _.GetNextExpectedCommandForUserOnAComment(events)(resourceId)

      expect(actual).toStrictEqual(Result.succeed(new Comments.ExpectedToChooseAPersona({ commentId: resourceId })))
    })

    test('when a previous answer was changed', () => {
      const events = [commentWasStarted, commentWasEntered, personaForCommentWasChosen, commentWasEntered]
      const actual = _.GetNextExpectedCommandForUserOnAComment(events)(resourceId)

      expect(actual).toStrictEqual(
        Result.succeed(new Comments.ExpectedToDeclareCompetingInterests({ commentId: resourceId })),
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

      expect(actual).toStrictEqual(Result.succeed(new Comments.ExpectedToPublishComment({ commentId: resourceId })))
    })
  })

  test("when the comment hasn't been started", () => {
    const actual = _.GetNextExpectedCommandForUserOnAComment([])(resourceId)

    expect(actual).toStrictEqual(Result.fail(new Comments.CommentHasNotBeenStarted()))
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

    expect(actual).toStrictEqual(Result.fail(new Comments.CommentIsBeingPublished()))
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

    expect(actual).toStrictEqual(Result.fail(new Comments.CommentWasAlreadyPublished()))
  })
})
