import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as _ from '../../src/WriteCommentFlow/DecideNextPage.js'
import * as Routes from '../../src/routes.js'
import * as fc from '../fc.js'

describe('NextPageAfterCommand', () => {
  test.prop([fc.commentState()])('StartComment', comment => {
    expect(_.NextPageAfterCommand({ command: 'StartComment', comment })).toStrictEqual(Routes.WriteCommentEnterComment)
  })

  describe('EnterComment', () => {
    describe('CommentInProgress', () => {
      test.prop([fc.commentInProgress({ persona: fc.constant(undefined) })])('no persona', comment => {
        expect(_.NextPageAfterCommand({ command: 'EnterComment', comment })).toStrictEqual(
          Routes.WriteCommentChoosePersona,
        )
      })

      test.prop([
        fc.commentInProgress({
          persona: fc.constantFrom('public', 'pseudonym'),
          competingInterests: fc.constant(undefined),
        }),
      ])('no competingInterests', comment => {
        expect(_.NextPageAfterCommand({ command: 'EnterComment', comment })).toStrictEqual(
          Routes.WriteCommentCompetingInterests,
        )
      })

      test.prop([
        fc.commentInProgress({
          persona: fc.constantFrom('public', 'pseudonym'),
          competingInterests: fc.maybe(fc.nonEmptyString()),
          codeOfConductAgreed: fc.constant(undefined),
        }),
      ])('no codeOfConductAgreed', comment => {
        expect(_.NextPageAfterCommand({ command: 'EnterComment', comment })).toStrictEqual(
          Routes.WriteCommentCodeOfConduct,
        )
      })

      test.prop([
        fc.commentInProgress({
          persona: fc.constantFrom('public', 'pseudonym'),
          codeOfConductAgreed: fc.constant(true),
          competingInterests: fc.maybe(fc.nonEmptyString()),
        }),
      ])('completed', comment => {
        expect(_.NextPageAfterCommand({ command: 'EnterComment', comment })).toStrictEqual(Routes.WriteCommentCheck)
      })
    })

    test.prop([fc.commentState().filter(comment => comment._tag !== 'CommentInProgress')])(
      'not CommentInProgress',
      comment => {
        expect(_.NextPageAfterCommand({ command: 'EnterComment', comment })).toStrictEqual(Routes.WriteCommentCheck)
      },
    )
  })

  describe('ChoosePersona', () => {
    describe('CommentInProgress', () => {
      test.prop([fc.commentInProgress({ comment: fc.constant(undefined) })])('no comment', comment => {
        expect(_.NextPageAfterCommand({ command: 'ChoosePersona', comment })).toStrictEqual(
          Routes.WriteCommentEnterComment,
        )
      })

      test.prop([fc.commentInProgress({ comment: fc.html(), competingInterests: fc.constant(undefined) })])(
        'no competingInterests',
        comment => {
          expect(_.NextPageAfterCommand({ command: 'ChoosePersona', comment })).toStrictEqual(
            Routes.WriteCommentCompetingInterests,
          )
        },
      )

      test.prop([
        fc.commentInProgress({
          comment: fc.html(),
          competingInterests: fc.maybe(fc.nonEmptyString()),
          codeOfConductAgreed: fc.constant(undefined),
        }),
      ])('no codeOfConductAgreed', comment => {
        expect(_.NextPageAfterCommand({ command: 'ChoosePersona', comment })).toStrictEqual(
          Routes.WriteCommentCodeOfConduct,
        )
      })

      test.prop([
        fc.commentInProgress({
          comment: fc.html(),
          competingInterests: fc.maybe(fc.nonEmptyString()),
          codeOfConductAgreed: fc.constant(true),
        }),
      ])('completed', comment => {
        expect(_.NextPageAfterCommand({ command: 'ChoosePersona', comment })).toStrictEqual(Routes.WriteCommentCheck)
      })
    })

    test.prop([fc.commentState().filter(comment => comment._tag !== 'CommentInProgress')])(
      'not CommentInProgress',
      comment => {
        expect(_.NextPageAfterCommand({ command: 'ChoosePersona', comment })).toStrictEqual(Routes.WriteCommentCheck)
      },
    )
  })

  describe('DeclareCompetingInterests', () => {
    describe('CommentInProgress', () => {
      test.prop([fc.commentInProgress({ comment: fc.constant(undefined) })])('no comment', comment => {
        expect(_.NextPageAfterCommand({ command: 'DeclareCompetingInterests', comment })).toStrictEqual(
          Routes.WriteCommentEnterComment,
        )
      })

      test.prop([fc.commentInProgress({ comment: fc.html(), persona: fc.constant(undefined) })])(
        'no persona',
        comment => {
          expect(_.NextPageAfterCommand({ command: 'DeclareCompetingInterests', comment })).toStrictEqual(
            Routes.WriteCommentChoosePersona,
          )
        },
      )

      test.prop([
        fc.commentInProgress({
          comment: fc.html(),
          persona: fc.constantFrom('public', 'pseudonym'),
          codeOfConductAgreed: fc.constant(undefined),
        }),
      ])('no codeOfConductAgreed', comment => {
        expect(_.NextPageAfterCommand({ command: 'DeclareCompetingInterests', comment })).toStrictEqual(
          Routes.WriteCommentCodeOfConduct,
        )
      })

      test.prop([
        fc.commentInProgress({
          comment: fc.html(),
          persona: fc.constantFrom('public', 'pseudonym'),
          codeOfConductAgreed: fc.constant(true),
        }),
      ])('completed', comment => {
        expect(_.NextPageAfterCommand({ command: 'DeclareCompetingInterests', comment })).toStrictEqual(
          Routes.WriteCommentCheck,
        )
      })
    })

    test.prop([fc.commentState().filter(comment => comment._tag !== 'CommentInProgress')])(
      'not CommentInProgress',
      comment => {
        expect(_.NextPageAfterCommand({ command: 'DeclareCompetingInterests', comment })).toStrictEqual(
          Routes.WriteCommentCheck,
        )
      },
    )
  })

  describe('AgreeToCodeOfConduct', () => {
    describe('CommentInProgress', () => {
      test.prop([fc.commentInProgress({ comment: fc.constant(undefined) })])('no comment', comment => {
        expect(_.NextPageAfterCommand({ command: 'AgreeToCodeOfConduct', comment })).toStrictEqual(
          Routes.WriteCommentEnterComment,
        )
      })

      test.prop([fc.commentInProgress({ comment: fc.html(), persona: fc.constant(undefined) })])(
        'no persona',
        comment => {
          expect(_.NextPageAfterCommand({ command: 'AgreeToCodeOfConduct', comment })).toStrictEqual(
            Routes.WriteCommentChoosePersona,
          )
        },
      )

      test.prop([
        fc.commentInProgress({
          comment: fc.html(),
          persona: fc.constantFrom('public', 'pseudonym'),
          competingInterests: fc.constant(undefined),
        }),
      ])('no competingInterests', comment => {
        expect(_.NextPageAfterCommand({ command: 'AgreeToCodeOfConduct', comment })).toStrictEqual(
          Routes.WriteCommentCompetingInterests,
        )
      })

      test.prop([
        fc.commentInProgress({
          comment: fc.html(),
          persona: fc.constantFrom('public', 'pseudonym'),
          competingInterests: fc.maybe(fc.nonEmptyString()),
        }),
      ])('completed', comment => {
        expect(_.NextPageAfterCommand({ command: 'AgreeToCodeOfConduct', comment })).toStrictEqual(
          Routes.WriteCommentCheck,
        )
      })
    })

    test.prop([fc.commentState().filter(comment => comment._tag !== 'CommentInProgress')])(
      'not CommentInProgress',
      comment => {
        expect(_.NextPageAfterCommand({ command: 'AgreeToCodeOfConduct', comment })).toStrictEqual(
          Routes.WriteCommentCheck,
        )
      },
    )
  })

  test.prop([fc.commentState()])('PublishComment', comment => {
    expect(_.NextPageAfterCommand({ command: 'PublishComment', comment })).toStrictEqual(Routes.WriteCommentPublishing)
  })
})
