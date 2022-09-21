import { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import { JsonRecord } from 'fp-ts/Json'
import { ReaderTask } from 'fp-ts/ReaderTask'
import * as T from 'fp-ts/Task'
import * as TE from 'fp-ts/TaskEither'
import { constVoid, constant, flow } from 'fp-ts/function'
import { getAssignSemigroup } from 'fp-ts/struct'
import * as C from 'io-ts/Codec'
import Keyv from 'keyv'
import { Orcid } from 'orcid-id-ts'
import { P, match } from 'ts-pattern'
import { seeOther } from '../middleware'
import { PreprintId } from '../preprint-id'
import {
  writeReviewAuthorsMatch,
  writeReviewCompetingInterestsMatch,
  writeReviewConductMatch,
  writeReviewPersonaMatch,
  writeReviewPostMatch,
  writeReviewReviewMatch,
} from '../routes'
import { NonEmptyStringC } from '../string'

export type Form = C.TypeOf<typeof FormC>

export interface FormStoreEnv {
  formStore: Keyv<JsonRecord>
}

export function getForm(user: Orcid, preprint: Doi): ReaderTask<FormStoreEnv, Form> {
  return flow(
    TE.tryCatchK(async ({ formStore }) => await formStore.get(`${user}_${preprint}`), constant('no-new-review')),
    TE.chainEitherKW(FormC.decode),
    TE.getOrElse(() => T.of({})),
  )
}

export function updateForm(originalForm: Form): (newForm: Form) => Form {
  return newForm => getAssignSemigroup<Form>().concat(originalForm, newForm)
}

export function saveForm(user: Orcid, preprint: Doi): (form: Form) => ReaderTask<FormStoreEnv, void> {
  return form =>
    flow(
      TE.tryCatchK(async ({ formStore }) => {
        await formStore.set(`${user}_${preprint}`, FormC.encode(form))
      }, constVoid),
      TE.toUnion,
    )
}

export function deleteForm(user: Orcid, preprint: Doi): ReaderTask<FormStoreEnv, void> {
  return flow(
    TE.tryCatchK(async ({ formStore }) => {
      await formStore.delete(`${user}_${preprint}`)
    }, constVoid),
    TE.toUnion,
  )
}

export const showNextForm = (preprint: PreprintId['doi']) => (form: Form) =>
  match(form)
    .with(
      { review: P.string, persona: P.string, moreAuthors: P.string, competingInterests: P.string, conduct: P.string },
      () => seeOther(format(writeReviewPostMatch.formatter, { doi: preprint })),
    )
    .with({ review: P.string, persona: P.string, moreAuthors: P.string, competingInterests: P.string }, () =>
      seeOther(format(writeReviewConductMatch.formatter, { doi: preprint })),
    )
    .with({ review: P.string, persona: P.string, moreAuthors: P.string }, () =>
      seeOther(format(writeReviewCompetingInterestsMatch.formatter, { doi: preprint })),
    )
    .with({ review: P.string, persona: P.string }, () =>
      seeOther(format(writeReviewAuthorsMatch.formatter, { doi: preprint })),
    )
    .with({ review: P.string }, () => seeOther(format(writeReviewPersonaMatch.formatter, { doi: preprint })))
    .otherwise(() => seeOther(format(writeReviewReviewMatch.formatter, { doi: preprint })))

const FormC = C.partial({
  review: NonEmptyStringC,
  persona: C.literal('public', 'pseudonym'),
  moreAuthors: C.literal('yes', 'no'),
  competingInterests: C.literal('yes', 'no'),
  competingInterestsDetails: NonEmptyStringC,
  conduct: C.literal('yes'),
})
