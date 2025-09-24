import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import type { VerifyContactEmailAddressForReviewEnv } from '../../src/contact-email-address.ts'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../src/Preprints/index.ts'
import {
  writeReviewEnterEmailAddressMatch,
  writeReviewMatch,
  writeReviewNeedToVerifyEmailAddressMatch,
} from '../../src/routes.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import { FormC, formKey } from '../../src/write-review/form.ts'
import * as _ from '../../src/write-review/index.ts'
import { shouldNotBeCalled } from '../should-not-be-called.ts'
import * as fc from './fc.ts'

describe('writeReviewNeedToVerifyEmailAddress', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.string(),
    fc.form(),
    fc.user(),
    fc.supportedLocale(),
    fc.verifiedContactEmailAddress(),
  ])(
    'when the user has a verified email address',
    async (preprintId, preprintTitle, method, newReview, user, locale, contactEmailAddress) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewNeedToVerifyEmailAddress({ id: preprintId, locale, method, user })({
        formStore,
        getContactEmailAddress: () => TE.right(contactEmailAddress),
        getPreprintTitle: () => TE.right(preprintTitle),
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
    fc.requestMethod().filter(method => method !== 'POST'),
    fc.form(),
    fc.user(),
    fc.supportedLocale(),
    fc.unverifiedContactEmailAddress(),
  ])(
    'when the user needs to verify their email address',
    async (preprintId, preprintTitle, method, newReview, user, locale, contactEmailAddress) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewNeedToVerifyEmailAddress({ id: preprintId, locale, method, user })({
        formStore,
        getContactEmailAddress: () => TE.right(contactEmailAddress),
        getPreprintTitle: () => TE.right(preprintTitle),
        verifyContactEmailAddressForReview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        status: StatusCodes.OK,
        title: expect.anything(),
        nav: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.form(),
    fc.user(),
    fc.supportedLocale(),
    fc.unverifiedContactEmailAddress(),
  ])(
    'resending verification email',
    async (preprintId, preprintTitle, newReview, user, locale, contactEmailAddress) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))
      const verifyContactEmailAddressForReview = jest.fn<
        VerifyContactEmailAddressForReviewEnv['verifyContactEmailAddressForReview']
      >(_ => TE.right(undefined))

      const actual = await _.writeReviewNeedToVerifyEmailAddress({ id: preprintId, locale, method: 'POST', user })({
        formStore,
        getContactEmailAddress: () => TE.right(contactEmailAddress),
        getPreprintTitle: () => TE.right(preprintTitle),
        verifyContactEmailAddressForReview,
      })()

      expect(actual).toStrictEqual({
        _tag: 'FlashMessageResponse',
        location: format(writeReviewNeedToVerifyEmailAddressMatch.formatter, { id: preprintTitle.id }),
        message: 'verify-contact-email-resend',
      })
      expect(verifyContactEmailAddressForReview).toHaveBeenCalledWith(user, contactEmailAddress, preprintTitle.id)
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.string(),
    fc.form(),
    fc.user(),
    fc.supportedLocale(),
  ])(
    'when the user needs to give their email address',
    async (preprintId, preprintTitle, method, newReview, user, locale) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewNeedToVerifyEmailAddress({ id: preprintId, locale, method, user })({
        formStore,
        getContactEmailAddress: () => TE.left('not-found'),
        getPreprintTitle: () => TE.right(preprintTitle),
        verifyContactEmailAddressForReview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(writeReviewEnterEmailAddressMatch.formatter, { id: preprintTitle.id }),
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.string(), fc.user(), fc.supportedLocale()])(
    'when there is no form',
    async (preprintId, preprintTitle, method, user, locale) => {
      const actual = await _.writeReviewNeedToVerifyEmailAddress({ id: preprintId, locale, method, user })({
        getContactEmailAddress: shouldNotBeCalled,
        getPreprintTitle: () => TE.right(preprintTitle),
        formStore: new Keyv(),
        verifyContactEmailAddressForReview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.string(), fc.user(), fc.supportedLocale()])(
    'when the preprint cannot be loaded',
    async (preprintId, method, user, locale) => {
      const actual = await _.writeReviewNeedToVerifyEmailAddress({ id: preprintId, locale, method, user })({
        formStore: new Keyv(),
        getContactEmailAddress: shouldNotBeCalled,
        getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
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

  test.prop([fc.indeterminatePreprintId(), fc.string(), fc.user(), fc.supportedLocale()])(
    'when the preprint cannot be found',
    async (preprintId, method, user, locale) => {
      const actual = await _.writeReviewNeedToVerifyEmailAddress({ id: preprintId, locale, method, user })({
        formStore: new Keyv(),
        getContactEmailAddress: shouldNotBeCalled,
        getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
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

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.string(), fc.supportedLocale()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, method, locale) => {
      const actual = await _.writeReviewNeedToVerifyEmailAddress({ id: preprintId, locale, method, user: undefined })({
        getContactEmailAddress: shouldNotBeCalled,
        getPreprintTitle: () => TE.right(preprintTitle),
        formStore: new Keyv(),
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
