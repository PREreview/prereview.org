import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as _ from '../../src/WriteFeedbackFlow/DecideNextPage.js'
import * as Routes from '../../src/routes.js'
import * as fc from '../fc.js'

describe('NextPageFromState', () => {
  describe('CommentInProgress', () => {
    test.prop([fc.commentInProgress({ comment: fc.constant(undefined) })])('no comment', feedback => {
      expect(_.NextPageFromState(feedback)).toStrictEqual(Routes.WriteFeedbackEnterFeedback)
    })

    test.prop([fc.commentInProgress({ comment: fc.html(), persona: fc.constant(undefined) })])(
      'no persona',
      feedback => {
        expect(_.NextPageFromState(feedback)).toStrictEqual(Routes.WriteFeedbackChoosePersona)
      },
    )

    test.prop([
      fc.commentInProgress({
        comment: fc.html(),
        persona: fc.constantFrom('public', 'pseudonym'),
        competingInterests: fc.constant(undefined),
      }),
    ])('no competingInterests', feedback => {
      expect(_.NextPageFromState(feedback)).toStrictEqual(Routes.WriteFeedbackCompetingInterests)
    })

    test.prop([
      fc.commentInProgress({
        comment: fc.html(),
        persona: fc.constantFrom('public', 'pseudonym'),
        competingInterests: fc.maybe(fc.nonEmptyString()),
        codeOfConductAgreed: fc.constant(undefined),
      }),
    ])('no codeOfConductAgreed', feedback => {
      expect(_.NextPageFromState(feedback)).toStrictEqual(Routes.WriteFeedbackCodeOfConduct)
    })
  })

  test.prop([fc.commentReadyForPublishing()])('CommentReadyForPublishing', feedback => {
    expect(_.NextPageFromState(feedback)).toStrictEqual(Routes.WriteFeedbackCheck)
  })

  test.prop([fc.commentBeingPublished()])('CommentBeingPublished', feedback => {
    expect(_.NextPageFromState(feedback)).toStrictEqual(Routes.WriteFeedbackPublishing)
  })

  test.prop([fc.commentPublished()])('CommentPublished', feedback => {
    expect(_.NextPageFromState(feedback)).toStrictEqual(Routes.WriteFeedbackPublished)
  })
})

describe('NextPageAfterCommand', () => {
  test.prop([fc.commentState()])('StartComment', feedback => {
    expect(_.NextPageAfterCommand({ command: 'StartComment', feedback })).toStrictEqual(
      Routes.WriteFeedbackEnterFeedback,
    )
  })

  describe('EnterComment', () => {
    describe('CommentInProgress', () => {
      test.prop([fc.commentInProgress({ persona: fc.constant(undefined) })])('no persona', feedback => {
        expect(_.NextPageAfterCommand({ command: 'EnterComment', feedback })).toStrictEqual(
          Routes.WriteFeedbackChoosePersona,
        )
      })

      test.prop([
        fc.commentInProgress({
          persona: fc.constantFrom('public', 'pseudonym'),
          competingInterests: fc.constant(undefined),
        }),
      ])('no competingInterests', feedback => {
        expect(_.NextPageAfterCommand({ command: 'EnterComment', feedback })).toStrictEqual(
          Routes.WriteFeedbackCompetingInterests,
        )
      })

      test.prop([
        fc.commentInProgress({
          persona: fc.constantFrom('public', 'pseudonym'),
          competingInterests: fc.maybe(fc.nonEmptyString()),
          codeOfConductAgreed: fc.constant(undefined),
        }),
      ])('no codeOfConductAgreed', feedback => {
        expect(_.NextPageAfterCommand({ command: 'EnterComment', feedback })).toStrictEqual(
          Routes.WriteFeedbackCodeOfConduct,
        )
      })

      test.prop([
        fc.commentInProgress({
          persona: fc.constantFrom('public', 'pseudonym'),
          codeOfConductAgreed: fc.constant(true),
          competingInterests: fc.maybe(fc.nonEmptyString()),
        }),
      ])('completed', feedback => {
        expect(_.NextPageAfterCommand({ command: 'EnterComment', feedback })).toStrictEqual(Routes.WriteFeedbackCheck)
      })
    })

    test.prop([fc.commentState().filter(feedback => feedback._tag !== 'CommentInProgress')])(
      'not CommentInProgress',
      feedback => {
        expect(_.NextPageAfterCommand({ command: 'EnterComment', feedback })).toStrictEqual(Routes.WriteFeedbackCheck)
      },
    )
  })

  describe('ChoosePersona', () => {
    describe('CommentInProgress', () => {
      test.prop([fc.commentInProgress({ comment: fc.constant(undefined) })])('no comment', feedback => {
        expect(_.NextPageAfterCommand({ command: 'ChoosePersona', feedback })).toStrictEqual(
          Routes.WriteFeedbackEnterFeedback,
        )
      })

      test.prop([fc.commentInProgress({ comment: fc.html(), competingInterests: fc.constant(undefined) })])(
        'no competingInterests',
        feedback => {
          expect(_.NextPageAfterCommand({ command: 'ChoosePersona', feedback })).toStrictEqual(
            Routes.WriteFeedbackCompetingInterests,
          )
        },
      )

      test.prop([
        fc.commentInProgress({
          comment: fc.html(),
          competingInterests: fc.maybe(fc.nonEmptyString()),
          codeOfConductAgreed: fc.constant(undefined),
        }),
      ])('no codeOfConductAgreed', feedback => {
        expect(_.NextPageAfterCommand({ command: 'ChoosePersona', feedback })).toStrictEqual(
          Routes.WriteFeedbackCodeOfConduct,
        )
      })

      test.prop([
        fc.commentInProgress({
          comment: fc.html(),
          competingInterests: fc.maybe(fc.nonEmptyString()),
          codeOfConductAgreed: fc.constant(true),
        }),
      ])('completed', feedback => {
        expect(_.NextPageAfterCommand({ command: 'ChoosePersona', feedback })).toStrictEqual(Routes.WriteFeedbackCheck)
      })
    })

    test.prop([fc.commentState().filter(feedback => feedback._tag !== 'CommentInProgress')])(
      'not CommentInProgress',
      feedback => {
        expect(_.NextPageAfterCommand({ command: 'ChoosePersona', feedback })).toStrictEqual(Routes.WriteFeedbackCheck)
      },
    )
  })

  describe('DeclareCompetingInterests', () => {
    describe('CommentInProgress', () => {
      test.prop([fc.commentInProgress({ comment: fc.constant(undefined) })])('no comment', feedback => {
        expect(_.NextPageAfterCommand({ command: 'DeclareCompetingInterests', feedback })).toStrictEqual(
          Routes.WriteFeedbackEnterFeedback,
        )
      })

      test.prop([fc.commentInProgress({ comment: fc.html(), persona: fc.constant(undefined) })])(
        'no persona',
        feedback => {
          expect(_.NextPageAfterCommand({ command: 'DeclareCompetingInterests', feedback })).toStrictEqual(
            Routes.WriteFeedbackChoosePersona,
          )
        },
      )

      test.prop([
        fc.commentInProgress({
          comment: fc.html(),
          persona: fc.constantFrom('public', 'pseudonym'),
          codeOfConductAgreed: fc.constant(undefined),
        }),
      ])('no codeOfConductAgreed', feedback => {
        expect(_.NextPageAfterCommand({ command: 'DeclareCompetingInterests', feedback })).toStrictEqual(
          Routes.WriteFeedbackCodeOfConduct,
        )
      })

      test.prop([
        fc.commentInProgress({
          comment: fc.html(),
          persona: fc.constantFrom('public', 'pseudonym'),
          codeOfConductAgreed: fc.constant(true),
        }),
      ])('completed', feedback => {
        expect(_.NextPageAfterCommand({ command: 'DeclareCompetingInterests', feedback })).toStrictEqual(
          Routes.WriteFeedbackCheck,
        )
      })
    })

    test.prop([fc.commentState().filter(feedback => feedback._tag !== 'CommentInProgress')])(
      'not CommentInProgress',
      feedback => {
        expect(_.NextPageAfterCommand({ command: 'DeclareCompetingInterests', feedback })).toStrictEqual(
          Routes.WriteFeedbackCheck,
        )
      },
    )
  })

  describe('AgreeToCodeOfConduct', () => {
    describe('CommentInProgress', () => {
      test.prop([fc.commentInProgress({ comment: fc.constant(undefined) })])('no comment', feedback => {
        expect(_.NextPageAfterCommand({ command: 'AgreeToCodeOfConduct', feedback })).toStrictEqual(
          Routes.WriteFeedbackEnterFeedback,
        )
      })

      test.prop([fc.commentInProgress({ comment: fc.html(), persona: fc.constant(undefined) })])(
        'no persona',
        feedback => {
          expect(_.NextPageAfterCommand({ command: 'AgreeToCodeOfConduct', feedback })).toStrictEqual(
            Routes.WriteFeedbackChoosePersona,
          )
        },
      )

      test.prop([
        fc.commentInProgress({
          comment: fc.html(),
          persona: fc.constantFrom('public', 'pseudonym'),
          competingInterests: fc.constant(undefined),
        }),
      ])('no competingInterests', feedback => {
        expect(_.NextPageAfterCommand({ command: 'AgreeToCodeOfConduct', feedback })).toStrictEqual(
          Routes.WriteFeedbackCompetingInterests,
        )
      })

      test.prop([
        fc.commentInProgress({
          comment: fc.html(),
          persona: fc.constantFrom('public', 'pseudonym'),
          competingInterests: fc.maybe(fc.nonEmptyString()),
        }),
      ])('completed', feedback => {
        expect(_.NextPageAfterCommand({ command: 'AgreeToCodeOfConduct', feedback })).toStrictEqual(
          Routes.WriteFeedbackCheck,
        )
      })
    })

    test.prop([fc.commentState().filter(feedback => feedback._tag !== 'CommentInProgress')])(
      'not CommentInProgress',
      feedback => {
        expect(_.NextPageAfterCommand({ command: 'AgreeToCodeOfConduct', feedback })).toStrictEqual(
          Routes.WriteFeedbackCheck,
        )
      },
    )
  })

  test.prop([fc.commentState()])('PublishComment', feedback => {
    expect(_.NextPageAfterCommand({ command: 'PublishComment', feedback })).toStrictEqual(
      Routes.WriteFeedbackPublishing,
    )
  })
})
