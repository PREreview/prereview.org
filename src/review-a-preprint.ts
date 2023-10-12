import { type Doi, isDoi, parse } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { flow, identity, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { P, match } from 'ts-pattern'
import { type InvalidE, getInput, invalidE } from './form'
import { html, plainText, rawHtml, sendHtml } from './html'
import { getMethod, seeOther } from './middleware'
import { page } from './page'
import { doesPreprintExist } from './preprint'
import { homeMatch, reviewAPreprintMatch, writeReviewMatch } from './routes'
import { type IndeterminatePreprintId, type PhilsciPreprintId, fromUrl, parsePreprintDoi } from './types/preprint-id'
import { type User, maybeGetUser } from './user'

export const reviewAPreprint = pipe(
  RM.fromMiddleware(getMethod),
  RM.ichain(method =>
    match(method)
      .with('POST', () => whichPreprint)
      .otherwise(() => showReviewAPreprintPage),
  ),
)

const showReviewAPreprintPage = pipe(
  maybeGetUser,
  RM.chainReaderKW(user => createPage(E.right(undefined), user)),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showReviewAPreprintErrorPage = flow(
  RM.fromReaderK(createPage),
  RM.ichainFirst(() => RM.status(Status.BadRequest)),
  RM.ichainMiddlewareK(sendHtml),
)

const showUnknownPreprintPage = flow(
  RM.fromReaderK(createUnknownPreprintPage),
  RM.ichainFirst(() => RM.status(Status.BadRequest)),
  RM.ichainFirst(() => RM.header('Cache-Control', 'no-store, must-revalidate')),
  RM.ichainMiddlewareK(sendHtml),
)

const showUnsupportedDoiPage = flow(
  RM.fromReaderK(createUnsupportedDoiPage),
  RM.ichainFirst(() => RM.status(Status.BadRequest)),
  RM.ichainFirst(() => RM.header('Cache-Control', 'no-store, must-revalidate')),
  RM.ichainMiddlewareK(sendHtml),
)

const showUnsupportedUrlPage = flow(
  RM.fromReaderK(createUnsupportedUrlPage),
  RM.ichainFirst(() => RM.status(Status.BadRequest)),
  RM.ichainFirst(() => RM.header('Cache-Control', 'no-store, must-revalidate')),
  RM.ichainMiddlewareK(sendHtml),
)

const showNotAPreprintPage = flow(
  RM.fromReaderK(createNotAPreprintPage),
  RM.ichainFirst(() => RM.status(Status.BadRequest)),
  RM.ichainMiddlewareK(sendHtml),
)

const showFailureMessage = flow(
  RM.fromReaderK(failureMessage),
  RM.ichainFirst(() => RM.status(Status.ServiceUnavailable)),
  RM.ichainMiddlewareK(sendHtml),
)

const UrlD = pipe(
  D.string,
  D.parse(s =>
    pipe(
      E.tryCatch(
        () => new URL(s.trim()),
        () => D.error(s, 'URL'),
      ),
      E.filterOrElse(
        url => url.protocol === 'http:' || url.protocol === 'https:',
        () => D.error(s, 'URL'),
      ),
    ),
  ),
)

const DoiD = pipe(
  D.string,
  D.parse(s => E.fromOption(() => D.error(s, 'DOI'))(parsePreprintDoi(s))),
)

const PreprintUrlD = pipe(
  UrlD,
  D.parse(url => E.fromOption(() => D.error(url, 'PreprintUrl'))(fromUrl(url))),
)

const WhichPreprintD = pipe(
  D.struct({
    preprint: D.union(DoiD, PreprintUrlD),
  }),
  D.map(form => form.preprint),
)

const parseWhichPreprint = flow(
  WhichPreprintD.decode,
  E.mapLeft(
    flow(
      getInput('preprint'),
      O.chain(input =>
        pipe(
          parse(input),
          O.map(unsupportedDoiE),
          O.altW(() => pipe(O.fromEither(UrlD.decode(input)), O.map(unsupportedUrlE))),
          O.altW(() => O.some(invalidE(input))),
        ),
      ),
      O.getOrElseW(() => invalidE('')),
    ),
  ),
)

const whichPreprint = pipe(
  RM.decodeBody(parseWhichPreprint),
  RM.chainFirstW(preprint =>
    pipe(
      RM.fromReaderTaskEither(doesPreprintExist(preprint)),
      RM.chainEitherKW(E.fromPredicate(identity, () => unknownPreprintE(preprint))),
    ),
  ),
  RM.ichainMiddlewareK(preprint => seeOther(format(writeReviewMatch.formatter, { id: preprint }))),
  RM.orElseW(error =>
    pipe(
      maybeGetUser,
      RM.ichainW(user =>
        match(error)
          .with({ _tag: 'UnknownPreprintE', actual: P.select() }, preprint => showUnknownPreprintPage(preprint, user))
          .with({ _tag: 'UnsupportedDoiE' }, () => showUnsupportedDoiPage(user))
          .with({ _tag: 'UnsupportedUrlE' }, () => showUnsupportedUrlPage(user))
          .with('not-a-preprint', () => showNotAPreprintPage(user))
          .with('unavailable', () => showFailureMessage(user))
          .otherwise(flow(E.left, form => showReviewAPreprintErrorPage(form, user))),
      ),
    ),
  ),
)

interface UnknownPreprintE {
  readonly _tag: 'UnknownPreprintE'
  readonly actual: IndeterminatePreprintId
}

interface UnsupportedDoiE {
  readonly _tag: 'UnsupportedDoiE'
  readonly actual: Doi
}

interface UnsupportedUrlE {
  readonly _tag: 'UnsupportedUrlE'
  readonly actual: URL
}

const unknownPreprintE = (actual: IndeterminatePreprintId): UnknownPreprintE => ({
  _tag: 'UnknownPreprintE',
  actual,
})

const unsupportedDoiE = (actual: Doi): UnsupportedDoiE => ({
  _tag: 'UnsupportedDoiE',
  actual,
})

const unsupportedUrlE = (actual: URL): UnsupportedUrlE => ({
  _tag: 'UnsupportedUrlE',
  actual,
})

type SubmittedWhichPreprint = E.Either<InvalidE, Doi>
type UnsubmittedWhichPreprint = E.Right<undefined>
type WhichPreprint = SubmittedWhichPreprint | UnsubmittedWhichPreprint

function createPage(whichPreprint: WhichPreprint, user?: User) {
  const error = E.isLeft(whichPreprint)

  return page({
    title: plainText`${error ? 'Error: ' : ''}Which preprint are you reviewing?`,
    content: html`
      <nav>
        <a href="${format(homeMatch.formatter, {})}" class="back">Back</a>
      </nav>

      <main id="form">
        <form method="post" action="${format(reviewAPreprintMatch.formatter, {})}" novalidate>
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    ${E.isLeft(whichPreprint)
                      ? html`
                          <li>
                            <a href="#preprint">
                              ${match(whichPreprint.left)
                                .with({ _tag: 'InvalidE' }, () => 'Enter the preprint DOI or URL')
                                .exhaustive()}
                            </a>
                          </li>
                        `
                      : ''}
                  </ul>
                </error-summary>
              `
            : ''}

          <div ${rawHtml(E.isLeft(whichPreprint) ? 'class="error"' : '')}>
            <h1><label id="preprint-label" for="preprint">Which preprint are you reviewing?</label></h1>

            <p id="preprint-tip" role="note">Use the preprint DOI or URL.</p>

            <details>
              <summary><span>What is a DOI?</span></summary>

              <div>
                <p>
                  A <a href="https://www.doi.org/"><dfn>DOI</dfn></a> is a unique identifier that you can find on many
                  preprints. For example, <q class="select-all" translate="no">10.1101/2022.10.06.511170</q> or
                  <q class="select-all" translate="no">https://doi.org/10.1101/2022.10.06.511170</q>.
                </p>
              </div>
            </details>

            ${error
              ? html`
                  <div class="error-message" id="preprint-error">
                    <span class="visually-hidden">Error:</span>
                    ${match(whichPreprint.left)
                      .with({ _tag: 'InvalidE' }, () => 'Enter the preprint DOI or URL')
                      .exhaustive()}
                  </div>
                `
              : ''}

            <input
              id="preprint"
              name="preprint"
              type="text"
              size="60"
              spellcheck="false"
              aria-describedby="preprint-tip"
              ${match(whichPreprint)
                .with({ right: P.select(P.string) }, value => html`value="${value}"`)
                .with({ left: { actual: P.select() } }, value => html`value="${value}"`)
                .otherwise(() => '')}
              ${rawHtml(E.isLeft(whichPreprint) ? 'aria-invalid="true" aria-errormessage="preprint-error"' : '')}
            />
          </div>

          <button>Continue</button>
        </form>
      </main>
    `,
    js: error ? ['error-summary.js'] : [],
    skipLinks: [[html`Skip to form`, '#form']],
    user,
  })
}

function createUnknownPreprintPage(preprint: IndeterminatePreprintId, user?: User) {
  return match(preprint)
    .with({ type: 'philsci' }, preprint => createUnknownPhilsciPreprintPage(preprint, user))
    .with({ value: P.when(isDoi) }, preprint => createUnknownPreprintWithDoiPage(preprint, user))
    .exhaustive()
}

function createUnknownPreprintWithDoiPage(preprint: Extract<IndeterminatePreprintId, { value: Doi }>, user?: User) {
  return page({
    title: plainText`Sorry, we don’t know this preprint`,
    content: html`
      <main id="main-content">
        <h1>Sorry, we don’t know this preprint</h1>

        <p>
          We think the DOI <q class="select-all" translate="no">${preprint.value}</q> could be
          ${match(preprint.type)
            .with('africarxiv', () => 'an AfricArXiv')
            .with('arxiv', () => 'an arXiv')
            .with('authorea', () => 'an Authorea')
            .with('biorxiv', () => 'a bioRxiv')
            .with('biorxiv-medrxiv', () => 'a bioRxiv or medRxiv')
            .with('chemrxiv', () => 'a ChemRxiv')
            .with('eartharxiv', () => 'an EarthArXiv')
            .with('ecoevorxiv', () => 'an EcoEvoRxiv')
            .with('edarxiv', () => 'an EdArXiv')
            .with('engrxiv', () => 'an engrXiv')
            .with('medrxiv', () => 'a medRxiv')
            .with('metaarxiv', () => 'a MetaArXiv')
            .with('osf', () => 'an OSF')
            .with('preprints.org', () => 'a Preprints.org')
            .with('psyarxiv', () => 'a PsyArXiv')
            .with('research-square', () => 'a Research Square')
            .with('scielo', () => 'a SciELO')
            .with('science-open', () => 'a ScienceOpen')
            .with('socarxiv', () => 'a SocArXiv')
            .with('zenodo', () => 'a Zenodo')
            .with('zenodo-africarxiv', () => 'a Zenodo or AfricArXiv')
            .exhaustive()}
          preprint, but we can’t find any details.
        </p>

        <p>If you typed the DOI, check it is correct.</p>

        <p>If you pasted the DOI, check you copied the entire address.</p>

        <p>If the DOI is correct, please <a href="mailto:help@prereview.org">get in touch</a>.</p>

        <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button">Back</a>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
}

function createUnknownPhilsciPreprintPage(preprint: PhilsciPreprintId, user?: User) {
  return page({
    title: plainText`Sorry, we don’t know this preprint`,
    content: html`
      <main id="main-content">
        <h1>Sorry, we don’t know this preprint</h1>

        <p>
          We think the URL
          <q class="select-all" translate="no">https://philsci-archive.pitt.edu/${preprint.value}/</q> could be a
          PhilSci-Archive preprint, but we can’t find any details.
        </p>

        <p>If you typed the URL, check it is correct.</p>

        <p>If you pasted the URL, check you copied the entire address.</p>

        <p>If the URL is correct, please <a href="mailto:help@prereview.org">get in touch</a>.</p>

        <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button">Back</a>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
}

function createUnsupportedDoiPage(user?: User) {
  return page({
    title: plainText`Sorry, we don’t support this DOI`,
    content: html`
      <main id="main-content">
        <h1>Sorry, we don’t support this DOI</h1>

        <p>
          We support preprints from AfricArXiv, arXiv, Authorea, bioRxiv, ChemRxiv, EarthArXiv, EcoEvoRxiv, EdArXiv,
          engrXiv, medRxiv, MetaArXiv, OSF, PhilSci-Archive, Preprints.org, PsyArXiv, Research&nbsp;Square, SciELO,
          ScienceOpen, SocArXiv and Zenodo.
        </p>

        <p>
          If this DOI is for a preprint on a server we don’t support, please
          <a href="mailto:help@prereview.org">get in touch</a>.
        </p>

        <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button">Back</a>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
}

function createUnsupportedUrlPage(user?: User) {
  return page({
    title: plainText`Sorry, we don’t support this URL`,
    content: html`
      <main id="main-content">
        <h1>Sorry, we don’t support this URL</h1>

        <p>
          We support preprints from AfricArXiv, arXiv, Authorea, bioRxiv, ChemRxiv, EarthArXiv, EcoEvoRxiv, EdArXiv,
          engrXiv, medRxiv, MetaArXiv, OSF, PhilSci-Archive, Preprints.org, PsyArXiv, Research&nbsp;Square, SciELO,
          ScienceOpen, SocArXiv and Zenodo.
        </p>

        <p>
          If this URL is for a preprint on a server we don’t support, please
          <a href="mailto:help@prereview.org">get in touch</a>.
        </p>

        <p>Otherwise, if the preprint has a DOI, please try using that instead.</p>

        <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button">Back</a>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
}

function createNotAPreprintPage(user?: User) {
  return page({
    title: plainText`Sorry, we only support preprints`,
    content: html`
      <main id="main-content">
        <h1>Sorry, we only support preprints</h1>

        <p>
          We support preprints from AfricArXiv, arXiv, Authorea, bioRxiv, ChemRxiv, EarthArXiv, EcoEvoRxiv, EdArXiv,
          engrXiv, medRxiv, MetaArXiv, OSF, PhilSci-Archive, Preprints.org, PsyArXiv, Research&nbsp;Square, SciELO,
          ScienceOpen, SocArXiv and Zenodo.
        </p>

        <p>If this is a preprint, please <a href="mailto:help@prereview.org">get in touch</a>.</p>

        <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button">Back</a>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
}

function failureMessage(user?: User) {
  return page({
    title: plainText`Sorry, we’re having problems`,
    content: html`
      <main id="main-content">
        <h1>Sorry, we’re having problems</h1>

        <p>We’re unable to publish PREreviews for this preprint now.</p>

        <p>Please try again later.</p>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
}
