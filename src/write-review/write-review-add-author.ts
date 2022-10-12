import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { Reader } from 'fp-ts/Reader'
import * as RR from 'fp-ts/ReadonlyRecord'
import { constUndefined, flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { Orcid, parse } from 'orcid-id-ts'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { canAddAuthors } from '../feature-flags'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import {
  writeReviewAddAuthorMatch,
  writeReviewAddAuthorsMatch,
  writeReviewAuthorsMatch,
  writeReviewMatch,
} from '../routes'
import { NonEmptyString, NonEmptyStringC } from '../string'
import { User, getUserFromSession } from '../user'
import { Form, getForm, saveForm, updateForm } from './form'
import { Preprint, getPreprint } from './preprint'

export const writeReviewAddAuthor = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUserFromSession()),
      RM.bindW(
        'canAddAuthors',
        fromReaderK(({ user }) => canAddAuthors(user)),
      ),
      RM.filterOrElseW(
        ({ canAddAuthors }) => canAddAuthors,
        () => 'not-found',
      ),
      RM.bindW('form', ({ user }) => RM.rightReaderTask(getForm(user.orcid, preprint.doi))),
      RM.apSW('method', RM.decodeMethod(E.right)),
      RM.ichainW(state =>
        match(state)
          .with({ form: { moreAuthors: 'yes' }, method: 'POST' }, handleAddAuthorForm)
          .with({ form: { moreAuthors: 'yes' } }, showAddAuthorForm)
          .otherwise(() => notFound),
      ),
      RM.orElseW(error =>
        match(error)
          .with('not-found', () => notFound)
          .otherwise(() => RM.fromMiddleware(seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi })))),
      ),
    ),
  ),
  RM.orElseW(error =>
    match(error)
      .with('not-found', () => notFound)
      .with('unavailable', () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showAddAuthorForm = flow(
  fromReaderK(({ preprint }: { preprint: Preprint }) =>
    addAuthorForm(preprint, { name: E.right(undefined), orcid: E.right(undefined) }),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showAddAuthorErrorForm = (preprint: Preprint) =>
  flow(
    fromReaderK((form: AddAuthorForm) => addAuthorForm(preprint, form)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleAddAuthorForm = ({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
  pipe(
    RM.decodeBody(AddAuthorFormD.decode),
    RM.map(author => ({ otherAuthors: [...(form.otherAuthors ?? []), author] })),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskK(saveForm(user.orcid, preprint.doi)),
    RM.ichainMiddlewareKW(() => seeOther(format(writeReviewAddAuthorsMatch.formatter, { doi: preprint.doi }))),
    RM.orElseW(() =>
      pipe(
        RM.of({}),
        RM.apS('name', RM.decodeBody(flow(NameFieldD.decode, E.right))),
        RM.apS('orcid', RM.decodeBody(flow(OrcidFieldD.decode, E.right))),
        RM.ichain(showAddAuthorErrorForm(preprint)),
      ),
    ),
  )

const OrcidD = pipe(
  D.string,
  D.parse(s => E.fromOption(() => D.error(s, 'ORCID'))(parse(s))),
)

const AddAuthorFormD = D.struct({
  name: NonEmptyStringC,
  orcid: D.union(OrcidD, pipe(D.literal(''), D.map(constUndefined))),
})

const NameFieldD = pipe(D.struct({ name: NonEmptyStringC }), D.map(get('name')))

const OrcidFieldD = pipe(
  D.struct({ orcid: D.union(OrcidD, pipe(D.literal(''), D.map(constUndefined))) }),
  D.map(get('orcid')),
)

type AddAuthorForm = {
  readonly name: E.Either<unknown, NonEmptyString | undefined>
  readonly orcid: E.Either<unknown, Orcid | undefined>
}

function addAuthorForm(preprint: Preprint, form: AddAuthorForm) {
  const error = pipe(form, RR.some(E.isLeft))

  return page({
    title: plainText`${error ? 'Error: ' : ''}Add an author – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewAuthorsMatch.formatter, { doi: preprint.doi })}" class="back">Back</a>
      </nav>

      <main>
        <form method="post" action="${format(writeReviewAddAuthorMatch.formatter, { doi: preprint.doi })}" novalidate>
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    ${E.isLeft(form.name)
                      ? html`
                          <li>
                            <a href="#add-author-name">Enter their name</a>
                          </li>
                        `
                      : ''}
                    ${E.isLeft(form.orcid)
                      ? html`
                          <li>
                            <a href="#add-author-orcid">Enter their ORCID iD</a>
                          </li>
                        `
                      : ''}
                  </ul>
                </error-summary>
              `
            : ''}

          <h1>Add an author</h1>

          <div ${rawHtml(E.isLeft(form.name) ? 'class="error"' : '')}>
            <label for="add-author-name">Name</label>

            ${E.isLeft(form.name)
              ? html`
                  <div class="error-message" id="add-author-name-error">
                    <span class="visually-hidden">Error:</span> Enter their name
                  </div>
                `
              : ''}

            <input
              id="add-author-name"
              name="name"
              type="text"
              spellcheck="false"
              ${match(form.name)
                .with(E.right(P.select(P.string)), value => html`value="${value}"`)
                .otherwise(() => '')}
              ${rawHtml(E.isLeft(form.name) ? 'aria-invalid="true" aria-errormessage="add-author-name-error"' : '')}
            />
          </div>

          <div ${rawHtml(E.isLeft(form.orcid) ? 'class="error"' : '')}>
            <label for="add-author-orcid">ORCID&nbsp;iD (optional)</label>

            ${E.isLeft(form.orcid)
              ? html`
                  <div class="error-message" id="add-author-orcid-error">
                    <span class="visually-hidden">Error:</span> Enter their ORCID&nbsp;iD
                  </div>
                `
              : ''}

            <input
              id="add-author-orcid"
              name="orcid"
              class="orcid"
              type="text"
              size="19"
              autocomplete="off"
              spellcheck="false"
              ${match(form.orcid)
                .with(E.right(P.select(P.string)), value => html`value="${value}"`)
                .otherwise(() => '')}
              ${rawHtml(E.isLeft(form.orcid) ? 'aria-invalid="true" aria-errormessage="add-author-orcid-error"' : '')}
            />
          </div>

          <button>Continue</button>
        </form>
      </main>
    `,
    js: ['error-summary.js'],
  })
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}
