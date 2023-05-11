import { type Doi, isDoi, parse } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import type { Reader } from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { flow, identity, pipe } from 'fp-ts/function'
import { Status, type StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { P, match } from 'ts-pattern'
import { type InvalidE, getInput, invalidE } from './form'
import { html, plainText, rawHtml, sendHtml } from './html'
import { getMethod, seeOther } from './middleware'
import { page } from './page'
import { type IndeterminatePreprintId, type PhilsciPreprintId, fromUrl, parsePreprintDoi } from './preprint-id'
import { findAPreprintMatch, preprintReviewsMatch } from './routes'
import { type User, getUser } from './user'

export interface DoesPreprintExistEnv {
  doesPreprintExist: (id: IndeterminatePreprintId) => TE.TaskEither<'unavailable', boolean>
}

export const findAPreprint = pipe(
  RM.fromMiddleware(getMethod),
  RM.ichain(method =>
    match(method)
      .with('POST', () => lookupPreprint)
      .otherwise(() => showFindAPreprintPage),
  ),
)

const doesPreprintExist = (id: IndeterminatePreprintId) =>
  pipe(
    RTE.ask<DoesPreprintExistEnv>(),
    RTE.chainTaskEitherK(({ doesPreprintExist }) => doesPreprintExist(id)),
  )

const showFindAPreprintPage = pipe(
  getUser,
  RM.orElseW(() => RM.of(undefined)),
  chainReaderKW(user => createPage(E.right(undefined), user)),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showFindAPreprintErrorPage = flow(
  fromReaderK(createPage),
  RM.ichainFirst(() => RM.status(Status.BadRequest)),
  RM.ichainMiddlewareK(sendHtml),
)

const showUnknownPreprintPage = flow(
  fromReaderK(createUnknownPreprintPage),
  RM.ichainFirst(() => RM.status(Status.BadRequest)),
  RM.ichainFirst(() => RM.header('Cache-Control', 'no-store, must-revalidate')),
  RM.ichainMiddlewareK(sendHtml),
)

const showUnsupportedDoiPage = flow(
  fromReaderK(createUnsupportedDoiPage),
  RM.ichainFirst(() => RM.status(Status.BadRequest)),
  RM.ichainFirst(() => RM.header('Cache-Control', 'no-store, must-revalidate')),
  RM.ichainMiddlewareK(sendHtml),
)

const showUnsupportedUrlPage = flow(
  fromReaderK(createUnsupportedUrlPage),
  RM.ichainFirst(() => RM.status(Status.BadRequest)),
  RM.ichainFirst(() => RM.header('Cache-Control', 'no-store, must-revalidate')),
  RM.ichainMiddlewareK(sendHtml),
)

const showFailureMessage = flow(
  fromReaderK(failureMessage),
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

const LookupPreprintD = pipe(
  D.struct({
    preprint: D.union(DoiD, PreprintUrlD),
  }),
  D.map(form => form.preprint),
)

export const parseLookupPreprint = flow(
  LookupPreprintD.decode,
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

const lookupPreprint = pipe(
  RM.decodeBody(parseLookupPreprint),
  RM.chainFirstW(preprint =>
    pipe(
      RM.fromReaderTaskEither(doesPreprintExist(preprint)),
      RM.chainEitherKW(E.fromPredicate(identity, () => unknownPreprintE(preprint))),
    ),
  ),
  RM.ichainMiddlewareK(preprint => seeOther(format(preprintReviewsMatch.formatter, { id: preprint }))),
  RM.orElseW(error =>
    pipe(
      getUser,
      RM.orElseW(() => RM.of(undefined)),
      RM.ichainW(user =>
        match(error)
          .with({ _tag: 'UnknownPreprintE', actual: P.select() }, preprint => showUnknownPreprintPage(preprint, user))
          .with({ _tag: 'UnsupportedDoiE' }, () => showUnsupportedDoiPage(user))
          .with({ _tag: 'UnsupportedUrlE' }, () => showUnsupportedUrlPage(user))
          .with('unavailable', () => showFailureMessage(user))
          .otherwise(flow(E.left, form => showFindAPreprintErrorPage(form, user))),
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

type SubmittedLookupPreprint = E.Either<InvalidE, Doi>
type UnsubmittedLookupPreprint = E.Right<undefined>
type LookupPreprint = SubmittedLookupPreprint | UnsubmittedLookupPreprint

function createPage(lookupPreprint: LookupPreprint, user?: User) {
  const error = E.isLeft(lookupPreprint)

  return page({
    title: plainText`${error ? 'Error: ' : ''}Find and publish PREreviews`,
    content: html`
      <main id="main-content">
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${E.isLeft(lookupPreprint)
                    ? html`
                        <li>
                          <a href="#preprint">
                            ${match(lookupPreprint.left)
                              .with({ _tag: 'InvalidE' }, () => 'Enter a preprint DOI or URL')
                              .exhaustive()}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <form
          method="post"
          action="${format(findAPreprintMatch.formatter, {})}"
          novalidate
          aria-labelledby="find-title"
        >
          <div ${rawHtml(E.isLeft(lookupPreprint) ? 'class="error"' : '')}>
            <h1 id="find-title">Find and publish PREreviews</h1>

            <label for="preprint">Preprint DOI or URL</label>

            <p id="preprint-tip" role="note">
              A DOI is a unique identifier that you can find on the preprint. For example,
              <q class="select-all" translate="no">10.1101/2022.10.06.511170</q> or
              <q class="select-all" translate="no">https://doi.org/10.1101/2022.10.06.511170</q>.
            </p>

            ${error
              ? html`
                  <div class="error-message" id="preprint-error">
                    <span class="visually-hidden">Error:</span>
                    ${match(lookupPreprint.left)
                      .with({ _tag: 'InvalidE' }, () => 'Enter a preprint DOI or URL')
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
              ${match(lookupPreprint)
                .with({ right: P.select(P.string) }, value => html`value="${value}"`)
                .with({ left: { actual: P.select() } }, value => html`value="${value}"`)
                .otherwise(() => '')}
              ${rawHtml(E.isLeft(lookupPreprint) ? 'aria-invalid="true" aria-errormessage="preprint-error"' : '')}
            />
          </div>

          <button>Continue</button>
        </form>
      </main>
    `,
    js: error ? ['error-summary.js'] : [],
    skipLinks: [[html`Skip to main content`, '#main-content']],
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
            .exhaustive()}
          preprint, but we can’t find any details.
        </p>

        <p>If you typed the DOI, check it is correct.</p>

        <p>If you pasted the DOI, check you copied the entire address.</p>

        <p>
          If the DOI is correct or you selected a link or button, please
          <a href="mailto:help@prereview.org">get in touch</a>.
        </p>

        <a href="${format(findAPreprintMatch.formatter, {})}" class="button">Back</a>
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

        <p>
          If the URL is correct or you selected a link or button, please
          <a href="mailto:help@prereview.org">get in touch</a>.
        </p>

        <a href="${format(findAPreprintMatch.formatter, {})}" class="button">Back</a>
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
          We support preprints from AfricArXiv, arXiv, bioRxiv, ChemRxiv, EarthArXiv, EcoEvoRxiv, EdArXiv, engrXiv,
          medRxiv, MetaArXiv, OSF, PhilSci-Archive, Preprints.org, PsyArXiv, Research&nbsp;Square, SciELO, ScienceOpen
          and SocArXiv.
        </p>

        <p>
          If this DOI is for a preprint on a server we don’t support, please
          <a href="mailto:help@prereview.org">get in touch</a>.
        </p>

        <a href="${format(findAPreprintMatch.formatter, {})}" class="button">Back</a>
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
          We support preprints from AfricArXiv, arXiv, bioRxiv, ChemRxiv, EarthArXiv, EcoEvoRxiv, EdArXiv, engrXiv,
          medRxiv, MetaArXiv, OSF, PhilSci-Archive, Preprints.org, PsyArXiv, Research&nbsp;Square, SciELO, ScienceOpen
          and SocArXiv.
        </p>

        <p>
          If this URL is for a preprint on a server we don’t support, please
          <a href="mailto:help@prereview.org">get in touch</a>.
        </p>

        <p>Otherwise, if the preprint has a DOI, please try using that instead.</p>

        <a href="${format(findAPreprintMatch.formatter, {})}" class="button">Back</a>
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

        <p>We’re unable to show the preprint and its PREreviews now.</p>

        <p>Please try again later.</p>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function chainReaderKW<R2, A, B>(
  f: (a: A) => Reader<R2, B>,
): <R1, I, E>(ma: RM.ReaderMiddleware<R1, I, I, E, A>) => RM.ReaderMiddleware<R1 & R2, I, I, E, B> {
  return RM.chainW(fromReaderK(f))
}
