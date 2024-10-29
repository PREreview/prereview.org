import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as _ from '../../src/WriteFeedbackFlow/DecideNextPage.js'
import * as Routes from '../../src/routes.js'
import * as fc from '../fc.js'

describe('NextPageFromState', () => {
  describe('FeedbackInProgress', () => {
    test.prop([fc.feedbackInProgress({ feedback: fc.constant(undefined) })])('no feedback', feedback => {
      expect(_.NextPageFromState(feedback)).toStrictEqual(Routes.WriteFeedbackEnterFeedback)
    })

    test.prop([fc.feedbackInProgress({ feedback: fc.html(), persona: fc.constant(undefined) })])(
      'no codeOfConductAgreed',
      feedback => {
        expect(_.NextPageFromState(feedback)).toStrictEqual(Routes.WriteFeedbackChoosePersona)
      },
    )

    test.prop([
      fc.feedbackInProgress({
        feedback: fc.html(),
        persona: fc.constantFrom('public', 'pseudonym'),
        codeOfConductAgreed: fc.constant(undefined),
      }),
    ])('no codeOfConductAgreed', feedback => {
      expect(_.NextPageFromState(feedback)).toStrictEqual(Routes.WriteFeedbackCodeOfConduct)
    })
  })

  test.prop([fc.feedbackReadyForPublishing()])('FeedbackReadyForPublishing', feedback => {
    expect(_.NextPageFromState(feedback)).toStrictEqual(Routes.WriteFeedbackCheck)
  })

  test.prop([fc.feedbackBeingPublished()])('FeedbackBeingPublished', feedback => {
    expect(_.NextPageFromState(feedback)).toStrictEqual(Routes.WriteFeedbackPublishing)
  })

  test.prop([fc.feedbackPublished()])('FeedbackPublished', feedback => {
    expect(_.NextPageFromState(feedback)).toStrictEqual(Routes.WriteFeedbackPublished)
  })
})

describe('NextPageAfterCommand', () => {
  test.prop([fc.feedbackState()])('StartFeedback', feedback => {
    expect(_.NextPageAfterCommand({ command: 'StartFeedback', feedback })).toStrictEqual(
      Routes.WriteFeedbackEnterFeedback,
    )
  })

  describe('EnterFeedback', () => {
    describe('FeedbackInProgress', () => {
      test.prop([fc.feedbackInProgress({ persona: fc.constant(undefined) })])('no persona', feedback => {
        expect(_.NextPageAfterCommand({ command: 'EnterFeedback', feedback })).toStrictEqual(
          Routes.WriteFeedbackChoosePersona,
        )
      })

      test.prop([
        fc.feedbackInProgress({
          persona: fc.constantFrom('public', 'pseudonym'),
          codeOfConductAgreed: fc.constant(undefined),
        }),
      ])('no codeOfConductAgreed', feedback => {
        expect(_.NextPageAfterCommand({ command: 'EnterFeedback', feedback })).toStrictEqual(
          Routes.WriteFeedbackCodeOfConduct,
        )
      })

      test.prop([
        fc.feedbackInProgress({
          persona: fc.constantFrom('public', 'pseudonym'),
          codeOfConductAgreed: fc.constant(true),
        }),
      ])('completed', feedback => {
        expect(_.NextPageAfterCommand({ command: 'EnterFeedback', feedback })).toStrictEqual(Routes.WriteFeedbackCheck)
      })
    })

    test.prop([fc.feedbackState().filter(feedback => feedback._tag !== 'FeedbackInProgress')])(
      'not FeedbackInProgress',
      feedback => {
        expect(_.NextPageAfterCommand({ command: 'EnterFeedback', feedback })).toStrictEqual(Routes.WriteFeedbackCheck)
      },
    )
  })

  describe('ChoosePersona', () => {
    describe('FeedbackInProgress', () => {
      test.prop([fc.feedbackInProgress({ feedback: fc.constant(undefined) })])('no feedback', feedback => {
        expect(_.NextPageAfterCommand({ command: 'ChoosePersona', feedback })).toStrictEqual(
          Routes.WriteFeedbackEnterFeedback,
        )
      })

      test.prop([fc.feedbackInProgress({ feedback: fc.html(), codeOfConductAgreed: fc.constant(undefined) })])(
        'no codeOfConductAgreed',
        feedback => {
          expect(_.NextPageAfterCommand({ command: 'ChoosePersona', feedback })).toStrictEqual(
            Routes.WriteFeedbackCodeOfConduct,
          )
        },
      )

      test.prop([fc.feedbackInProgress({ feedback: fc.html(), codeOfConductAgreed: fc.constant(true) })])(
        'completed',
        feedback => {
          expect(_.NextPageAfterCommand({ command: 'ChoosePersona', feedback })).toStrictEqual(
            Routes.WriteFeedbackCheck,
          )
        },
      )
    })

    test.prop([fc.feedbackState().filter(feedback => feedback._tag !== 'FeedbackInProgress')])(
      'not FeedbackInProgress',
      feedback => {
        expect(_.NextPageAfterCommand({ command: 'ChoosePersona', feedback })).toStrictEqual(Routes.WriteFeedbackCheck)
      },
    )
  })

  describe('AgreeToCodeOfConduct', () => {
    describe('FeedbackInProgress', () => {
      test.prop([fc.feedbackInProgress({ feedback: fc.constant(undefined) })])('no feedback', feedback => {
        expect(_.NextPageAfterCommand({ command: 'AgreeToCodeOfConduct', feedback })).toStrictEqual(
          Routes.WriteFeedbackEnterFeedback,
        )
      })

      test.prop([fc.feedbackInProgress({ feedback: fc.html(), persona: fc.constant(undefined) })])(
        'no persona',
        feedback => {
          expect(_.NextPageAfterCommand({ command: 'AgreeToCodeOfConduct', feedback })).toStrictEqual(
            Routes.WriteFeedbackChoosePersona,
          )
        },
      )

      test.prop([fc.feedbackInProgress({ feedback: fc.html(), persona: fc.constantFrom('public', 'pseudonym') })])(
        'completed',
        feedback => {
          expect(_.NextPageAfterCommand({ command: 'AgreeToCodeOfConduct', feedback })).toStrictEqual(
            Routes.WriteFeedbackCheck,
          )
        },
      )
    })

    test.prop([fc.feedbackState().filter(feedback => feedback._tag !== 'FeedbackInProgress')])(
      'not FeedbackInProgress',
      feedback => {
        expect(_.NextPageAfterCommand({ command: 'AgreeToCodeOfConduct', feedback })).toStrictEqual(
          Routes.WriteFeedbackCheck,
        )
      },
    )
  })

  test.prop([fc.feedbackState()])('PublishFeedback', feedback => {
    expect(_.NextPageAfterCommand({ command: 'PublishFeedback', feedback })).toStrictEqual(
      Routes.WriteFeedbackPublishing,
    )
  })
})
