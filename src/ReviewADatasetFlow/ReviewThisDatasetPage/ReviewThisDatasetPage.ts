import { Option } from 'effect'
import { html, plainText } from '../../html.js'
import { PageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import type { User } from '../../user.js'

export const ReviewThisDatasetPage = ({ user }: { user: Option.Option<User> }) => {
  return PageResponse({
    title: plainText`Review a dataset`,
    main: html`
      <h1>Review a dataset</h1>

      <article class="preview" tabindex="0" aria-labelledby="dataset-title">
        <header>
          <h2 id="dataset-title">Metadata collected from 500 articles in the field of ecology and evolution</h2>

          <div class="byline">
            <span class="visually-hidden">Authored</span> by Jesse Wolf, Layla MacKay, Sarah Haworth, Morgan Dedato,
            Kiana Young, Marie-Laurence Cossette, Colin Elliott and Rebekah Oomen
          </div>

          <dl>
            <div>
              <dt>Posted</dt>
              <dd>September 2, 2022</dd>
            </div>
            <div>
              <dt>Repository</dt>
              <dd>Dryad</dd>
            </div>
            <div>
              <dt>DOI</dt>
              <dd class="doi" translate="no">10.5061/dryad.wstqjq2n3</dd>
            </div>
          </dl>
        </header>

        <p>
          The submitted dataset contains the metadata collected from 500 articles in the field of ecology and evolution.
          This includes articles from the following journals: Ecology and Evolution, PLoS One, Proceedings of the Royal
          Society B, Ecology and the preprint server bioRxiv. Direct identifiers have been removed from the dataset.
          These included the first and last names of authors. No more than three indirect identifiers have been
          provided. Information found herein includes article titles, number of authors and ECR status, among others. A
          README file has been attached to provide greater details about the dataset.
        </p>
      </article>

      <p>
        You can write a PREreview of
        <cite>Metadata collected from 500 articles in the field of ecology and evolution</cite>. We’ll ask questions
        about the dataset to create a structured review.
      </p>

      ${Option.match(user, {
        onSome: () => '',
        onNone: () => html`
          <h2>Before you start</h2>

          <p>We will ask you to log in with your ORCID&nbsp;iD. If you don’t have an iD, you can create one.</p>

          <details>
            <summary><span>What is an ORCID&nbsp;iD?</span></summary>

            <div>
              <p>
                An <a href="https://orcid.org/"><dfn>ORCID&nbsp;iD</dfn></a> is a unique identifier that distinguishes
                you from everyone with the same or similar name.
              </p>
            </div>
          </details>
        `,
      })}

      <a href="${Routes.ReviewThisDatasetStartNow}" role="button" draggable="false">Start now</a>
    `,
    canonical: Routes.ReviewThisDataset,
  })
}
