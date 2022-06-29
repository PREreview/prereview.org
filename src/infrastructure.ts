import { Doi } from 'doi-ts'
import { ReaderTaskEither } from 'fp-ts/ReaderTaskEither'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RR from 'fp-ts/ReadonlyRecord'
import * as TE from 'fp-ts/TaskEither'
import { constant, pipe } from 'fp-ts/function'
import markdownIt from 'markdown-it'
import {
  DepositMetadata,
  SubmittedDeposition,
  ZenodoAuthenticatedEnv,
  createDeposition,
  publishDeposition,
  uploadFile,
} from 'zenodo-ts'
import { html, sanitizeHtml } from './html'
import { NewPrereview } from './write-review'

export const getPreprintTitle = TE.fromOptionK(constant('not-found'))((doi: Doi) => RR.lookup(doi, preprintTitles))

export const createRecordOnZenodo: (
  newPrereview: NewPrereview,
) => ReaderTaskEither<ZenodoAuthenticatedEnv, unknown, SubmittedDeposition> = newPrereview =>
  pipe(
    createDepositMetadata(newPrereview),
    createDeposition,
    RTE.chainFirst(
      uploadFile({
        name: 'review.html',
        type: 'text/html',
        content: sanitizeHtml(markdownIt({ html: true }).render(newPrereview.review)).toString(),
      }),
    ),
    RTE.chain(publishDeposition),
  )

function createDepositMetadata(newPrereview: NewPrereview): DepositMetadata {
  return {
    upload_type: 'publication',
    publication_type: 'article',
    title: 'Review of “The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii”',
    creators: [newPrereview.persona === 'public' ? newPrereview.user : { name: 'PREreviewer' }],
    description: sanitizeHtml(markdownIt({ html: true }).render(newPrereview.review)).toString(),
    communities: [{ identifier: 'prereview-reviews' }],
    related_identifiers: [
      {
        scheme: 'doi',
        identifier: '10.1101/2022.01.13.476201',
        relation: 'reviews',
        resource_type: 'publication-preprint',
      },
    ],
  }
}

const preprintTitles = {
  '10.1101/2022.01.13.476201': html`The role of LHCBM1 in non-photochemical quenching in
    <i>Chlamydomonas reinhardtii</i>`,
}
