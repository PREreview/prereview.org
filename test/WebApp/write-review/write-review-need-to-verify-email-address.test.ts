import { describe, expect, it, vi } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { format } from 'fp-ts-routing'
import Keyv from 'keyv'
import { ContactEmailAddresses, ContactEmailAddressIsNotFound } from '../../../src/ContactEmailAddresses/index.ts'
import { Locale } from '../../../src/Context.ts'
import { PreprintIsNotFound, PreprintIsUnavailable, Preprints } from '../../../src/Preprints/index.ts'
import {
  writeReviewEnterEmailAddressMatch,
  writeReviewMatch,
  writeReviewNeedToVerifyEmailAddressMatch,
  writeReviewPublishMatch,
} from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { FormC, formKey } from '../../../src/WebApp/write-review/form.ts'
import * as _ from '../../../src/WebApp/write-review/index.ts'
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

        const runtime = yield* Effect.runtime<ContactEmailAddresses | Locale | Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewNeedToVerifyEmailAddress({ id: preprintId, locale, method, user })({ formStore, runtime }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
        })
      }).pipe(
        Effect.provide([
          Layer.mock(ContactEmailAddresses, { getContactEmailAddress: () => Effect.succeed(contactEmailAddress) }),
          Layer.succeed(Locale, locale),
          Layer.mock(Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
        ]),
      ),
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

        const runtime = yield* Effect.runtime<ContactEmailAddresses | Locale | Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewNeedToVerifyEmailAddress({ id: preprintId, locale, method, user })({ formStore, runtime }),
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
      }).pipe(
        Effect.provide([
          Layer.mock(ContactEmailAddresses, { getContactEmailAddress: () => Effect.succeed(contactEmailAddress) }),
          Layer.succeed(Locale, locale),
          Layer.mock(Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
        ]),
      ),
  )

  it.effect.prop(
    'resending verification email',
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
        const resendVerificationEmail = vi.fn<(typeof ContactEmailAddresses.Service)['resendVerificationEmail']>(
          _ => Effect.void,
        )

        const runtime = yield* Effect.provide(
          Effect.runtime<ContactEmailAddresses | Locale | Preprints>(),
          Layer.mock(ContactEmailAddresses, {
            getContactEmailAddress: () => Effect.succeed(contactEmailAddress),
            resendVerificationEmail,
          }),
        )

        const actual = yield* Effect.promise(
          _.writeReviewNeedToVerifyEmailAddress({ id: preprintId, locale, method: 'POST', user })({
            formStore,
            runtime,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'FlashMessageResponse',
          location: format(writeReviewNeedToVerifyEmailAddressMatch.formatter, { id: preprintTitle.id }),
          message: 'verify-contact-email-resend',
        })
        expect(resendVerificationEmail).toHaveBeenCalledWith({
          orcidId: user.orcid,
          resumeAt: format(writeReviewPublishMatch.formatter, { id: preprintTitle.id }) as `/${string}`,
        })
      }).pipe(
        Effect.provide([
          Layer.succeed(Locale, locale),
          Layer.mock(Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
        ]),
      ),
  )

  it.effect.prop(
    'when the user needs to give their email address',
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.string(), fc.form(), fc.user(), fc.supportedLocale()],
    ([preprintId, preprintTitle, method, newReview, user, locale]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const runtime = yield* Effect.runtime<ContactEmailAddresses | Locale | Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewNeedToVerifyEmailAddress({ id: preprintId, locale, method, user })({ formStore, runtime }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewEnterEmailAddressMatch.formatter, { id: preprintTitle.id }),
        })
      }).pipe(
        Effect.provide([
          Layer.mock(ContactEmailAddresses, { getContactEmailAddress: () => new ContactEmailAddressIsNotFound() }),
          Layer.succeed(Locale, locale),
          Layer.mock(Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
        ]),
      ),
  )

  it.effect.prop(
    'when there is no form',
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.string(), fc.user(), fc.supportedLocale()],
    ([preprintId, preprintTitle, method, user, locale]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<ContactEmailAddresses | Locale | Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewNeedToVerifyEmailAddress({ id: preprintId, locale, method, user })({
            formStore: new Keyv(),
            runtime,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
        })
      }).pipe(
        Effect.provide([
          Layer.mock(ContactEmailAddresses, {}),
          Layer.succeed(Locale, locale),
          Layer.mock(Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
        ]),
      ),
  )

  it.effect.prop(
    'when the preprint cannot be loaded',
    [fc.indeterminatePreprintId(), fc.string(), fc.user(), fc.supportedLocale()],
    ([preprintId, method, user, locale]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<ContactEmailAddresses | Locale | Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewNeedToVerifyEmailAddress({ id: preprintId, locale, method, user })({
            formStore: new Keyv(),
            runtime,
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
      }).pipe(
        Effect.provide([
          Layer.mock(ContactEmailAddresses, {}),
          Layer.succeed(Locale, locale),
          Layer.mock(Preprints, { getPreprintTitle: () => new PreprintIsUnavailable({}) }),
        ]),
      ),
  )

  it.effect.prop(
    'when the preprint cannot be found',
    [fc.indeterminatePreprintId(), fc.string(), fc.user(), fc.supportedLocale()],
    ([preprintId, method, user, locale]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<ContactEmailAddresses | Locale | Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewNeedToVerifyEmailAddress({ id: preprintId, locale, method, user })({
            formStore: new Keyv(),
            runtime,
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
      }).pipe(
        Effect.provide([
          Layer.mock(ContactEmailAddresses, {}),
          Layer.succeed(Locale, locale),
          Layer.mock(Preprints, { getPreprintTitle: () => new PreprintIsNotFound({}) }),
        ]),
      ),
  )

  it.effect.prop(
    "when there isn't a session",
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.string(), fc.supportedLocale()],
    ([preprintId, preprintTitle, method, locale]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<ContactEmailAddresses | Locale | Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewNeedToVerifyEmailAddress({ id: preprintId, locale, method, user: undefined })({
            formStore: new Keyv(),
            runtime,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
        })
      }).pipe(
        Effect.provide([
          Layer.mock(ContactEmailAddresses, {}),
          Layer.succeed(Locale, locale),
          Layer.mock(Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
        ]),
      ),
  )
})
