import { html, plainText } from '../../html.ts'
import { type SupportedLocale, translate } from '../../locales/index.ts'
import assets from '../../manifest.json' with { type: 'json' }
import * as Routes from '../../routes.ts'
import { PageResponse } from '../Response/index.ts'

export const createPage = (locale: SupportedLocale) => {
  const t = translate(locale)

  return PageResponse({
    title: plainText(t('partners', 'title')()),
    main: html`
      <h1>${t('partners', 'title')()}</h1>

      <ol class="logos">
        <li>
          <a href="https://africanrn.org/">
            <img
              src="${assets['aren.png'].path}"
              width="${assets['aren.png'].width}"
              height="${assets['aren.png'].height}"
              alt="African Reproducibility Network"
            />
          </a>
        </li>
        <li>
          <a href="https://info.africarxiv.org/">
            <img
              src="${assets['africarxiv.svg'].path}"
              width="${assets['africarxiv.svg'].width}"
              height="${assets['africarxiv.svg'].height}"
              alt="AfricArXiv"
            />
          </a>
        </li>
        <li>
          <a href="https://asapbio.org/">
            <img
              src="${assets['asapbio.svg'].path}"
              width="${assets['asapbio.svg'].width}"
              height="${assets['asapbio.svg'].height}"
              alt="ASAPbio"
            />
          </a>
        </li>
        <li>
          <a href="https://www.coar-repositories.org/">
            <img
              src="${assets['coar.svg'].path}"
              width="${assets['coar.svg'].width}"
              height="${assets['coar.svg'].height}"
              alt="COAR"
            />
          </a>
        </li>
        <li>
          <a href="https://www.cshl.edu/">
            <img
              src="${assets['cshl.svg'].path}"
              width="${assets['cshl.svg'].width}"
              height="${assets['cshl.svg'].height}"
              alt="Cold Spring Harbor Laboratory"
            />
          </a>
        </li>
        <li>
          <a href="https://eiderafricaltd.org/">
            <img
              src="${assets['eider-africa.svg'].path}"
              width="${assets['eider-africa.svg'].width}"
              height="${assets['eider-africa.svg'].height}"
              alt="Eider Africa"
            />
          </a>
        </li>
        <li>
          <a href="https://elifesciences.org/">
            <img
              src="${assets['elife.svg'].path}"
              width="${assets['elife.svg'].width}"
              height="${assets['elife.svg'].height}"
              alt="eLife"
            />
          </a>
        </li>
        <li>
          <a href="https://www.healthra.org/">
            <img
              src="${assets['healthra.svg'].path}"
              width="${assets['healthra.svg'].width}"
              height="${assets['healthra.svg'].height}"
              alt="Health Research Alliance"
            />
          </a>
        </li>
        <li>
          <a href="https://www.orfg.org/">
            <img
              src="${assets['ofrg.svg'].path}"
              width="${assets['ofrg.svg'].width}"
              height="${assets['ofrg.svg'].height}"
              alt="Open Research Funders Group"
            />
          </a>
        </li>
        <li>
          <a href="https://www.preprints.org/">
            <img
              src="${assets['preprintsorg.png'].path}"
              width="${assets['preprintsorg.png'].width}"
              height="${assets['preprintsorg.png'].height}"
              alt="Preprints.org"
            />
          </a>
        </li>
        <li>
          <a href="https://scielo.org/">
            <img
              src="${assets['scielo.svg'].path}"
              width="${assets['scielo.svg'].width}"
              height="${assets['scielo.svg'].height}"
              alt="SciELO"
            />
          </a>
        </li>
        <li>
          <a href="https://sciety.org/">
            <img
              src="${assets['sciety.svg'].path}"
              width="${assets['sciety.svg'].width}"
              height="${assets['sciety.svg'].height}"
              alt="Sciety"
            />
          </a>
        </li>
      </ol>
    `,
    canonical: Routes.Partners,
    current: 'partners',
  })
}
