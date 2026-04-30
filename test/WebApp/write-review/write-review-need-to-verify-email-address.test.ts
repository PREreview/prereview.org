import { describe, expect, it, vi } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import type { VerifyContactEmailAddressForReviewEnv } from '../../../src/contact-email-address.ts'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import {
  writeReviewEnterEmailAddressMatch,
  writeReviewMatch,
  writeReviewNeedToVerifyEmailAddressMatch,
} from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { FormC, formKey } from '../../../src/WebApp/write-review/form.ts'
import * as _ from '../../../src/WebApp/write-review/index.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'
import * as fc from './fc.ts'

describe('writeReviewNeedToVerifyEmailAddress', () => {
  it.effect.prop(
    'when the user has a verified email address',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.string(),
      fc.form(),
      fc.user(),
      fc.supportedLocale(),
      fc.verifiedContactEmailAddress(),
    ],
    ([preprintId, preprintTitle, method, newReview, user, locale, contactEmailAddress]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewNeedToVerifyEmailAddress({ id: preprintId, locale, method, user })({
            formStore,
            getContactEmailAddress: () => TE.right(contactEmailAddress),
            getPreprintTitle: () => TE.right(preprintTitle),
            getPublicPersona: shouldNotBeCalled,
            verifyContactEmailAddressForReview: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
        })
      }),
  )

  it.effect.prop(
    'when the user needs to verify their email address',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.requestMethod().filter(method => method !== 'POST'),
      fc.form(),
      fc.user(),
      fc.supportedLocale(),
      fc.unverifiedContactEmailAddress(),
    ],
    ([preprintId, preprintTitle, method, newReview, user, locale, contactEmailAddress]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewNeedToVerifyEmailAddress({ id: preprintId, locale, method, user })({
            formStore,
            getContactEmailAddress: () => TE.right(contactEmailAddress),
            getPreprintTitle: () => TE.right(preprintTitle),
            getPublicPersona: shouldNotBeCalled,
            verifyContactEmailAddressForReview: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          status: StatusCodes.OK,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }),
  )

  it.effect.prop(
    'resending verification email',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.form(),
      fc.user(),
      fc.publicPersona(),
      fc.supportedLocale(),
      fc.unverifiedContactEmailAddress(),
    ],
    ([preprintId, preprintTitle, newReview, user, publicPersona, locale, contactEmailAddress]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))
        const verifyContactEmailAddressForReview = vi.fn<
          VerifyContactEmailAddressForReviewEnv['verifyContactEmailAddressForReview']
        >(_ => TE.right(undefined))

        const actual = yield* Effect.promise(
          _.writeReviewNeedToVerifyEmailAddress({ id: preprintId, locale, method: 'POST', user })({
            formStore,
            getContactEmailAddress: () => TE.right(contactEmailAddress),
            getPreprintTitle: () => TE.right(preprintTitle),
            getPublicPersona: () => TE.right(publicPersona),
            verifyContactEmailAddressForReview,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'FlashMessageResponse',
          location: format(writeReviewNeedToVerifyEmailAddressMatch.formatter, { id: preprintTitle.id }),
          message: 'verify-contact-email-resend',
        })
        expect(verifyContactEmailAddressForReview).toHaveBeenCalledWith(
          publicPersona.name,
          contactEmailAddress,
          preprintTitle.id,
        )
      }),
  )

  it.effect.prop(
    'when the user needs to give their email address',
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.string(), fc.form(), fc.user(), fc.supportedLocale()],
    ([preprintId, preprintTitle, method, newReview, user, locale]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewNeedToVerifyEmailAddress({ id: preprintId, locale, method, user })({
            formStore,
            getContactEmailAddress: () => TE.left('not-found'),
            getPreprintTitle: () => TE.right(preprintTitle),
            getPublicPersona: shouldNotBeCalled,
            verifyContactEmailAddressForReview: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewEnterEmailAddressMatch.formatter, { id: preprintTitle.id }),
        })
      }),
  )

  it.effect.prop(
    'when there is no form',
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.string(), fc.user(), fc.supportedLocale()],
    ([preprintId, preprintTitle, method, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewNeedToVerifyEmailAddress({ id: preprintId, locale, method, user })({
            getContactEmailAddress: shouldNotBeCalled,
            getPreprintTitle: () => TE.right(preprintTitle),
            getPublicPersona: shouldNotBeCalled,
            formStore: new Keyv(),
            verifyContactEmailAddressForReview: shouldNotBeCalled,
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
    [fc.indeterminatePreprintId(), fc.string(), fc.user(), fc.supportedLocale()],
    ([preprintId, method, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewNeedToVerifyEmailAddress({ id: preprintId, locale, method, user })({
            formStore: new Keyv(),
            getContactEmailAddress: shouldNotBeCalled,
            getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
            getPublicPersona: shouldNotBeCalled,
            verifyContactEmailAddressForReview: shouldNotBeCalled,
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
    [fc.indeterminatePreprintId(), fc.string(), fc.user(), fc.supportedLocale()],
    ([preprintId, method, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewNeedToVerifyEmailAddress({ id: preprintId, locale, method, user })({
            formStore: new Keyv(),
            getContactEmailAddress: shouldNotBeCalled,
            getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
            getPublicPersona: shouldNotBeCalled,
            verifyContactEmailAddressForReview: shouldNotBeCalled,
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
    "when there isn't a session",
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.string(), fc.supportedLocale()],
    ([preprintId, preprintTitle, method, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewNeedToVerifyEmailAddress({ id: preprintId, locale, method, user: undefined })({
            getContactEmailAddress: shouldNotBeCalled,
            getPreprintTitle: () => TE.right(preprintTitle),
            getPublicPersona: shouldNotBeCalled,
            formStore: new Keyv(),
            verifyContactEmailAddressForReview: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
        })
      }),
  )
})
