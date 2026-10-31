import { UrlParams } from 'effect/http'
import { describe, expect, it } from '../../../vitest.ts'
import { Result } from 'effect'
import * as _ from '../../../../src/WebApp/RequestAReviewFlow/ReceiveNotificationsPage/ReceiveNotificationsForm.ts'

describe('fromBody', () => {
  it.each<[string, UrlParams.Input, _.ReceiveNotificationsForm]>([
    ['empty', {}, new _.InvalidForm({ receiveNotifications: Result.fail(new _.Missing()) })],
    [
      'invalid answer',
      { receiveNotifications: 'foo' },
      new _.InvalidForm({ receiveNotifications: Result.fail(new _.Missing()) }),
    ],
    ['yes answer', { receiveNotifications: 'yes' }, new _.CompletedForm({ receiveNotifications: 'yes' })],
    ['no answer', { receiveNotifications: 'no' }, new _.CompletedForm({ receiveNotifications: 'no' })],
  ])('%s', (_name, input, expected) => {
    const body = UrlParams.fromInput(input)

    const actual = _.fromBody(body)

    expect(actual).toStrictEqual(expected)
  })
})
