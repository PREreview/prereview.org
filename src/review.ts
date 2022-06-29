import { isDoi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as A from 'fp-ts/Array'
import * as O from 'fp-ts/Option'
import { Predicate, and } from 'fp-ts/Predicate'
import { flow, pipe } from 'fp-ts/function'
import { NotFound } from 'http-errors'
import { Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { Orcid } from 'orcid-id-ts'
import { get } from 'spectacles-ts'
import { match } from 'ts-pattern'
import { Record, getRecord } from 'zenodo-ts'
import { html, rawHtml, sendHtml } from './html'
import { handleError } from './http-error'
import { page } from './page'
import { preprintMatch } from './routes'

const DoiD = D.fromRefinement(isDoi, 'DOI')

const isInCommunity: Predicate<Record> = flow(
  O.fromNullableK(record => record.metadata.communities),
  O.chain(A.findFirst(community => community.id === 'prereview-reviews')),
  O.isSome,
)

const getReviewedDoi = flow(
  O.fromNullableK((record: Record) => record.metadata.related_identifiers),
  O.chain(
    A.findFirst(
      identifier =>
        identifier.relation === 'reviews' &&
        identifier.scheme === 'doi' &&
        identifier.resource_type === 'publication-preprint',
    ),
  ),
  O.chainEitherK(flow(get('identifier'), DoiD.decode)),
)

const sendPage = flow(
  createPage,
  M.of,
  M.ichainFirst(() => M.status(Status.OK)),
  M.ichain(sendHtml),
)

export const review = flow(
  RM.fromReaderTaskEitherK(getRecord),
  RM.filterOrElseW(pipe(isInCommunity, and(flow(getReviewedDoi, O.isSome))), () => new NotFound()),
  RM.ichainMiddlewareKW(sendPage),
  RM.orElseMiddlewareK(error =>
    match(error)
      .with({ status: Status.NotFound }, () => handleError(new NotFound()))
      .otherwise(() => showFailureMessage),
  ),
)

const showFailureMessage = pipe(
  M.status(Status.ServiceUnavailable),
  M.ichain(() => pipe(failureMessage(), sendHtml)),
)

function failureMessage() {
  return page({
    title: 'Sorry, we’re having problems',
    content: html`
      <main>
        <h1>Sorry, we’re having problems</h1>

        <p>We’re unable to show the PREreview now.</p>

        <p>Please try again later.</p>

        <a href="${format(preprintMatch.formatter, {})}" class="button">Back to preprint</a>
      </main>
    `,
  })
}

function createPage(review: Record) {
  return page({
    title:
      "Review of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii' by Jingfang Hao et al.",
    content: html`
      <nav>
        <a href="${format(preprintMatch.formatter, {})}" class="back">Back to preprint</a>
      </nav>

      <main>
        <header>
          <h1>Review of 'The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>'</h1>

          <ol aria-label="Authors of this review" class="author-list">
            ${review.metadata.creators.map(author => html` <li>${displayAuthor(author)}</li>`)}
          </ol>
        </header>

        ${rawHtml(review.metadata.description)}
      </main>
    `,
  })
}

function displayAuthor({ name, orcid }: { name: string; orcid?: Orcid }) {
  if (orcid) {
    return html`<a href="https://orcid.org/${orcid}">${name}</a>`
  }

  return name
}
