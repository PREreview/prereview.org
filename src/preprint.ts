import { format } from 'fp-ts-routing'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import textClipper from 'text-clipper'
import { Record, Records, getRecords } from 'zenodo-ts'
import { html, rawHtml, sendHtml } from './html'
import { page } from './page'
import { reviewMatch, writeReviewMatch } from './routes'

const sendPage = flow(
  (records: Records) => M.of(records),
  M.ichainFirst(() => M.status(Status.OK)),
  M.ichainW(flow(createPage, sendHtml)),
)

export const preprint = pipe(
  new URLSearchParams({
    communities: 'prereview-reviews',
    q: 'related.identifier:"10.1101/2022.01.13.476201"',
    size: '100',
  }),
  RM.fromReaderTaskEitherK(getRecords),
  RM.ichainMiddlewareKW(sendPage),
  RM.orElseMiddlewareK(() => showFailureMessage),
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

        <p>We’re unable to show the preprint and its reviews now.</p>

        <p>Please try again later.</p>
      </main>
    `,
  })
}

function createPage(reviews: Records) {
  return page({
    title: "Reviews of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii'",
    content: html`
      <h1 class="visually-hidden">
        Reviews of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii'
      </h1>

      <aside tabindex="0" aria-label="Preprint details">
        <article>
          <header>
            <h2>The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i></h2>

            <ol aria-label="Authors of this preprint" role="list" class="author-list">
              <li>Xin Liu</li>
              <li><a href="https://orcid.org/0000-0001-5124-3000">Wojciech Nawrocki</a></li>
              <li><a href="https://orcid.org/0000-0003-3469-834X">Roberta Croce</a></li>
            </ol>

            <dl>
              <div>
                <dt>Posted</dt>
                <dd><time datetime="2022-01-14">January 14, 2022</time></dd>
              </div>
              <div>
                <dt>Server</dt>
                <dd>bioRxiv</dd>
              </div>
              <div>
                <dt>DOI</dt>
                <dd class="doi">10.1101/2022.01.13.476201</dd>
              </div>
            </dl>
          </header>

          <h3 class="visually-hidden">Abstract</h3>

          <p>
            Non-photochemical quenching (NPQ) is the process that protects photosynthetic organisms from photodamage by
            dissipating the energy absorbed in excess as heat. In the model green alga
            <i>Chlamydomonas reinhardtii</i>, NPQ was abolished in the knock-out mutants of the pigment-protein
            complexes LHCSR3 and LHCBM1. However, while LHCSR3 was shown to be a pH sensor and switching to a quenched
            conformation at low pH, the role of LHCBM1 in NPQ has not been elucidated yet. In this work, we combine
            biochemical and physiological measurements to study short-term high light acclimation of <i>npq5</i>, the
            mutant lacking LHCBM1. We show that while in low light in the absence of this complex, the antenna size of
            PSII is smaller than in its presence, this effect is marginal in high light, implying that a reduction of
            the antenna is not responsible for the low NPQ. We also show that the mutant expresses LHCSR3 at the WT
            level in high light, indicating that the absence of this complex is also not the reason. Finally, NPQ
            remains low in the mutant even when the pH is artificially lowered to values that can switch LHCSR3 to the
            quenched conformation. It is concluded that both LHCSR3 and LHCBM1 need to be present for the induction of
            NPQ and that LHCBM1 is the interacting partner of LHCSR3. This interaction can either enhance the quenching
            capacity of LHCSR3 or connect this complex with the PSII supercomplex.
          </p>

          <a href="https://www.biorxiv.org/content/10.1101/2022.01.13.476201v1.full" class="button">
            Read the preprint
          </a>
        </article>
      </aside>

      <main>
        <h2>${reviews.hits.hits.length} PREreview${reviews.hits.hits.length !== 1 ? 's' : ''}</h2>

        <a href="${format(writeReviewMatch.formatter, {})}" class="button">Write a PREreview</a>

        <ol class="cards">
          ${reviews.hits.hits.map(showReview)}
        </ol>
      </main>
    `,
    type: 'two-up',
  })
}

function showReview(review: Record) {
  return html`
    <li>
      <article>
        <ol aria-label="Authors of this review" role="list" class="author-list">
          ${review.metadata.creators.map(author => html`<li>${author.name}</li>`)}
        </ol>

        ${rawHtml(textClipper(review.metadata.description, 300, { html: true, maxLines: 5 }))}

        <a href="${format(reviewMatch.formatter, { id: review.id })}" class="more">
          Read
          <span class="visually-hidden">
            the review by ${review.metadata.creators[0].name} ${review.metadata.creators.length > 1 ? 'et al.' : ''}
          </span>
        </a>
      </article>
    </li>
  `
}
