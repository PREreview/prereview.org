import { describe, expect, it, vi } from '@effect/vitest'
import { Effect } from 'effect'
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
  it.effect.prop(
    'when the email address is unverified',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.form(),
      fc.user(),
      fc.supportedLocale(),
      fc.unverifiedContactEmailAddress(),
    ],
    ([preprintId, preprintTitle, newReview, user, locale, contactEmailAddress]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))
        const getContactEmailAddress = vi.fn<GetContactEmailAddressEnv['getContactEmailAddress']>(_ =>
          TE.right(contactEmailAddress),
        )
        const saveContactEmailAddress = vi.fn<SaveContactEmailAddressEnv['saveContactEmailAddress']>(_ =>
          TE.right(undefined),
        )

        const actual = yield* Effect.promise(
          _.writeReviewVerifyEmailAddress({
            id: preprintId,
            locale,
            user,
            verify: contactEmailAddress.verificationToken,
          })({
            formStore,
            getContactEmailAddress,
            getPreprintTitle: () => TE.right(preprintTitle),
            saveContactEmailAddress,
          }),
        )

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
      }),
  )

  it.effect.prop(
    'when the email address is already verified',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.form(),
      fc.user(),
      fc.supportedLocale(),
      fc.verifiedContactEmailAddress(),
      fc.uuid(),
    ],
    ([preprintId, preprintTitle, newReview, user, locale, contactEmailAddress, verify]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewVerifyEmailAddress({ id: preprintId, locale, user, verify })({
            formStore,
            getContactEmailAddress: () => TE.right(contactEmailAddress),
            getPreprintTitle: () => TE.right(preprintTitle),
            saveContactEmailAddress: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }),
  )

  it.effect.prop(
    "when the verification token doesn't match",
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.form(),
      fc.user(),
      fc.supportedLocale(),
      fc.unverifiedContactEmailAddress(),
      fc.uuid(),
    ],
    ([preprintId, preprintTitle, newReview, user, locale, contactEmailAddress, verify]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewVerifyEmailAddress({ id: preprintId, locale, user, verify })({
            formStore,
            getContactEmailAddress: () => TE.right(contactEmailAddress),
            getPreprintTitle: () => TE.right(preprintTitle),
            saveContactEmailAddress: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }),
  )

  it.effect.prop(
    'when there is no email address',
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.form(), fc.user(), fc.supportedLocale(), fc.uuid()],
    ([preprintId, preprintTitle, newReview, user, locale, verify]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewVerifyEmailAddress({ id: preprintId, locale, user, verify })({
            formStore,
            getContactEmailAddress: () => TE.left('not-found'),
            getPreprintTitle: () => TE.right(preprintTitle),
            saveContactEmailAddress: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }),
  )

  it.effect.prop(
    "when the email address can't be loaded",
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.form(), fc.user(), fc.supportedLocale(), fc.uuid()],
    ([preprintId, preprintTitle, newReview, user, locale, verify]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewVerifyEmailAddress({ id: preprintId, locale, user, verify })({
            formStore,
            getContactEmailAddress: () => TE.left('unavailable'),
            getPreprintTitle: () => TE.right(preprintTitle),
            saveContactEmailAddress: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }),
  )

  it.effect.prop(
    'when there is no form',
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.user(), fc.supportedLocale(), fc.uuid()],
    ([preprintId, preprintTitle, user, locale, verify]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewVerifyEmailAddress({ id: preprintId, locale, user, verify })({
            formStore: new Keyv(),
            getContactEmailAddress: shouldNotBeCalled,
            getPreprintTitle: () => TE.right(preprintTitle),
            saveContactEmailAddress: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
        })
      }),
  )

  it.effect.prop(
    'when the preprint cannot be loaded',
    [fc.indeterminatePreprintId(), fc.user(), fc.supportedLocale(), fc.uuid()],
    ([preprintId, user, locale, verify]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewVerifyEmailAddress({ id: preprintId, locale, user, verify })({
            formStore: new Keyv(),
            getContactEmailAddress: shouldNotBeCalled,
            getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
            saveContactEmailAddress: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }),
  )

  it.effect.prop(
    'when the preprint cannot be found',
    [fc.indeterminatePreprintId(), fc.user(), fc.supportedLocale(), fc.uuid()],
    ([preprintId, user, locale, verify]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewVerifyEmailAddress({ id: preprintId, locale, user, verify })({
            formStore: new Keyv(),
            getContactEmailAddress: shouldNotBeCalled,
            getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
            saveContactEmailAddress: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }),
  )

  it.effect.prop(
    'when the user is not logged in',
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.supportedLocale(), fc.uuid()],
    ([preprintId, preprintTitle, locale, verify]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewVerifyEmailAddress({ id: preprintId, locale, user: undefined, verify })({
            formStore: new Keyv(),
            getContactEmailAddress: shouldNotBeCalled,
            getPreprintTitle: () => TE.right(preprintTitle),
            saveContactEmailAddress: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: format(writeReviewVerifyEmailAddressMatch.formatter, { id: preprintTitle.id, verify }),
        })
      }),
  )
})
