import { UrlParams } from '@effect/platform'
import { describe, expect, it } from '@effect/vitest'
import { Either } from 'effect'
import * as _ from '../../../../src/WebApp/RequestAReviewFlow/ReceiveNotificationsPage/ReceiveNotificationsForm.ts'

describe('fromBody', () => {
  it.each<[string, UrlParams.Input, _.ReceiveNotificationsForm]>([
    ['empty', {}, new _.InvalidForm({ receiveNotifications: Either.left(new _.Missing()) })],
    [
      'invalid answer',
      { receiveNotifications: 'foo' },
      new _.InvalidForm({ receiveNotifications: Either.left(new _.Missing()) }),
    ],
    ['yes answer', { receiveNotifications: 'yes' }, new _.CompletedForm({ receiveNotifications: 'yes' })],
    ['no answer', { receiveNotifications: 'no' }, new _.CompletedForm({ receiveNotifications: 'no' })],
  ])('%s', (_name, input, expected) => {
    const body = UrlParams.fromInput(input)

    const actual = _.fromBody(body)

    expect(actual).toStrictEqual(expected)
  })
})
