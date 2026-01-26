import { LanguageModel } from '@effect/ai'
import { Array, Boolean, Data, Effect, Match, Option, pipe, Schema, Struct } from 'effect'
import type * as Preprints from '../../../Preprints/index.ts'
import * as PreprintServers from '../../../PreprintServers/index.ts'
import { renderDateString } from '../../../time.ts'

import { Doi, type NonEmptyString } from '../../../types/index.ts'

export interface PreprintReviewRequest {
  readonly author: Option.Option<NonEmptyString.NonEmptyString>
  readonly preprint: Preprints.Preprint
}

export type Thread = typeof ThreadSchema.Type

const ThreadSchema = Schema.Struct({
  main: Schema.NonEmptyString,
  detail: Schema.NonEmptyString,
  abstract: Schema.OptionFromNullOr(Schema.NonEmptyString),
  callToAction: Schema.NonEmptyString,
})

export class FailedToGenerateThreadForAPreprintReviewRequest extends Data.TaggedError(
  'FailedToGenerateThreadForAPreprintReviewRequest',
)<{
  cause?: unknown
}> {}

export const GenerateThread = Effect.fn(
  function* ({ author, preprint }: PreprintReviewRequest) {
    const hasAbstract = Option.isSome(Option.fromNullable(preprint.abstract))

    const response = yield* LanguageModel.generateObject({
      prompt: [
        {
          role: 'system',
          content: `
Write in friendly, simple, natural language.
Write in the active voice.
Write in US English (en-US).
You can include emojis.
Do not include hashtags.
Be positive, but ensure you don't discourage those who might feel marginalised or suffer from something like imposter syndrome from participating.
Don't use hyperbole.
Use objective vocabulary.
Don't repeat terms.
Use Markdown formatting.
Use 'PREreview' instead of 'review' or 'peer review'.
        `,
        },
        {
          role: 'user',
          content: `
Someone has requested a review of a scientific preprint. The requester is not reviewing the preprint themselves; they might be an author.

Write a series of posts to form a thread on Slack.

${Option.match(Option.fromNullable(preprint.abstract), {
  onSome: () => `
For the opening post, write a sentence of about 16 words using the most important keywords, disciplines and topics mentioned in the abstract, saying that the requester is looking for people to review the preprint. Highlight the terms in bold. Include a prompt to see more details by opening the thread and looking at the replies.
`,
  onNone: () => `
For the opening post, write a sentence of about 16 words using 1 or 2 important keywords, disciplines and topics mentioned in the title, saying that the requester is looking for people to review the preprint. Highlight the terms in bold. Include a prompt to see more details by opening the thread and looking at the replies.
`,
})}

In the first reply, thank the reader and provide them with details about the preprint.

${Option.match(Option.fromNullable(preprint.abstract), {
  onSome: () => `
In the second reply, prompt the user to read the abstract. We will append the abstract itself.
`,
  onNone: () => `
In the second reply, leave it null as the preprint does not have an abstract.
`,
})}

In the final reply, provide a call to action to write the review or to pass on the request. We will append a button to write the review.
        `,
        },
        {
          role: 'user',
          content: `
${Option.match(author, {
  onNone: () => 'Requester: Unknown',
  onSome: author => `Requester: """${author}"""`,
})}

Title: """${preprint.title.text.toString()}"""

${Array.match(preprint.authors, {
  onEmpty: () => '',
  onNonEmpty: authors => `Authors: """${formatList(Array.map(authors, Struct.get('name')))}"""`,
})}

Preprint server: """${PreprintServers.getName(preprint.id)}"""

${pipe(
  Match.value(preprint.id),
  Match.tag(
    'PhilsciPreprintId',
    id => `
URL: """https://philsci-archive.pitt.edu/${id.value}/"""
`,
  ),
  Match.orElse(
    id => `
DOI: """${Doi.toUrl(id.value).href}"""
`,
  ),
)}

Posted: """${renderDateString('en')(preprint.posted)}"""

${Option.match(Option.fromNullable(preprint.abstract), {
  onSome: abstract => `
Abstract: """
${abstract.text.toString()}
"""
  `,
  onNone: () => '',
})}
  `,
        },
        {
          role: 'user',
          content: `
Here are ${Array.length(examples)} examples from previous requests:

${pipe(
  Boolean.match(hasAbstract, {
    onTrue: () => examples,
    onFalse: () => Array.map(examples, Struct.evolve({ abstract: () => null })),
  }),
  Array.map(
    exampleThread => `
\`\`\`json
${JSON.stringify(exampleThread)}
\`\`\`
`,
  ),
  Array.join('\n'),
)}
    `,
        },
      ],
      schema: ThreadSchema,
    })

    return response.value
  },
  Effect.catchAll(error => new FailedToGenerateThreadForAPreprintReviewRequest({ cause: error })),
)

function formatList(list: ReadonlyArray<string>) {
  const formatter = new Intl.ListFormat('en')

  return formatter.format(list)
}

const examples: Array.NonEmptyReadonlyArray<Schema.Schema.Encoded<typeof ThreadSchema>> = [
  {
    main: '🏛️ Chris Wilkinson needs your help with reviews of a preprint all about **museum documentation**, **cultural heritage**, and museology practices. I’ll reply to this post with more details. 💬',
    detail:
      '🙌 Thanks for taking a look. The preprint is:\n\n**[Teaching of Museological Documentation: A Study at the Federal University of Pará](https://doi.org/10.1101/2024.03.15.585231)**\nby Jéssica Tarine Moitinho de Lima and Mariana Corrêa Velloso\n\n**Posted**\nMarch 6, 2024\n\n**Server**\nSciELO Preprints',
    abstract: 'Looks interesting? Have a look at the abstract: 🔍',
    callToAction:
      'Still with me? Great stuff. 👏\n\nPlease do help Chris Wilkinson with a PREreview, or pass this on to someone who could.',
  },
  {
    main: '🌿 Help Chris Wilkinson by writing a PREreview on the role of **LHCBM1** in **non-photochemical quenching** in **Chlamydomonas reinhardtii**. 🧵 Take a look in the thread for details.',
    detail:
      '👋 Thanks for dropping by! Here are the details of the preprint:\n\n**[The role of LHCBM1 in non-photochemical quenching in _Chlamydomonas reinhardtii_](https://doi.org/10.1101/2024.03.15.585231)**\nby Xin Liu, Wojciech Nawrocki, and Roberta Croce\n\n**Posted**\nJanuary 14, 2022\n\n**Server**\nbioRxiv',
    abstract: 'Want to dive deeper? 🤿 Check out the abstract:',
    callToAction:
      'Thanks for reading this far. 🌟\n\nPlease consider writing a PREreview for Chris or share this opportunity with others who might be interested.',
  },
  {
    main: 'Someone is looking for PREreviews of a paper on **distributed leadership patterns** in 🇨🇱 **Chilean technical professional education**. See in the replies for more.',
    detail:
      '👏 Thanks for checking this out! The preprint is **[Patrones de Liderazgo Distribuido en Centros Secundarios de Formación Profesional en Chile](https://doi.org/10.1590/scielopreprints.8341)** by Oscar Maureira Cabrera, Luis Ahumada-Figueroa, and Erick Vidal-Muñoz.\n\n**Posted**\nApril 1, 2024\n\n**Server**\nSciELO Preprints',
    abstract: 'Excited to learn more? Here’s the abstract:',
    callToAction:
      'Thanks for taking a look. 🚀\n\nPlease help by writing a PREreview or share this request with others who may be interested.',
  },
]
