import { flow, pipe } from 'fp-ts/function'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import { page } from './page'

const sendPage = flow(createPage, M.send)

export const preprint = pipe(
  M.status(Status.OK),
  M.ichainFirst(() => M.contentType(MediaType.textHTML)),
  M.ichainFirst(() => M.closeHeaders()),
  M.ichain(sendPage),
)

function createPage() {
  return page({
    title: "Reviews of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii'",
    content: `

  <article>
    <h1>The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i></h1>
  </article>

  <main>
    <h2>1 PREreview</h2>

    <a href="doi-10.1101-2022.01.13.476201/review" class="button">Write a PREreview</a>

    <ol class="cards">
      <li>
        <article>
          <ol aria-label="Authors of this review" role="list" class="author-list">
            <li>Jingfang Hao</li>
            <li>Pierrick Bru</li>
            <li>Alizée Malnoë</li>
            <li>Aurélie Crepin</li>
            <li>Jack Forsman</li>
            <li>Domenica Farci</li>
          </ol>
          <p>
            The manuscript “The role of LHCBM1 in non-photochemical quenching in <em>Chlamydomonas reinhardtii</em>” by
            Liu et al. aims to elucidate how LHCBM1 is involved in non-photochemical quenching (NPQ) in
            <em>Chlamydomonas reinhardtii</em>. The Chlamydomonas mutant lacking LHCBM1 (<em>npq5</em>) displays …
          </p>
          <a href="../reviews/6415043" class="more">
            Read <span class="visually-hidden">the review by Jingfang Hao et al.</span>
          </a>
        </article>
      </li>
    </ol>
  </main>
`,
  })
}
