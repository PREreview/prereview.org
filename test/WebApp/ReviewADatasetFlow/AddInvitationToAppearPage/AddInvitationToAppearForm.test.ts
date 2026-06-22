import { UrlParams } from '@effect/platform'
import { describe, expect, it } from '@effect/vitest'
import { Either } from 'effect'
import * as _ from '../../../../src/WebApp/ReviewADatasetFlow/AddInvitationToAppearPage/AddInvitationToAppearForm.ts'
import { EmailAddress } from '../../../../src/types/EmailAddress.ts'
import { Name } from '../../../../src/types/Name.ts'
import { NonEmptyString } from '../../../../src/types/NonEmptyString.ts'

describe('fromBody', () => {
  it.each<[string, UrlParams.Input, _.AddInvitationToAppearForm]>([
    [
      'empty',
      {},
      new _.InvalidForm({ name: Either.left(new _.Missing()), emailAddress: Either.left(new _.Missing()) }),
    ],
    [
      'only whitespace',
      { name: ' \n \t ', emailAddress: ' \n \t ' },
      new _.InvalidForm({ name: Either.left(new _.Missing()), emailAddress: Either.left(new _.Missing()) }),
    ],
    [
      'valid name',
      { name: 'Josiah Carberry' },
      new _.InvalidForm({
        name: Either.right(Name('Josiah Carberry')),
        emailAddress: Either.left(new _.Missing()),
      }),
    ],
    [
      'valid email address',
      { emailAddress: 'jcarberry@example.com' },
      new _.InvalidForm({
        name: Either.left(new _.Missing()),
        emailAddress: Either.right(EmailAddress('jcarberry@example.com')),
      }),
    ],
    [
      'invalid email address',
      { emailAddress: 'not an email address' },
      new _.InvalidForm({
        name: Either.left(new _.Missing()),
        emailAddress: Either.left(new _.Invalid({ actual: NonEmptyString('not an email address') })),
      }),
    ],
    [
      'valid name and email address',
      { name: 'Josiah Carberry', emailAddress: 'jcarberry@example.com' },
      new _.CompletedForm({
        name: Name('Josiah Carberry'),
        emailAddress: EmailAddress('jcarberry@example.com'),
      }),
    ],
    [
      'valid name and email address with whitespace',
      { name: '  \n Josiah   \t Carberry   \n  ', emailAddress: '  \n jcarberry@example.com \t \n' },
      new _.CompletedForm({
        name: Name('Josiah Carberry'),
        emailAddress: EmailAddress('jcarberry@example.com'),
      }),
    ],
  ])('%s', (_name, input, expected) => {
    const body = UrlParams.fromInput(input)

    const actual = _.fromBody(body)

    expect(actual).toStrictEqual(expected)
  })
})
