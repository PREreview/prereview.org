import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import * as _ from '../../../src/ExternalInteractions/Email/legacy-email.ts'
import { translate } from '../../../src/locales/index.ts'
import * as fc from '../../fc.ts'

test.prop([
  fc.origin(),
  fc.record({
    name: fc.nonEmptyString(),
    emailAddress: fc.emailAddress(),
  }),
  fc.uuid(),
  fc.record({
    author: fc.string(),
    preprint: fc.preprintTitle(),
  }),
  fc.supportedLocale(),
])('createAuthorInviteEmail', (publicUrl, person, authorInviteId, newPrereview, locale) => {
  const actual = _.createAuthorInviteEmail(person, authorInviteId, newPrereview, locale)({ publicUrl })

  expect(actual).toStrictEqual(
    expect.objectContaining({
      from: { address: 'help@prereview.org', name: 'PREreview' },
      to: { address: person.emailAddress, name: person.name },
      subject: translate(locale)('email', 'beListedAsAuthor')(),
    }),
  )
})
