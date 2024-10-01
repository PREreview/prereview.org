import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as _ from '../../src/WriteFeedbackFlow/DecideNextPage.js'
import * as Routes from '../../src/routes.js'
import * as fc from '../fc.js'

describe('NextPageFromState', () => {
  test.prop([fc.feedbackInProgress()])('FeedbackInProgress', feedback => {
    expect(_.NextPageFromState(feedback)).toStrictEqual(Routes.WriteFeedbackEnterFeedback)
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
