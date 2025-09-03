import { Data, Option } from 'effect'
import type { NonEmptyString } from '../../types/index.js'

export type IsMissingAnythingForm = EmptyForm | CompletedForm

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  isMissingAnything: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromAnswer: (
  answer: Option.Option<Option.Option<NonEmptyString.NonEmptyString>>,
) => IsMissingAnythingForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: answer => new CompletedForm({ isMissingAnything: answer }),
})
