import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Tuple } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import {
  UnverifiedContactEmailAddress,
  type SaveContactEmailAddressEnv,
  type VerifyContactEmailAddressForReviewEnv,
} from '../../../src/contact-email-address.ts'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import { writeReviewMatch, writeReviewNeedToVerifyEmailAddressMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { FormC, formKey } from '../../../src/WebApp/write-review/form.ts'
import * as _ from '../../../src/WebApp/write-review/index.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'
import * as fc from './fc.ts'

describe('writeReviewEnterEmailAddress', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.anything(),
    fc.string(),
    fc.form(),
    fc.user(),
    fc.supportedLocale(),
    fc.verifiedContactEmailAddress(),
  ])(
    'when the user has a verified email address',
    async (preprintId, preprintTitle, body, method, newReview, user, locale, contactEmailAddress) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewEnterEmailAddress({ body, id: preprintId, method, locale, user })({
        formStore,
        generateUuid: shouldNotBeCalled,
        getContactEmailAddress: () => TE.right(contactEmailAddress),
        getPreprintTitle: () => TE.right(preprintTitle),
        saveContactEmailAddress: shouldNotBeCalled,
        verifyContactEmailAddressForReview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
      })
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.anything(),
    fc.requestMethod().filter(method => method !== 'POST'),
    fc.form(),
    fc.user(),
    fc.supportedLocale(),
    fc.either(fc.constant('not-found'), fc.unverifiedContactEmailAddress()),
  ])(
    'when the user needs to verify their email address',
    async (preprintId, preprintTitle, body, method, newReview, user, locale, contactEmailAddress) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewEnterEmailAddress({ body, id: preprintId, method, locale, user })({
        formStore,
        generateUuid: shouldNotBeCalled,
        getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
        getPreprintTitle: () => TE.right(preprintTitle),
        saveContactEmailAddress: shouldNotBeCalled,
        verifyContactEmailAddressForReview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        status: StatusCodes.OK,
        title: expect.anything(),
        nav: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: [],
      })
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.emailAddress().map(emailAddress => Tuple.make({ emailAddress }, emailAddress)),
    fc.uuid(),
    fc.user(),
    fc.supportedLocale(),
    fc.either(fc.constant('not-found'), fc.unverifiedContactEmailAddress()),
    fc.form(),
  ])(
    'when an email address is given',
    async (
      preprintId,
      preprintTitle,
      [body, emailAddress],
      verificationToken,
      user,
      locale,
      contactEmailAddress,
      newReview,
    ) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))
      const saveContactEmailAddress = jest.fn<SaveContactEmailAddressEnv['saveContactEmailAddress']>(_ =>
        TE.right(undefined),
      )
      const verifyContactEmailAddressForReview = jest.fn<
        VerifyContactEmailAddressForReviewEnv['verifyContactEmailAddressForReview']
      >(_ => TE.right(undefined))

      const actual = await _.writeReviewEnterEmailAddress({ body, id: preprintId, method: 'POST', locale, user })({
        formStore,
        getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
        generateUuid: () => verificationToken,
        getPreprintTitle: () => TE.right(preprintTitle),
        saveContactEmailAddress,
        verifyContactEmailAddressForReview,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(writeReviewNeedToVerifyEmailAddressMatch.formatter, { id: preprintTitle.id }),
      })
      expect(saveContactEmailAddress).toHaveBeenCalledWith(
        user.orcid,
        new UnverifiedContactEmailAddress({ value: emailAddress, verificationToken }),
      )
      expect(verifyContactEmailAddressForReview).toHaveBeenCalledWith(
        user,
        new UnverifiedContactEmailAddress({ value: emailAddress, verificationToken }),
        preprintTitle.id,
      )
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.record({
      emailAddress: fc
        .string()
        .filter(string => !string.includes('.') || !string.includes('@') || string === '' || /\s/g.test(string)),
    }),
    fc.uuid(),
    fc.user(),
    fc.supportedLocale(),
    fc.form(),
  ])(
    "when an email address isn't given",
    async (preprintId, preprintTitle, body, verificationToken, user, locale, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewEnterEmailAddress({ body, id: preprintId, method: 'POST', locale, user })({
        formStore,
        getContactEmailAddress: () => TE.left('not-found'),
        generateUuid: () => verificationToken,
        getPreprintTitle: () => TE.right(preprintTitle),
        saveContactEmailAddress: shouldNotBeCalled,
        verifyContactEmailAddressForReview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        status: StatusCodes.BadRequest,
        title: expect.anything(),
        nav: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: ['error-summary.js'],
      })
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.anything(),
    fc.string(),
    fc.user(),
    fc.supportedLocale(),
  ])('when there is no form', async (preprintId, preprintTitle, body, method, user, locale) => {
    const actual = await _.writeReviewEnterEmailAddress({ body, id: preprintId, method, locale, user })({
      formStore: new Keyv(),
      getContactEmailAddress: shouldNotBeCalled,
      generateUuid: shouldNotBeCalled,
      getPreprintTitle: () => TE.right(preprintTitle),
      saveContactEmailAddress: shouldNotBeCalled,
      verifyContactEmailAddressForReview: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: StatusCodes.SeeOther,
      location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
    })
  })

  test.prop([fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale()])(
    'when the preprint cannot be loaded',
    async (preprintId, body, method, user, locale) => {
      const actual = await _.writeReviewEnterEmailAddress({ body, id: preprintId, method, locale, user })({
        formStore: new Keyv(),
        getContactEmailAddress: shouldNotBeCalled,
        generateUuid: shouldNotBeCalled,
        getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
        saveContactEmailAddress: shouldNotBeCalled,
        verifyContactEmailAddressForReview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale()])(
    'when the preprint cannot be found',
    async (preprintId, body, method, user, locale) => {
      const actual = await _.writeReviewEnterEmailAddress({ body, id: preprintId, method, locale, user })({
        formStore: new Keyv(),
        getContactEmailAddress: shouldNotBeCalled,
        generateUuid: shouldNotBeCalled,
        getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
        saveContactEmailAddress: shouldNotBeCalled,
        verifyContactEmailAddressForReview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string(), fc.supportedLocale()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, body, method, locale) => {
      const actual = await _.writeReviewEnterEmailAddress({ body, id: preprintId, method, locale, user: undefined })({
        formStore: new Keyv(),
        getContactEmailAddress: shouldNotBeCalled,
        generateUuid: shouldNotBeCalled,
        getPreprintTitle: () => TE.right(preprintTitle),
        saveContactEmailAddress: shouldNotBeCalled,
        verifyContactEmailAddressForReview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
      })
    },
  )
})
