import { pipe } from 'effect'
import { HttpClientRequest } from 'effect/http'

export const CreateRequest = (eprintId: number) =>
  pipe(
    HttpClientRequest.get(
      `https://philsci-archive.pitt.edu/cgi/export/eprint/${eprintId}/JSON/pittphilsci-eprint-${eprintId}.json`,
    ),
    HttpClientRequest.acceptJson,
  )
