import { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import { JsonRecord } from 'fp-ts/Json'
import { ReaderTask } from 'fp-ts/ReaderTask'
import * as T from 'fp-ts/Task'
import * as TE from 'fp-ts/TaskEither'
import { constVoid, constant, flow, pipe } from 'fp-ts/function'
import { getAssignSemigroup } from 'fp-ts/struct'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import Keyv from 'keyv'
import { Orcid, isOrcid } from 'orcid-id-ts'
import { P, match } from 'ts-pattern'
import { seeOther } from '../middleware'
import { PreprintId } from '../preprint-id'
import {
  writeReviewAddAuthorsMatch,
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
    .with({ review: P.optional(P.nullish) }, () =>
      seeOther(format(writeReviewReviewMatch.formatter, { doi: preprint })),
    )
    .with({ persona: P.optional(P.nullish) }, () =>
      seeOther(format(writeReviewPersonaMatch.formatter, { doi: preprint })),
    )
    .with({ moreAuthors: P.optional(P.nullish) }, () =>
      seeOther(format(writeReviewAuthorsMatch.formatter, { doi: preprint })),
    )
    .with({ moreAuthors: 'yes', otherAuthors: P.optional(P.nullish) }, () =>
      seeOther(format(writeReviewAddAuthorsMatch.formatter, { doi: preprint })),
    )
    .with({ competingInterests: P.optional(P.nullish) }, () =>
      seeOther(format(writeReviewCompetingInterestsMatch.formatter, { doi: preprint })),
    )
    .with({ conduct: P.optional(P.nullish) }, () =>
      seeOther(format(writeReviewConductMatch.formatter, { doi: preprint })),
    )
    .otherwise(() => seeOther(format(writeReviewPostMatch.formatter, { doi: preprint })))

const OrcidC = C.fromDecoder(D.fromRefinement(isOrcid, 'ORCID'))

const FormC = C.partial({
  alreadyWritten: C.literal('yes', 'no'),
  review: NonEmptyStringC,
  persona: C.literal('public', 'pseudonym'),
  moreAuthors: C.literal('yes', 'no'),
  otherAuthors: pipe(
    C.array(pipe(C.struct({ name: NonEmptyStringC }), C.intersect(C.partial({ orcid: OrcidC })))),
    C.readonly,
  ),
  competingInterests: C.literal('yes', 'no'),
  competingInterestsDetails: NonEmptyStringC,
  conduct: C.literal('yes'),
})
