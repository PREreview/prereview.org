import { isDoi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import type { JsonRecord } from 'fp-ts/Json'
import * as R from 'fp-ts/Reader'
import type { Reader } from 'fp-ts/Reader'
import type { ReaderTaskEither } from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import { flow, identity, pipe } from 'fp-ts/function'
import { getAssignSemigroup } from 'fp-ts/struct'
import type { StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as C from 'io-ts/Codec'
import type Keyv from 'keyv'
import type { Orcid } from 'orcid-id-ts'
import { P, match } from 'ts-pattern'
import { canRapidReview } from '../feature-flags'
import { RawHtmlC } from '../html'
import { seeOther } from '../middleware'
import type { PreprintId } from '../preprint-id'
import {
  writeReviewAlreadyWrittenMatch,
  writeReviewAuthorsMatch,
  writeReviewCompetingInterestsMatch,
  writeReviewConductMatch,
  writeReviewPersonaMatch,
  writeReviewPublishMatch,
  writeReviewReviewMatch,
  writeReviewReviewTypeMatch,
} from '../routes'
import { NonEmptyStringC } from '../string'
import type { User } from '../user'

export type Form = C.TypeOf<typeof FormC>

export interface FormStoreEnv {
  formStore: Keyv<JsonRecord>
}

export function formKey(user: Orcid, preprint: PreprintId) {
  return match(preprint)
    .with({ type: 'philsci' }, preprint => `${user}_philsci_${preprint.value}`)
    .with({ value: P.when(isDoi) }, preprint => `${user}_${preprint.value}`)
    .exhaustive()
}

export function getForm(
  user: Orcid,
  preprint: PreprintId,
): ReaderTaskEither<FormStoreEnv, 'no-form' | 'form-unavailable', Form> {
  return flow(
    TE.tryCatchK(
      async ({ formStore }) => await formStore.get(formKey(user, preprint)),
      () => 'form-unavailable' as const,
    ),
    TE.chainEitherKW(
      flow(
        FormC.decode,
        E.mapLeft(() => 'no-form' as const),
      ),
    ),
  )
}

export function createForm(): Form {
  return {}
}

export function updateForm(originalForm: Form): (newForm: Form) => Form {
  return newForm => getAssignSemigroup<Form>().concat(originalForm, newForm)
}

export function saveForm(
  user: Orcid,
  preprint: PreprintId,
): (form: Form) => ReaderTaskEither<FormStoreEnv, 'form-unavailable', void> {
  return form =>
    TE.tryCatchK(
      async ({ formStore }) => {
        await formStore.set(formKey(user, preprint), FormC.encode(form))
      },
      () => 'form-unavailable',
    )
}

export function deleteForm(
  user: Orcid,
  preprint: PreprintId,
): ReaderTaskEither<FormStoreEnv, 'form-unavailable', void> {
  return TE.tryCatchK(
    async ({ formStore }) => {
      await formStore.delete(formKey(user, preprint))
    },
    () => 'form-unavailable',
  )
}

export const nextFormMatch = (form: Form, user: User) =>
  pipe(
    canRapidReview(user),
    R.map(canRapidReview =>
      match({ ...form, canRapidReview })
        .with(
          { alreadyWritten: P.optional(undefined), review: P.optional(undefined) },
          () => writeReviewAlreadyWrittenMatch,
        )
        .with(
          { canRapidReview: true, alreadyWritten: 'no', reviewType: P.optional(undefined) },
          () => writeReviewReviewTypeMatch,
        )
        .with({ review: P.optional(undefined) }, () => writeReviewReviewMatch)
        .with({ persona: P.optional(undefined) }, () => writeReviewPersonaMatch)
        .with({ moreAuthors: P.optional(undefined) }, () => writeReviewAuthorsMatch)
        .with({ competingInterests: P.optional(undefined) }, () => writeReviewCompetingInterestsMatch)
        .with({ conduct: P.optional(undefined) }, () => writeReviewConductMatch)
        .otherwise(() => writeReviewPublishMatch),
    ),
  )

export const redirectToNextForm = (preprint: PreprintId) =>
  flow(
    fromReaderK(nextFormMatch),
    RM.ichainMiddlewareK(flow(match => format(match.formatter, { id: preprint }), seeOther)),
  )

const FormC = pipe(
  C.partial({
    alreadyWritten: C.literal('yes', 'no'),
    introductionMatches: C.literal('yes', 'partly', 'no', 'skip'),
    review: RawHtmlC,
    reviewType: C.literal('questions', 'freeform'),
    persona: C.literal('public', 'pseudonym'),
    moreAuthors: C.literal('yes', 'yes-private', 'no'),
    moreAuthorsApproved: C.literal('yes'),
    competingInterests: C.literal('yes', 'no'),
    competingInterestsDetails: NonEmptyStringC,
    conduct: C.literal('yes'),
  }),
  C.imap(form => (form.review ? { reviewType: 'freeform' as const, ...form } : form), identity),
)

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}
