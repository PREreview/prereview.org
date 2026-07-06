import { UrlParams } from '@effect/platform'
import { describe, expect, it } from '@effect/vitest'
import { Either } from 'effect'
import * as _ from '../../../../src/WebApp/RequestAReviewFlow/EnterEmailAddressPage/EnterEmailAddressForm.ts'
import { EmailAddress } from '../../../../src/types/EmailAddress.ts'

describe('fromBody', () => {
  it.each<[string, UrlParams.Input, _.EnterEmailAddressForm]>([
    ['empty', {}, new _.InvalidForm({ emailAddress: Either.left(new _.Missing()) })],
    ['only whitespace', { emailAddress: ' \n \t ' }, new _.InvalidForm({ emailAddress: Either.left(new _.Missing()) })],
    [
      'valid email address',
      { emailAddress: 'jcarberry@example.com' },
      new _.CompletedForm({ emailAddress: EmailAddress('jcarberry@example.com') }),
    ],
    [
      'invalid email address',
      { emailAddress: 'not an email address' },
      new _.InvalidForm({ emailAddress: Either.left(new _.Invalid({ value: 'not an email address' })) }),
    ],
    [
      'valid email address with whitespace',
      { emailAddress: '  \n jcarberry@example.com \t \n' },
      new _.CompletedForm({ emailAddress: EmailAddress('jcarberry@example.com') }),
    ],
  ])('%s', (_name, input, expected) => {
    const body = UrlParams.fromInput(input)

    const actual = _.fromBody(body)

    expect(actual).toStrictEqual(expected)
  })
})
