import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import {
  VerifiedContactEmailAddress,
  type GetContactEmailAddressEnv,
  type SaveContactEmailAddressEnv,
} from '../../../src/contact-email-address.ts'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import { writeReviewMatch, writeReviewVerifyEmailAddressMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { FormC, formKey } from '../../../src/WebApp/write-review/form.ts'
import * as _ from '../../../src/WebApp/write-review/index.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'
import * as fc from './fc.ts'

describe('writeReviewVerifyEmailAddress', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.form(),
    fc.user(),
    fc.supportedLocale(),
    fc.unverifiedContactEmailAddress(),
  ])(
    'when the email address is unverified',
    async (preprintId, preprintTitle, newReview, user, locale, contactEmailAddress) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))
      const getContactEmailAddress = jest.fn<GetContactEmailAddressEnv['getContactEmailAddress']>(_ =>
        TE.right(contactEmailAddress),
      )
      const saveContactEmailAddress = jest.fn<SaveContactEmailAddressEnv['saveContactEmailAddress']>(_ =>
        TE.right(undefined),
      )

      const actual = await _.writeReviewVerifyEmailAddress({
        id: preprintId,
        locale,
        user,
        verify: contactEmailAddress.verificationToken,
      })({
        formStore,
        getContactEmailAddress,
        getPreprintTitle: () => TE.right(preprintTitle),
        saveContactEmailAddress,
      })()

      expect(actual).toStrictEqual({
        _tag: 'FlashMessageResponse',
        location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
        message: 'contact-email-verified',
      })
      expect(getContactEmailAddress).toHaveBeenCalledWith(user.orcid)
      expect(saveContactEmailAddress).toHaveBeenCalledWith(
        user.orcid,
        new VerifiedContactEmailAddress({ value: contactEmailAddress.value }),
      )
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.form(),
    fc.user(),
    fc.supportedLocale(),
    fc.verifiedContactEmailAddress(),
    fc.uuid(),
  ])(
    'when the email address is already verified',
    async (preprintId, preprintTitle, newReview, user, locale, contactEmailAddress, verify) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewVerifyEmailAddress({ id: preprintId, locale, user, verify })({
        formStore,
        getContactEmailAddress: () => TE.right(contactEmailAddress),
        getPreprintTitle: () => TE.right(preprintTitle),
        saveContactEmailAddress: shouldNotBeCalled,
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

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.form(),
    fc.user(),
    fc.supportedLocale(),
    fc.unverifiedContactEmailAddress(),
    fc.uuid(),
  ])(
    "when the verification token doesn't match",
    async (preprintId, preprintTitle, newReview, user, locale, contactEmailAddress, verify) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewVerifyEmailAddress({ id: preprintId, locale, user, verify })({
        formStore,
        getContactEmailAddress: () => TE.right(contactEmailAddress),
        getPreprintTitle: () => TE.right(preprintTitle),
        saveContactEmailAddress: shouldNotBeCalled,
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

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.form(), fc.user(), fc.supportedLocale(), fc.uuid()])(
    'when there is no email address',
    async (preprintId, preprintTitle, newReview, user, locale, verify) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewVerifyEmailAddress({ id: preprintId, locale, user, verify })({
        formStore,
        getContactEmailAddress: () => TE.left('not-found'),
        getPreprintTitle: () => TE.right(preprintTitle),
        saveContactEmailAddress: shouldNotBeCalled,
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

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.form(), fc.user(), fc.supportedLocale(), fc.uuid()])(
    "when the email address can't be loaded",
    async (preprintId, preprintTitle, newReview, user, locale, verify) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewVerifyEmailAddress({ id: preprintId, locale, user, verify })({
        formStore,
        getContactEmailAddress: () => TE.left('unavailable'),
        getPreprintTitle: () => TE.right(preprintTitle),
        saveContactEmailAddress: shouldNotBeCalled,
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

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.user(), fc.supportedLocale(), fc.uuid()])(
    'when there is no form',
    async (preprintId, preprintTitle, user, locale, verify) => {
      const actual = await _.writeReviewVerifyEmailAddress({ id: preprintId, locale, user, verify })({
        formStore: new Keyv(),
        getContactEmailAddress: shouldNotBeCalled,
        getPreprintTitle: () => TE.right(preprintTitle),
        saveContactEmailAddress: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.user(), fc.supportedLocale(), fc.uuid()])(
    'when the preprint cannot be loaded',
    async (preprintId, user, locale, verify) => {
      const actual = await _.writeReviewVerifyEmailAddress({ id: preprintId, locale, user, verify })({
        formStore: new Keyv(),
        getContactEmailAddress: shouldNotBeCalled,
        getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
        saveContactEmailAddress: shouldNotBeCalled,
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

  test.prop([fc.indeterminatePreprintId(), fc.user(), fc.supportedLocale(), fc.uuid()])(
    'when the preprint cannot be found',
    async (preprintId, user, locale, verify) => {
      const actual = await _.writeReviewVerifyEmailAddress({ id: preprintId, locale, user, verify })({
        formStore: new Keyv(),
        getContactEmailAddress: shouldNotBeCalled,
        getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
        saveContactEmailAddress: shouldNotBeCalled,
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

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.supportedLocale(), fc.uuid()])(
    'when the user is not logged in',
    async (preprintId, preprintTitle, locale, verify) => {
      const actual = await _.writeReviewVerifyEmailAddress({ id: preprintId, locale, user: undefined, verify })({
        formStore: new Keyv(),
        getContactEmailAddress: shouldNotBeCalled,
        getPreprintTitle: () => TE.right(preprintTitle),
        saveContactEmailAddress: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(writeReviewVerifyEmailAddressMatch.formatter, { id: preprintTitle.id, verify }),
      })
    },
  )
})
