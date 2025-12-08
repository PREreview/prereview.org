import { Array, Effect, Option, pipe, Schema, Struct } from 'effect'
import { plainText } from '../../../html.ts'
import type * as Preprints from '../../../Preprints/index.ts'
import * as PreprintServers from '../../../PreprintServers/index.ts'
import { renderDateString } from '../../../time.ts'
import type { NonEmptyString } from '../../../types/index.ts'

export interface PreprintReviewRequest {
  readonly author: NonEmptyString.NonEmptyString
  readonly preprint: Preprints.Preprint
}

export type Thread = typeof ThreadSchema.Type

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ThreadSchema = Schema.Struct({
  main: Schema.NonEmptyString,
  detail: Schema.NonEmptyString,
  abstract: Schema.OptionFromNullOr(Schema.NonEmptyString),
  callToAction: Schema.NonEmptyString,
})

export const GenerateThread = ({ author, preprint }: PreprintReviewRequest) =>
  Effect.succeed({
    main: `${author} is looking for reviews of a preprint.`,
    detail: `The preprint is:\n\n**[${plainText(preprint.title.text).toString()}](${preprint.url.href})**\nby ${pipe(preprint.authors, Array.map(Struct.get('name')), formatList)}\n\n**Posted**\n${renderDateString('en')(preprint.posted)}\n\n**Server**\n${PreprintServers.getName(preprint.id)}`,
    abstract: Option.map(Option.fromNullable(preprint.abstract), () => 'Have a look at the abstract:'),
    callToAction: `Please do help ${author} with a PREreview, or pass this on to someone who could.`,
  } satisfies Thread)

function formatList(list: ReadonlyArray<string>) {
  const formatter = new Intl.ListFormat('en')

  return formatter.format(list)
}
