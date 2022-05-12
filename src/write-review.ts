import * as E from 'fp-ts/Either'
import { flow, pipe } from 'fp-ts/function'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as D from 'io-ts/Decoder'
import { match } from 'ts-pattern'
import { NonEmptyStringC } from './string'

const NewReviewD = D.struct({
  review: NonEmptyStringC,
})

export const writeReview = pipe(
  M.decodeMethod(E.right),
  M.ichainW(method =>
    match(method)
      .with('POST', () => handleForm)
      .otherwise(() => showForm),
  ),
)

const handleForm = pipe(
  M.decodeBody(NewReviewD.decode),
  M.ichain(() => M.status(Status.SeeOther)),
  M.ichain(() => M.header('Location', '/preprints/doi-10.1101-2022.01.13.476201/success')),
  M.ichain(() => M.closeHeaders()),
  M.ichain(() => M.end()),
  M.orElse(() =>
    pipe(
      M.status(Status.SeeOther),
      M.ichain(() => M.header('Location', '/preprints/doi-10.1101-2022.01.13.476201/review')),
      M.ichain(() => M.closeHeaders()),
      M.ichain(() => M.end()),
    ),
  ),
)

const showForm = pipe(
  M.status(Status.OK),
  M.ichainFirst(() => M.contentType(MediaType.textHTML)),
  M.ichainFirst(() => M.closeHeaders()),
  M.ichain(flow(createPage, M.send)),
)

function createPage() {
  return `
<!DOCTYPE html>

<html lang="en">
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <link href="../../style.css" rel="stylesheet" />

  <title>Write a PREreview of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii'</title>

  <header>
    <a href="../../index.html"><img src="../../prereview.svg" width="262" height="63" alt="PREreview" /></a>
  </header>

  <main>
    <h1>
      <label for="review">
        Write a PREreview of “The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>”
      </label>
    </h1>

    <form method="post">
      <textarea id="review" name="review" rows="20"></textarea>

      <button>Post PREreview</button>
    </form>
  </main>
</html>
`
}
