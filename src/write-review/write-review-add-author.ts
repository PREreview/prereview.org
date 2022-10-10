import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { Reader } from 'fp-ts/Reader'
import * as RR from 'fp-ts/ReadonlyRecord'
import * as b from 'fp-ts/boolean'
import { constUndefined, flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { parse } from 'orcid-id-ts'
import { match } from 'ts-pattern'
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
import { NonEmptyStringC } from '../string'
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
  fromReaderK(({ preprint, user }: { preprint: Preprint; user: User }) =>
    addAuthorForm(preprint, {}, user, { name: false, orcid: false }),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showAddAuthorErrorForm = (preprint: Preprint, user: User) =>
  flow(
    fromReaderK((formErrors: { name: boolean; orcid: boolean }) => addAuthorForm(preprint, {}, user, formErrors)),
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
        RM.apS(
          'name',
          RM.decodeBody(
            flow(
              AddAuthorFormNameD.decode,
              E.match(
                () => E.right(true),
                () => E.right(false),
              ),
            ),
          ),
        ),
        RM.apS(
          'orcid',
          RM.decodeBody(
            flow(
              AddAuthorFormOrcidD.decode,
              E.match(
                () => E.right(true),
                () => E.right(false),
              ),
            ),
          ),
        ),
        RM.ichain(showAddAuthorErrorForm(preprint, user)),
      ),
    ),
  )

const OrcidD = pipe(
  D.string,
  D.parse(s => E.fromOption(() => D.error(s, 'ORCID'))(parse(s))),
)

type AddAuthorForm = D.TypeOf<typeof AddAuthorFormD>

const AddAuthorFormD = D.struct({
  name: NonEmptyStringC,
  orcid: D.union(OrcidD, pipe(D.literal(''), D.map(constUndefined))),
})

const AddAuthorFormNameD = D.struct({
  name: NonEmptyStringC,
})

const AddAuthorFormOrcidD = D.struct({
  orcid: D.union(OrcidD, pipe(D.literal(''), D.map(constUndefined))),
})

function addAuthorForm(
  preprint: Preprint,
  form: Partial<AddAuthorForm>,
  user: User,
  formErrors: { name: boolean; orcid: boolean },
) {
  const errors = pipe(formErrors, RR.elem(b.Eq)(true))

  return page({
    title: plainText`${errors || formErrors.orcid ? 'Error: ' : ''}Add an author – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewAuthorsMatch.formatter, { doi: preprint.doi })}" class="back">Back</a>
      </nav>

      <main>
        <form method="post" action="${format(writeReviewAddAuthorMatch.formatter, { doi: preprint.doi })}" novalidate>
          ${errors
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    ${formErrors.name
                      ? html`
                          <li>
                            <a href="#add-author-name">Enter their name</a>
                          </li>
                        `
                      : ''}
                    ${formErrors.orcid
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

          <div ${rawHtml(formErrors.name ? 'class="error"' : '')}>
            <label for="add-author-name">Name</label>

            ${formErrors.name
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
              ${rawHtml(formErrors.name ? 'aria-invalid="true" aria-errormessage="add-author-name-error"' : '')}
            />
          </div>

          <div ${rawHtml(formErrors.orcid ? 'class="error"' : '')}>
            <label for="add-author-orcid">ORCID&nbsp;iD (optional)</label>

            ${formErrors.orcid
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
              ${rawHtml(formErrors.orcid ? 'aria-invalid="true" aria-errormessage="add-author-orcid-error"' : '')}
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
