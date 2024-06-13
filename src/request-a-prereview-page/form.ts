import * as Doi from 'doi-ts'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { getInput } from '../form.js'

export interface ValidForm {
  _tag: 'ValidForm'
  value: Doi.Doi | URL
}

export interface InvalidForm {
  _tag: 'InvalidForm'
  value: string
}

export type SubmittedForm = ValidForm | InvalidForm

export interface EmptyForm {
  _tag: 'EmptyForm'
}

export type Form = EmptyForm | SubmittedForm

export type IncompleteForm = InvalidForm | EmptyForm

export const ValidForm = (value: Doi.Doi | URL): ValidForm => ({
  _tag: 'ValidForm',
  value,
})

export const InvalidForm = (value: string): InvalidForm => ({
  _tag: 'InvalidForm',
  value,
})

export const EmptyForm: EmptyForm = {
  _tag: 'EmptyForm',
}

const UrlD = pipe(
  D.string,
  D.parse(s =>
    pipe(
      E.tryCatch(
        () => new URL(s.trim()),
        () => D.error(s, 'URL'),
      ),
      E.filterOrElse(
        url => url.protocol === 'http:' || url.protocol === 'https:',
        () => D.error(s, 'URL'),
      ),
    ),
  ),
)

const DoiD = pipe(
  D.string,
  D.parse(s => E.fromOption(() => D.error(s, 'DOI'))(Doi.parse(s))),
)

const WhichPreprintD = pipe(
  D.struct({
    preprint: D.union(DoiD, UrlD),
  }),
  D.map(form => form.preprint),
)

export const fromBody: (body: unknown) => E.Either<InvalidForm, ValidForm> = flow(
  WhichPreprintD.decode,
  E.bimap(
    flow(
      getInput('preprint'),
      O.match(() => InvalidForm(''), InvalidForm),
    ),
    ValidForm,
  ),
)
