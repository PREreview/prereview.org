import * as O from 'fp-ts/Option'
import { flow } from 'fp-ts/function'
import { type FieldId, isFieldId } from '../types/field'

export const fieldIdFromOpenAlexId: (value: URL) => O.Option<FieldId> = flow(
  O.fromNullableK(value => (/^https:\/\/openalex\.org\/fields\/(.+)$/.exec(value.href) ?? [])[1]),
  O.filter(isFieldId),
)
