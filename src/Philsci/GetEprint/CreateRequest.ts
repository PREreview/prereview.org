import { HttpClientRequest } from '@effect/platform'
import { pipe } from 'effect'

export const CreateRequest = (eprintId: number) =>
  pipe(
    HttpClientRequest.get(
      `https://philsci-archive.pitt.edu/cgi/export/eprint/${eprintId}/JSON/pittphilsci-eprint-${eprintId}.json`,
    ),
    HttpClientRequest.acceptJson,
  )
