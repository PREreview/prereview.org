import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Array, Option } from 'effect'
import { Orcid } from 'orcid-id-ts'
import * as _ from '../../src/Comments/Queries.js'
import * as Comments from '../../src/Comments/index.js'
import { html } from '../../src/html.js'
import type { Uuid } from '../../src/types/index.js'
import * as fc from '../fc.js'

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
  const existenceOfVerifiedEmailAddressWasConfirmed = new Comments.ExistenceOfVerifiedEmailAddressWasConfirmed()

  describe('when at least one comment needs further user input', () => {
    test.each([
      ['ExpectedToEnterAComment', [commentWasStarted]],
      ['ExpectedToChooseAPersona', [commentWasStarted, commentWasEntered]],
      ['ExpectedToDeclareCompetingInterests', [commentWasStarted, commentWasEntered, personaWasChosen]],
      [
        'ExpectedToAgreeToCodeOfConduct',
        [commentWasStarted, commentWasEntered, personaWasChosen, competingInterestsWereDeclared],
      ],
      [
        'ExpectedToVerifyEmailAddress',
        [
          commentWasStarted,
          commentWasEntered,
          personaWasChosen,
          competingInterestsWereDeclared,
          codeOfConductWasAgreed,
        ],
        true,
      ],
      [
        'ExpectedToPublishComment',
        [
          commentWasStarted,
          commentWasEntered,
          personaWasChosen,
          competingInterestsWereDeclared,
          codeOfConductWasAgreed,
        ],
        false,
      ],
      [
        'ExpectedToPublishComment',
        [
          commentWasStarted,
          commentWasEntered,
          personaWasChosen,
          competingInterestsWereDeclared,
          codeOfConductWasAgreed,
          existenceOfVerifiedEmailAddressWasConfirmed,
        ],
        true,
      ],
    ])('returns %s', (expected, events, requireVerifiedEmailAddress = false) => {
      const actual = _.GetNextExpectedCommandForUser(requireVerifiedEmailAddress)(
        Array.map(events, event => ({ event, resourceId })),
      )({
        authorId,
        prereviewId,
      })

      expect(actual).toMatchObject({ _tag: expected, commentId: resourceId })
    })

    test('when last answer was changed', () => {
      const events = [commentWasStarted, commentWasEntered, commentWasEntered]
      const actual = _.GetNextExpectedCommandForUser(false)(Array.map(events, event => ({ event, resourceId })))({
        authorId,
        prereviewId,
      })

      expect(actual).toStrictEqual(new Comments.ExpectedToChooseAPersona({ commentId: resourceId }))
    })

    test('when a previous answer was changed', () => {
      const events = [commentWasStarted, commentWasEntered, personaWasChosen, commentWasEntered]
      const actual = _.GetNextExpectedCommandForUser(false)(Array.map(events, event => ({ event, resourceId })))({
        authorId,
        prereviewId,
      })

      expect(actual).toStrictEqual(new Comments.ExpectedToDeclareCompetingInterests({ commentId: resourceId }))
    })

    test('when a previous answer was changed, after all answers were given', () => {
      const events = [
        commentWasStarted,
        commentWasEntered,
        personaWasChosen,
        competingInterestsWereDeclared,
        codeOfConductWasAgreed,
        personaWasChosen,
      ]
      const actual = _.GetNextExpectedCommandForUser(false)(Array.map(events, event => ({ event, resourceId })))({
        authorId,
        prereviewId,
      })

      expect(actual).toStrictEqual(new Comments.ExpectedToPublishComment({ commentId: resourceId }))
    })
  })

  test.prop([fc.orcid(), fc.integer(), fc.boolean()])(
    'when there are no comments, starts a new comment',
    (authorId, prereviewId, requireVerifiedEmailAddress) => {
      const actual = _.GetNextExpectedCommandForUser(requireVerifiedEmailAddress)([])({ authorId, prereviewId })

      expect(actual).toStrictEqual(new Comments.ExpectedToStartAComment())
    },
  )

  test.prop([fc.orcid(), fc.integer(), fc.uuid(), fc.boolean()])(
    'when in progress comments are by other authors, starts a new comment',
    (authorId, prereviewId, resourceId, requireVerifiedEmailAddress) => {
      const events = [
        {
          event: new Comments.CommentWasStarted({ prereviewId, authorId: Orcid('0000-0002-1825-0097') }),
          resourceId,
        },
      ]
      const actual = _.GetNextExpectedCommandForUser(requireVerifiedEmailAddress)(events)({ authorId, prereviewId })

      expect(actual).toStrictEqual(new Comments.ExpectedToStartAComment())
    },
  )

  test.prop([fc.orcid(), fc.integer(), fc.uuid(), fc.boolean()])(
    'when in progress comments are for other PREreviews, starts a new comment',
    (authorId, prereviewId, resourceId, requireVerifiedEmailAddress) => {
      const events = [
        {
          event: new Comments.CommentWasStarted({ prereviewId: 123, authorId }),
          resourceId,
        },
      ]
      const actual = _.GetNextExpectedCommandForUser(requireVerifiedEmailAddress)(events)({ authorId, prereviewId })

      expect(actual).toStrictEqual(new Comments.ExpectedToStartAComment())
    },
  )

  test.prop([fc.orcid(), fc.integer(), fc.uuid(), fc.boolean()])(
    'when no user input is needed for a comment, starts a new comment',
    (authorId, prereviewId, resourceId, requireVerifiedEmailAddress) => {
      const events = [
        {
          event: new Comments.CommentPublicationWasRequested({ prereviewId, authorId }),
          resourceId,
        },
      ]
      const actual = _.GetNextExpectedCommandForUser(requireVerifiedEmailAddress)(events)({ authorId, prereviewId })

      expect(actual).toStrictEqual(new Comments.ExpectedToStartAComment())
    },
  )
})
