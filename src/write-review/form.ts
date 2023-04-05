import { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { JsonRecord } from 'fp-ts/Json'
import { ReaderTaskEither } from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import { flow } from 'fp-ts/function'
import { getAssignSemigroup } from 'fp-ts/struct'
import * as C from 'io-ts/Codec'
import Keyv from 'keyv'
import { Orcid } from 'orcid-id-ts'
import { P, match } from 'ts-pattern'
import { RawHtmlC } from '../html'
import { seeOther } from '../middleware'
import { PreprintId } from '../preprint-id'
import {
  writeReviewAlreadyWrittenMatch,
  writeReviewAuthorsMatch,
  writeReviewCompetingInterestsMatch,
  writeReviewConductMatch,
  writeReviewPersonaMatch,
  writeReviewPublishMatch,
  writeReviewReviewMatch,
} from '../routes'
import { NonEmptyStringC } from '../string'

export type Form = C.TypeOf<typeof FormC>

export interface FormStoreEnv {
  formStore: Keyv<JsonRecord>
}

export function getForm(
  user: Orcid,
  preprint: Doi,
): ReaderTaskEither<FormStoreEnv, 'no-form' | 'form-unavailable', Form> {
  return flow(
    TE.tryCatchK(
      async ({ formStore }) => await formStore.get(`${user}_${preprint}`),
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
  preprint: Doi,
): (form: Form) => ReaderTaskEither<FormStoreEnv, 'form-unavailable', void> {
  return form =>
    TE.tryCatchK(
      async ({ formStore }) => {
        await formStore.set(`${user}_${preprint}`, FormC.encode(form))
      },
      () => 'form-unavailable',
    )
}

export function deleteForm(user: Orcid, preprint: Doi): ReaderTaskEither<FormStoreEnv, 'form-unavailable', void> {
  return TE.tryCatchK(
    async ({ formStore }) => {
      await formStore.delete(`${user}_${preprint}`)
    },
    () => 'form-unavailable',
  )
}

export const nextFormMatch = (form: Form) =>
  match(form)
    .with(
      { alreadyWritten: P.optional(P.nullish), review: P.optional(P.nullish) },
      () => writeReviewAlreadyWrittenMatch,
    )
    .with({ review: P.optional(P.nullish) }, () => writeReviewReviewMatch)
    .with({ persona: P.optional(P.nullish) }, () => writeReviewPersonaMatch)
    .with({ moreAuthors: P.optional(P.nullish) }, () => writeReviewAuthorsMatch)
    .with({ competingInterests: P.optional(P.nullish) }, () => writeReviewCompetingInterestsMatch)
    .with({ conduct: P.optional(P.nullish) }, () => writeReviewConductMatch)
    .otherwise(() => writeReviewPublishMatch)

export const redirectToNextForm = (preprint: PreprintId['doi']) =>
  flow(nextFormMatch, match => format(match.formatter, { doi: preprint }), seeOther)

const FormC = C.partial({
  alreadyWritten: C.literal('yes', 'no'),
  review: RawHtmlC,
  persona: C.literal('public', 'pseudonym'),
  moreAuthors: C.literal('yes', 'yes-private', 'no'),
  moreAuthorsApproved: C.literal('yes'),
  competingInterests: C.literal('yes', 'no'),
  competingInterestsDetails: NonEmptyStringC,
  competingInterestsMonolithic: C.sum('hasCompetingInterests')({
    yes: C.struct({ hasCompetingInterests: C.literal('yes'), details: NonEmptyStringC }),
    no: C.struct({ hasCompetingInterests: C.literal('no') }),
  }),
  conduct: C.literal('yes'),
})
