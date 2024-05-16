import type { Doi } from 'doi-ts'
import * as TE from 'fp-ts/TaskEither'
import { match } from 'ts-pattern'
import type { FieldId } from '../types/field'

export const getFieldsFromOpenAlex = (doi: Doi) =>
  TE.right(
    match(doi.toLowerCase())
      .returnType<ReadonlyArray<FieldId>>()
      .with('10.1101/2023.06.12.544578', () => ['13', '24'])
      .with('10.1101/2024.04.19.590338', () => ['13', '24'])
      .with('10.1101/2024.05.02.592279', () => ['27'])
      .with('10.1101/2024.05.05.592045', () => ['13'])
      .with('10.1101/2024.05.06.592752', () => ['27', '28'])
      .with('10.1101/2024.05.11.592705', () => ['22', '21'])
      .with('10.1590/scielopreprints.5909', () => ['12'])
      .with('10.1590/scielopreprints.7901', () => ['12'])
      .with('10.1590/scielopreprints.8479', () => ['36', '33'])
      .with('10.1590/scielopreprints.8828', () => ['12'])
      .otherwise(() => []),
  )
