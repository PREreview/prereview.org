import { describe, expect, it } from '@effect/vitest'
import { Either, Schema } from 'effect'
import { ArrayFormatter } from 'effect/ParseResult'
import * as D from 'io-ts/lib/Decoder.js'
import * as _ from '../../src/types/EmailAddress.ts'
import * as fc from '../fc.ts'

describe('EmailAddressC', () => {
  describe('decode', () => {
    it.prop('with an email address', [fc.emailAddress()], ([string]) => {
      const actual = _.EmailAddressC.decode(string)

      expect(actual).toStrictEqual(D.success(string))
    })

    it.prop(
      'with a non-email address',
      [fc.string().filter(string => !string.includes('.') || !string.includes('@') || /\s/g.test(string))],
      ([string]) => {
        const actual = _.EmailAddressC.decode(string)

        expect(actual).toStrictEqual(D.failure(string, 'EmailAddress'))
      },
    )

    it.prop('with a non-string', [fc.anything().filter(value => typeof value !== 'string')], ([value]) => {
      const actual = _.EmailAddressC.decode(value)

      expect(actual).toStrictEqual(D.failure(value, 'string'))
    })
  })

  it.prop('encode', [fc.emailAddress()], ([string]) => {
    const actual = _.EmailAddressC.encode(string)

    expect(actual).toStrictEqual(string)
  })
})

describe('EmailAddressSchema', () => {
  describe('decode', () => {
    it.prop(
      'with an email address',
      [fc.emailAddress().map(String)],
      ([string]) => {
        const actual = Schema.decodeSync(_.EmailAddressSchema)(string)

        expect(actual).toStrictEqual(string)
      },
      {
        fastCheck: {
          examples: [
            ['simple@example.com'],
            ['very.common@example.com'],
            ['FirstName.LastName@Example.com'], // case is always ignored after the @ and usually before
            ['x@example.com'], // one-letter local-part
            ['a@b.co'], // minimal practical domain
            ['long.email-address-with-hyphens@and.subdomains.example.com'],
            ['user@sub.sub2.example.com'], // deep subdomains
            ['USER@EXAMPLE.COM'], // uppercase local/domain
            ['user@xn--bcher-kva.example'], // punycode IDN domain
            ['user.name+tag+sorting@example.com'], // may be routed to user.name@example.com inbox depending on mail server
            ['name/surname@example.com'], // slashes are a printable character, and allowed
            ['customer/department=shipping@example.com'], // RFC-allowed specials
            ['example@s.example'], // see the List of Internet top-level domains
            ['mailhost!username@example.org'], // bangified host route used for UUCP mailers
            ['user%example.com@example.org'], // % escaped mail route to user@example.com via example.org
            ['user-@example.org'], // local-part ending with non-alphanumeric character from the list of allowed printable characters
            ['I❤️CHOCOLATE@example.com'], // emoji are only allowed with SMTPUTF8
          ],
        },
      },
    )

    it.prop(
      'with a non-email address',
      [fc.string().filter(string => !string.includes('.') || !string.includes('@') || /\s/g.test(string))],
      ([string]) => {
        const actual = Either.mapLeft(Schema.decodeEither(_.EmailAddressSchema)(string), ArrayFormatter.formatErrorSync)

        expect(actual).toStrictEqual(Either.left([expect.objectContaining({ message: 'not an email address' })]))
      },
      {
        fastCheck: {
          examples: [
            // valid but unsupported
            ['admin@example'], // local domain name with no TLD, although ICANN highly discourages dotless email addresses[32]
            ['" "@example.org'], // space between the quotes
            ['"jane..doe"@example.org'], // quoted double dot
            ['"very.(),:;<>[]\\".VERY.\\"very@\\ \\"very\\".unusual"@strange.example.com'], // include non-letters character AND multiple at sign, the first one being double quoted
            ['postmaster@[123.123.123.123]'], // IP addresses are allowed instead of domains when in square brackets, but strongly discouraged
            ['postmaster@[IPv6:2001:0db8:85a3:0000:0000:8a2e:0370:7334]'], // IPv6 uses a different syntax
            ['_test@[IPv6:2001:0db8:85a3:0000:0000:8a2e:0370:7334]'], // begin with underscore different syntax
            // invalid
            ['abc.example.com'], // no @ character
            ['a@b@c@example.com'], // only one @ is allowed outside quotation marks
            ['.user@example.com'], // leading dot in local-part
            ['user.@example.com'], // trailing dot in local-part
            ['user..name@example.com'], // consecutive dots in local-part
            ['user@example..com'], // consecutive dots in domain
            ['user@-example.com'], // label starts with '-'
            ['user@example-.com'], // label ends with '-'
            ['user@example.com.'], // trailing dot domain
            ['user@exam_ple.com'], // underscore in domain label
            ['user@.example.com'], // leading dot in domain
            ['a"b(c)d,e:f;g<h>i[j\\k]l@example.com'], // none of the special characters in this local-part are allowed outside quotation marks
            ['just"not"right@example.com'], // quoted strings must be dot separated or be the only element making up the local-part
            ['this is"not\\allowed@example.com'], // spaces, quotes, and backslashes may only exist when within quoted strings and preceded by a backslash
            ['this\\ still\\"not\\allowed@example.com'], // even if escaped (preceded by a backslash), spaces, quotes, and backslashes must still be contained by quotes
            ['1234567890123456789012345678901234567890123456789012345678901234+x@example.com'], // local-part is longer than 64 characters
            ['i.like.underscores@but_they_are_not_allowed_in_this_part'], // underscore is not allowed in domain part
            ['firstname.\u200blastname@\u200bexample.\u200bcom'],
            ['josiah carberry at example com'],
            ['josiah carberry@example.com'],
          ],
        },
      },
    )

    it.prop('with a non-string', [fc.anything().filter(value => typeof value !== 'string')], ([value]) => {
      const actual = Schema.decodeUnknownEither(_.EmailAddressSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  it.prop('encode', [fc.emailAddress()], ([string]) => {
    const actual = Schema.encodeSync(_.EmailAddressSchema)(string)

    expect(actual).toStrictEqual(string)
  })
})
