import type { Doi } from 'doi-ts'
import * as TE from 'fp-ts/TaskEither'
import { match } from 'ts-pattern'
import type { FieldId } from '../types/field'

export const getFieldsFromOpenAlex = (doi: Doi) =>
  TE.right(
    match(doi.toLowerCase())
      .returnType<ReadonlyArray<FieldId>>()
      .with('10.1101/2023.06.12.544578', () => ['13', '24'])
      .otherwise(() => []),
  )
