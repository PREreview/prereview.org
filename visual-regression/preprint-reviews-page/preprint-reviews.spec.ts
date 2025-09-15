import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import { Orcid } from 'orcid-id-ts'
import { html } from '../../src/html.js'
import { DefaultLocale } from '../../src/locales/index.js'
import type { Prereview, RapidPrereview } from '../../src/preprint-reviews-page/index.js'
import { createPage } from '../../src/preprint-reviews-page/preprint-reviews.js'
import { Preprint } from '../../src/preprint.js'
import { BiorxivPreprintId } from '../../src/Preprints/index.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showTwoUpPage }) => {
  const response = createPage({
    locale: DefaultLocale,
    preprint,
    reviews: [prereview1, prereview2, prereview3, prereview4, prereview5],
    rapidPrereviews: [],
  })

  const [content, aside] = await showTwoUpPage(response)

  await expect(content).toHaveScreenshot()
  await expect(aside).toHaveScreenshot()
})

test('content looks right when empty', async ({ showTwoUpPage }) => {
  const response = createPage({
    locale: DefaultLocale,
    preprint: { ...preprint, authors: [preprint.authors[0]], abstract: undefined },
    reviews: [],
    rapidPrereviews: [],
  })

  const [content, aside] = await showTwoUpPage(response)

  await expect(content).toHaveScreenshot()
  await expect(aside).toHaveScreenshot()
})

test('content looks right with rapid PREreviews', async ({ showTwoUpPage }) => {
  const response = createPage({
    locale: DefaultLocale,
    preprint,
    reviews: [prereview1],
    rapidPrereviews: [rapidPrereview1],
  })

  const [content, aside] = await showTwoUpPage(response)

  await expect(content).toHaveScreenshot()
  await expect(aside).toHaveScreenshot()
})

const preprint = Preprint({
  authors: [
    { name: 'Xin Liu' },
    { name: 'Wojciech Nawrocki', orcid: Orcid('0000-0001-5124-3000') },
    { name: 'Roberta Croce', orcid: Orcid('0000-0003-3469-834X') },
  ],
  id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
  posted: Temporal.PlainDate.from('2022-01-14'),
  abstract: {
    text: html`<p>
      Non-photochemical quenching (NPQ) is the process that protects photosynthetic organisms from photodamage by
      dissipating the energy absorbed in excess as heat. In the model green alga <i>Chlamydomonas reinhardtii</i>, NPQ
      was abolished in the knock-out mutants of the pigment-protein complexes LHCSR3 and LHCBM1. However, while LHCSR3
      was shown to be a pH sensor and switching to a quenched conformation at low pH, the role of LHCBM1 in NPQ has not
      been elucidated yet. In this work, we combine biochemical and physiological measurements to study short-term high
      light acclimation of <i>npq5</i>, the mutant lacking LHCBM1. We show that while in low light in the absence of
      this complex, the antenna size of PSII is smaller than in its presence, this effect is marginal in high light,
      implying that a reduction of the antenna is not responsible for the low NPQ. We also show that the mutant
      expresses LHCSR3 at the WT level in high light, indicating that the absence of this complex is also not the
      reason. Finally, NPQ remains low in the mutant even when the pH is artificially lowered to values that can switch
      LHCSR3 to the quenched conformation. It is concluded that both LHCSR3 and LHCBM1 need to be present for the
      induction of NPQ and that LHCBM1 is the interacting partner of LHCSR3. This interaction can either enhance the
      quenching capacity of LHCSR3 or connect this complex with the PSII supercomplex.
    </p>`,
    language: 'en',
  },
  title: {
    text: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
    language: 'en',
  },
  url: new URL('https://biorxiv.org/lookup/doi/10.1101/2022.01.13.476201'),
})

const prereview1 = {
  id: 11062553,
  authors: {
    named: [
      { name: 'Ashraya Ravikumar', orcid: Orcid('0000-0002-4902-4025') },
      { name: 'Stephanie Wankowicz', orcid: Orcid('0000-0002-4225-7459') },
      { name: 'Flip Jansen', orcid: Orcid('0009-0004-7336-0274') },
    ],
    anonymous: 1,
  },
  language: 'en',
  text: html`<p><b>AlphaFold Meets Flow Matching for Generating Protein Ensembles</b></p>
    <p><a href="https://arxiv.org/abs/2402.04845">https://arxiv.org/abs/2402.04845</a></p>
    <p><b>Summary</b></p>
    <p>
      Major progress has been made using ML methods to predict single static structures of proteins given their primary
      sequence (e.g. using AlphaFold or ESMFold). But, given that proteins exist as an ensemble of conformations, there
      is a need for methods that can predict these ensembles given the sequence or a single structure. Although there
      are some computational methods available for this task, in this paper, the authors take a new approach by
      converting Alphafold/ESMfold, which are regressive models, into generative models using flow matching. Flow
      matching is a generalization of diffusion modeling and in this case, works by iteratively sampling from a harmonic
      prior and interpolating with a data point to create a noisy input template for Alphafold/ESMfold along with a
      constant sequence. The authors compare their method to an increasingly popular method for generating diversity
      from AF predictions: MSA subsampling. They evaluate the ensemble outputs from Alphaflow against pseudo-ensembles
      of previously solved structures deposited in PDB and ensembles of structures generated using MD. They use a
      combination of informative metrics such as diversity, recall, and precision of the Alphaflow and MSA subsampling
      ensembles as compared with the ground truth ensembles and show that their method is better than MSA subsampling in
      the diversity/recall v. precision trade-off frontiers. Unlike existing diffusion methods, flow matching is also
      able to handle missing residues in the input structure and is invariant to structure size. As mentioned by the
      authors, the limitations to their approach remain that it cannot yet be used to generate temporally ordered
      ensembles, it does not aim to sample the whole Boltzmann distribution of the protein of interest, and cannot be
      used for any kinetic studies. There is also conformational diversity they are not able to recapitulate.
    </p>
    <p>
      We find this to be an important paper with very interesting results that have been well presented and well
      written. Some of the key limitations we think the current study has is a lack of demonstration of its ability to
      generate biologically relevant conformations as part of the ensembles and comparison to existing generative
      diffusion-like methods. We expand on these points and other questions we have below:
    </p>
    <p><b>Major points</b></p>
    <ul>
      <li>
        <p>
          Out of the 563 proteins that satisfy all the criteria in the test set, the authors say they sub-sampled 100
          structures to form the test set. It is unclear why they chose to do this. Did they do any bootstrapping on
          this subsample? Also, the chain length range chosen by the authors (265-765) seems strange given that a large
          number of proteins have length under their lower limit.
        </p>
      </li>
      <li>
        <p>
          The authors fixed the number of flow-matching steps to 10. However, it will be useful and interesting to see
          the relationship between diversity/recall v. precision tradeoff and the number of flow-matching steps.
        </p>
      </li>
      <li>
        <p>
          The authors mention that they perform RMSD Alignment as one of the tweaks to make this method work in the
          Quotient space (in section A2, before equation 15). But the motivation behind this decision is not obvious or
          made clear to the reader.
        </p>
      </li>
      <li>
        <p>
          Although the authors have shown improvement at the ensemble level over MSA subsampling, some MSA subsampling
          methods have been able to sample biologically important conformations such as the open and closed state in
          kinases (for example, as shown in
          <a href="https://www.biorxiv.org/content/10.1101/2023.07.25.550545v3"
            >https://www.biorxiv.org/content/10.1101/2023.07.25.550545v3</a
          >). Have the authors had success in generating such biologically relevant conformational transitions? Also,
          given the low level of aggregate recall, is the Alphaflow-generated ensemble heterogeneity representative of
          biologically relevant heterogeneity that is not present in the PDB or MD simulations? Or the other way around,
          is Alphaflow not generating the biologically relevant type of heterogeneity(e.g. not around equilibrium),
          which is present in the PDB
        </p>
      </li>
      <li>
        <p>
          We understand that in order to generalize the results of the comparison between Alphaflow ensembles and MD
          ensembles, the authors have resorted to using the ATLAS database since it has trajectories of a representative
          set of proteins. However, as an extension of the previous point, to truly evaluate Alphaflow’s ability to
          sample biologically relevant conformations, it will be interesting to compare Alphaflow outputs to some long
          MD simulations as shown for example by
          <a href="https://www.biorxiv.org/content/10.1101/2024.04.16.589792v1.full.pdf">Riccabona et al, 2024</a>. With
          long duration simulations, it is possible to plot a free energy landscape of the protein and project the
          Alphaflow predicted structures onto the landscape and directly visualize the extent of sampling achieved by
          the method.
        </p>
      </li>
      <li>
        <p>
          We were wondering why the mentioned training cutoff of May 1, 2018, appears to coincide with the Alphafold1
          training cutoff, suggesting the use of Alphafold1. Even though it is mentioned that Openfold (Ahdritz et al,
          2022) is used for finetuning, which is modeled to be analogous to Alphafold 2 with its corresponding 2020
          cutoff date. We pose that Alphaflow is in fact trained by finetuning the Alphafold2 model and that the early
          cutoff date may have been chosen to offer a larger potential testing protein dataset, does that hold?
        </p>
      </li>
      <li>
        <p>
          Besides MSA subsampling, the authors have not compared their method to other (iterative denoising) models used
          for structure prediction and ensemble generation - e.g. comparing performance to a Distributional Graphormer
          (Zheng et al, 2023) or Eigenfold (Jing et al, 2023) for a wider range of protein sizes.
        </p>
      </li>
      <li>
        <p>
          <a href="https://doi.org/10.1101/2022.11.20.517210">Ahdritz et al</a>, 2022 show with Openfold that Alphafold
          - colloquially - greedily reduces FAPE loss during training by forming a rudimentary PCA-like representation
          of the input structure and solving the structure for that in an iterative dimension-increasing fashion. How
          does using a FAPE^2 loss influence this behavior? We would expect this kind of greedy PCA representation
          behavior to increase.
        </p>
      </li>
      <li>
        <p>
          We would also be interested in the diversity inherent in the PDB set and how that compares to the diversity
          found in the compared methods.
        </p>
      </li>
    </ul>
    <p><b>Minor points</b></p>
    <ul>
      <li>
        <p>
          The current method takes only the positions of the Carbon-beta (Cβ) atoms as input, and consequently, the
          optimization process is performed solely over these positions. However, it is important to note that the
          selection of the best-fitting overall structure is not limited to Cβ information alone. The method
          incorporates whole structure information, including the positions of Cβ and other residue atoms, when
          calculating the RMSD-aligned loss function. This allows for a more comprehensive evaluation of the predicted
          structure's quality but raises a question about the impact of incorporating additional information beyond Cβ
          positions. It remains unclear how the inclusion of more detailed structural data, such as the positions of
          other backbone or side-chain atoms, could influence the prediction outcomes.
        </p>
      </li>
      <li>
        <p>
          Is it possible to sample MSA in numbers that are not powers of 2? We ask this because, in certain metrics
          shown in Table 1, based on the trends in MSA subsampling, it seems like choosing an intermediate number might
          make the method match the performance of Alphaflow. For instance, if the MSA was subsampled at 48 instead of
          32 or 64, maybe the pairwise RMSD of the MSA subsample ensemble might match that of the MD ensemble.
        </p>
      </li>
      <li>
        <p>
          To us, it is clear why the authors would use the Frame Aligned Point Error loss. But we are unsure why the
          loss is squared. We think that, unlike a single-structure-predicting Alphafold, we are now looking at
          ensembles and expect the predictions to be quite close to each other. Therefore one would want to penalize
          relatively small differences more severely than usual. It will be good to know the authors’ thought process
          behind this choice.
        </p>
      </li>
      <li>
        <p>
          The schematic shown in Figure 1 is quite helpful. However, we would like to know if there is any reason behind
          the authors’ choice to show a symmetric bifurcation in the flowfield. Is this indicative of some underlying
          “sub-classes” of structures in the predicted ensembles?
        </p>
      </li>
      <li>
        <p>
          Is there any roadmap on how to adapt Alphaflow so that it could be used for studying the elusive class of
          membrane proteins?
        </p>
      </li>
    </ul>
    <ul>
      <li><p>To us, it is unclear how in inference time the stepsize/number of steps has been chosen.</p></li>
      <li>
        <p>
          “When necessary, we subsample or replicate by the appropriate power of 2 to ensure all analyses operate on 256
          frames (important for finite-sample Wasserstein distances).” What do the authors mean by replicate? Is it a
          duplication of the output structures or something else?
        </p>
      </li>
      <li><p>The distillation procedure is described poorly in the appendix. What is X and Y?</p></li>
      <li>
        <p>
          To us, it is unclear why in panel “PC &gt; 0.5” of Figure 4 all the metrics go down in the last increase step
          of allotted GPU time.
        </p>
      </li>
      <li>
        <p>
          Repeated use of “the” in Section 3.2, below function (5), in the sentence “..discussed previously to be
          immediately used as <b>the the </b>denoising model xˆ1(x, t; θ), with x as the noisy input and t as an
          additional time embedding.”
        </p>
      </li>
    </ul>
    <p>Reviewed by</p>
    <p>Flip Jansen, Ashraya Ravikumar, Stephanie Wankowicz, James Fraser</p>
    <p>UCSF</p>
    <h2>Competing interests</h2>
    <p>The authors declare that they have no competing interests.</p>`,
} satisfies Prereview

const prereview2 = {
  id: 10888905,
  authors: {
    named: [{ name: 'Alain Manuel Chaple Gil', orcid: Orcid('0000-0002-8571-4429') }],
    anonymous: 0,
  },
  club: 'reviewing-dental-articles-club',
  language: 'en',
  text: html`<p>
      The article addresses an important issue because it considers verifying the implementation of necessary programs
      in the region on oral health issues in children. In addition, the progress and fulfillment of the goals proposed
      by the Chilean government to improve the prevalence of one of the most prevalent diseases worldwide are studied.
    </p>
    <p>I congratulate the authors on this important initiative and wish them success.</p>
    <p><b>Abstract</b></p>
    <p>
      · The writing of the abstract could be more empathetic. The abstract is the face of an article and requires that
      it impact the reader with a preamble that attracts the reading of the research.
    </p>
    <p>
      · In this same section, the use of acronyms, acronyms or abbreviations that can later be clarified in the text of
      the manuscript should be avoided.
    </p>
    <p>
      · The objective is ambiguous since it comprises two verbs: "to compare" and "to know". The latter should not be
      used for these purposes.
    </p>
    <p>
      · At the end of the summary, allegations are made that do not contrast with the objective of the research and that
      may be part of a discussion and not of the summary, as in the case of the possible causes of the results in 2017
      and 2020.
    </p>
    <p><b>Introduction</b></p>
    <p>· The objective set out in the introduction does not coincide with that of the abstract.</p>
    <p>
      · This same objective is extensive. It is suggested that the authors rewrite it in such a way that it concretely
      expresses the course of the research.
    </p>
    <p><b>Methodology</b></p>
    <p>
      · The writing of any scientific article must be done in an impersonal time. For this reason, it is suggested that
      authors review the wording of the article and adjust it to this rule, which is important even if they intend to
      translate the manuscript for publication.
    </p>
    <p>
      · It would be useful for readers to provide the URLs of the sites from which they extracted the information for
      the study if they are in open access. Above all, because the Chilean government advocates this modality of sharing
      relevant information for investigations of this type.
    </p>
    <p>
      · In the selection criteria, reference is made to elements that do not agree with this section of the manuscript,
      although what is described is relevant in the research.
    </p>
    <p>
      · The same is true for exclusion criteria. All this information should have been included in the previous
      subsection in which the sites and series from which the data were extracted were described.
    </p>
    <p>
      · If the goals and resolutions are published, it is suggested that they do not describe in detail all the content
      of the goals and resolutions and make a brief description of them with the pertinent annotations. This would help
      them not to make the manuscript so long that it would affect its possible publication by number of pages or words.
    </p>
    <p>
      · It's the same with related programs as it is with goals and resolutions. If they are published, it is not
      necessary to describe them in full.
    </p>
    <p>
      · The COED and COP indices are international indices that have been widely described in the dental literature and
      it is suggested that the authors do not detail them in the manuscript.
    </p>
    <p><b>Results</b></p>
    <p>· For Figures 4 and 5, the authors are suggested to improve their resolution and display.</p>
    <p><b>Discussion</b></p>
    <p>
      · In this section, authors are suggested to contrast their results with other similar research in which they can
      discuss their findings without repeating numerical data referred to in the results section.
    </p>

    <h2>Competing interests</h2>

    <p>The author declares that they have no competing interests.</p>`,
} satisfies Prereview

const prereview3 = {
  id: 10870479,
  authors: {
    named: [
      { name: 'Vanessa Fairhurst', orcid: Orcid('0000-0001-8511-8689') },
      { name: 'Femi Qudus Arogundade', orcid: Orcid('0000-0002-9222-1817') },
      { name: 'Cesar Acevedo-Triana', orcid: Orcid('0000-0002-1296-9957') },
      { name: 'Kylie Yui Dan', orcid: Orcid('0000-0001-5894-4651') },
      { name: 'Emerald Swan' },
      { name: 'Lamis Elkheir', orcid: Orcid('0000-0002-3516-334X') },
      { name: 'Hickory Jaguar' },
      { name: 'Syeda Azra', orcid: Orcid('0009-0001-6430-851X') },
      { name: 'María Sol Ruiz', orcid: Orcid('0000-0001-9008-3302') },
      { name: 'Juan Bizzotto', orcid: Orcid('0000-0002-7844-2162') },
      { name: 'Janaynne Carvalho do Amaral', orcid: Orcid('0000-0002-9817-4572') },
      { name: 'Ebuka Ezeike', orcid: Orcid('0000-0003-3452-0306') },
      { name: 'Ranea-Robles P.', orcid: Orcid('0000-0001-6478-3815') },
      { name: 'María Eugenia Segretin', orcid: Orcid('0000-0002-6336-0703') },
      { name: 'Samir  Hachani', orcid: Orcid('0000-0002-9280-8941') },
      { name: 'Anna Oliveras', orcid: Orcid('0000-0002-5880-5245') },
      { name: 'Prof. MI Subhani, PhD., PDoc.', orcid: Orcid('0000-0003-1127-1853') },
    ],
    anonymous: 3,
  },
  language: 'en',
  text: html`<p>
      <i
        >This review is the result of a virtual, collaborative live review discussion organized and hosted by PREreview
        as Module III of the Open Reviewers: Champions Program 2024 workshop on February 27, 2024. The discussion was
        joined by 22 people: 3 facilitators, and 19 members of the PREreview 2024 Champions Program cohort. We thank all
        participants who contributed to the discussion and made it possible for us to provide feedback on this preprint.
      </i>
    </p>
    <h2><b>Summary paragraph</b></h2>
    <p>
      This study aims to examine the influence of distinct economic factors, including gross domestic product (GDP) and
      the proportion of GDP allocated to education, within the home countries of a significant cohort of international
      students who choose to pursue higher education in Australia. The primary objective is to discern potential
      inequities in access to university education in Australia and identify barriers encountered by prospective
      students seeking to study abroad. Utilizing publicly available data, from 2019 to 2022, from the Australian
      government and the World Bank, the authors looked for correlations between different factors such as GDP, % GDP
      spent on education, and geographical location with international student enrollment in Australian universities.
    </p>
    <p>
      Their design involved grouping countries that contributed more than 20 students into regions such as Southeast
      Asia, the Pacific, the Indian subcontinent, Sub-Saharan Africa, and China. Furthermore, they contrasted the level
      and field of study preferences between international and domestic students enrolled in Australian universities.
      While the authors did not find a strong correlation between the population rates of international student
      enrolment and the socioeconomic variables they used to compare, some outliers suggest that countries with higher
      GDP are associated with increased enrolment numbers in Australian universities. It is important to consider the
      potential impact of such exclusions on the overall interpretation of the results. Greater consideration of these
      “outliers” and their potential influence on the data coupled with robust sensitivity analyses, could enhance the
      validity and reliability of the findings.
    </p>
    <p>
      The reviewers commend the study for its focus on global equity in higher education and its potential policy
      implications for Australia which could spark further research into higher education accessibility issues
      worldwide. However, concerns are raised about the clarity of the conclusions and the accuracy of the statistical
      methodology, indicating areas where the authors could enhance both their manuscript and the data analysis.
    </p>
    <h2><b>Major issues and feedback </b></h2>
    <p>Despite the qualities of the paper, we have identified the following major issues:</p>
    <ul>
      <li>
        <p>
          The methodology fails to account for significant covariates such as cultural, political, and economic factors,
          which exert considerable influence on international student enrollment patterns. This oversight increases the
          risk of providing incomplete and biased conclusions. A comprehensive analysis requires the inclusion of these
          factors to accurately capture the complex drivers of global higher education migration (which also includes
          factors such as visa regulations, language barriers, societal attitudes toward education, and perceptions of
          safety).
        </p>
      </li>
      <li>
        <p>
          The statistical methods used may not be the most appropriate for the type of data being examined. A
          longitudinal study would have been more advantageous for a more thorough understanding of international
          student enrollment patterns and the factors influencing them. Unlike cross-sectional studies that capture data
          at a single point in time, longitudinal studies track the same variables over an extended period, offering
          insights into trends and changes over time. We would recommend the Haussmann test as an appropriate tool for
          this study; the fixed and random effect addresses also the issue in a manner that could benefit the study.
        </p>
      </li>
      <li>
        <p>
          Clarify the role of COVID in the study, addressing its potential impact on the findings before and after its
          occurrence, to provide context for the results obtained.
        </p>
      </li>
      <li>
        <p>
          The manuscript lacks clarity on the criteria used to include or exclude certain countries from the analysis.
          While it explains why some countries were excluded due to having fewer than 20 students studying in Australia,
          the rationale for removing outlier countries isn't adequately explained. While it's understandable that
          Malaysia/Singapore might be outliers due to Monash's campus there, a clearer justification and explanation of
          the threshold used to classify a country as an outlier within its region is necessary.
        </p>
      </li>
      <li>
        <p>
          While the introduction focuses on countries of varying incomes, the main conclusions are aimed at low- and
          middle-income countries. This inconsistency can lead to confusion for readers, requiring a more thorough
          explanation for why low- and middle-income countries are the primary focus of the paper. Please provide more
          details about the criteria for grouping countries by geographical regions when the main research question is
          related to socioeconomic factors.
        </p>
      </li>
      <li>
        <p>
          The methodology followed does not explain the reason for using (or not using) some variables nor does it show
          how the were results obtained. Better explaining their choice of methodology and comparing it to similar
          studies would add to the comprehension of the study.
        </p>
      </li>
      <li>
        <p>
          It is unclear how variables having “apparent association” were determined. We suggest that whether this was
          determined numerically or in some other way, to include how this decision was made (ie: correlation
          coefficient, p-value).
        </p>
      </li>
      <li>
        <p>
          While the data used is clear and easy to find, the methods used in the analysis are not sufficiently
          elaborated on, making it difficult for readers to reproduce. More detail on the statistical tests conducted is
          needed for greater reproducibility.
        </p>
      </li>
      <li>
        <p>
          The conclusion seems to present ideas not directly supported by the data presented and lacks clear suggestions
          for future perspectives in the wider discussion about equity in access to higher education. Providing a more
          thorough commentary on the statistical analyses in the conclusion would strengthen the conclusions and remind
          readers of the basis for the arguments being made.
        </p>
      </li>
    </ul>
    <h2><b>Minor issues and feedback </b></h2>
    <p><b>Concerns with techniques/analyses</b></p>
    <ul>
      <li>
        <p>
          The authors mention the countries that were excluded from the analysis and the inclusion criteria. A complete
          list of the countries included in the study is desirable in the main text.
        </p>
      </li>
      <li>
        <p>
          Regarding the methods section, an explicit state of the cross-sectional 2019-2022 nature of their study could
          enhance clarity regarding their research approach.
        </p>
      </li>
      <li>
        <p>Please describe the acronym GDP, this would be particularly useful for non-native English speakers.</p>
      </li>
      <li>
        <p>
          In the limitations section the authors say that they selected “data from the countries and regions of most
          “relevance” to Australia’s international education. Please provide more clarity on what is meant by
          “relevance”.
        </p>
      </li>
      <li>
        <p>
          In the conclusions, the authors suggest the development of a network for global online learning to reduce the
          global inequalities in access to higher education. We recommend a better explanation of what this network
          would look like, citing examples.
        </p>
      </li>
    </ul>
    <p><b>Details for reproducibility of the study</b></p>
    <ul>
      <li>
        <p>
          The lack of direct access to the original data creates an additional step that might hamper reproducibility
          efforts.
        </p>
      </li>
      <li>
        <p>
          The authors should be commended for depositing the data and methods used in Zenodo for reproducibility
          purposes. However, we had some difficulties finding that repository when reading the manuscript, and it
          included only the data and not the detailed methods applied. An explicit indication of its existence in the
          methods and/or abstract sections would solve this issue.
        </p>
      </li>
      <li>
        <p>
          The methods section could be improved by including details of the computational tools used to analyze and plot
          the data. It would be useful to add the code/script as a supplementary file to increase reproducibility.
        </p>
      </li>
    </ul>
    <p><b>Figures and tables</b></p>
    <ul>
      <li>
        <p>
          As a general comment, we recommend improving the tables and figures to enhance their clarity and visual
          appeal, making it easier for readers to understand the information presented.
        </p>
      </li>
      <li>
        <p>
          The use of different colors for the outliers and highlighting specific relevant countries in the graphs would
          make the graph easier to understand. Moreover, the integration of figures 1 to 4 in a single image with
          identical y- and x-axes could enhance data comparison and interpretation.
        </p>
      </li>
      <li>
        <p>
          Regarding tables, making the table design more uniform and adding grid lines would also enhance the
          comprehension of the data by the reader. Percentages in Tables 3 and 4 don’t seem to add up to 100% - consider
          adding another row to show where the rest of the data is.
        </p>
      </li>
      <li><p>Authors might want to check a typo in Table 4, where one of the percentages is 438.2%</p></li>
      <li>
        <p>
          Consider removing titles for Figures 1-4 and including all the relevant information to understand the figures
          in the figure captions.
        </p>
      </li>
    </ul>
    <ul>
      <li><p>The legends and numbers in Figures 1-4 are hard to read because the font size is very small.</p></li>
    </ul>
    <p><b>Discussion</b></p>
    <ul>
      <li>
        <p>
          The authors were cautious when stating their conclusions/interpretations, and we believe this is a positive
          aspect of the work. This is acknowledged in the title by the use of the word “Perspective”. They acknowledge
          the lack of strong correlations between the variables studied, while at the same time recognizing the
          potential importance of the outlier data for their interpretation.
        </p>
      </li>
      <li><p>Greater discussion of what (if anything) changed pre and post-COVID is recommended.</p></li>
      <li>
        <p>
          The discussion will benefit by including more socioeconomic variables that could describe better the
          population under study.
        </p>
      </li>
      <li>
        <p>
          Regarding the discussion of results, a comparison with other studies with similar goals could add some
          perspective on the results obtained by the authors.
        </p>
      </li>
      <li>
        <p>
          It is appreciated that the authors mention cofounding factors in the limitations section, they should consider
          including this in the discussion section as well.
        </p>
      </li>
    </ul>
    <p><b>Additional comments</b></p>
    <ul>
      <li><p>Typo on Page “on educationor” the “or” should be separated.</p></li>
      <li>
        <p>
          Generally to improve the overall professionalism of the manuscript we recommend conducting a thorough check
          for spelling errors, utilizing tools like Grammarly or similar software for assistance.
        </p>
      </li>
      <li>
        <p>
          As this preprint might be interesting to many stakeholders, then the authors might make it easier to
          understand for a broader audience. For example, providing a plain text summary.
        </p>
      </li>
    </ul>
    <p><b>Concluding remarks</b></p>
    <p>
      We thank the authors of the preprint for posting their work openly for feedback. We also thank all participants of
      the Live Review for their time and for engaging in the lively discussion that generated this review.
    </p>

    <h2>Competing interests</h2>

    <p>The authors declare that they have no competing interests.</p>`,
} satisfies Prereview

const prereview4 = {
  id: 10779310,
  authors: {
    named: [
      { name: 'James Fraser', orcid: Orcid('0000-0002-5080-2859') },
      { name: 'Luisa Vasconcelos', orcid: Orcid('0000-0003-2016-5606') },
      { name: 'Liyi Cheng', orcid: Orcid('0000-0002-5708-7835') },
      { name: 'Samantha  Lish', orcid: Orcid('0000-0003-0060-1458') },
      { name: 'S. Chan Baek', orcid: Orcid('0009-0004-3002-8888') },
      { name: 'Lang Ding', orcid: Orcid('0000-0002-5365-9445') },
      { name: 'Alexandra Probst', orcid: Orcid('0000-0001-8389-8159') },
      { name: 'Naiya Phillips', orcid: Orcid('0000-0003-1836-5182') },
      { name: 'William Grubbe', orcid: Orcid('0000-0002-4933-2626') },
    ],
    anonymous: 3,
  },
  club: 'hhmi-training-pilot',
  language: 'en',
  text: html`<p>
      The SARS-CoV-2 virus has experienced tremendous selective pressure over the course of the global pandemic with
      variants of concern emerging that differ in terms of transmissibility, immunogenicity, and other properties. The
      major goal of this paper is to determine how sequence changes in the major determinant of these properties, the
      Spike protein, affect structure, abundance, and distribution of the virion. In contrast to most previous studies,
      which use purified Spike that isn’t anchored to the virus surface (or even a mimic of the virus surface or a
      biological environment), this study uses electron microscopy/tomography to visualize structures in a more native
      context. The major potential areas of improvement of the paper are the lack of quantitative comparisons to the
      “meta ensemble” of structures determined by other methods (single particle EM, X-ray, etc) and the limited
      discussion of the immune evasion properties of the variant structures with regard to antibody binding footprints.
      It ends with a potential mechanism for how the conformational equilibrium of certain conformations needed for
      fusion are favored by specific amino acid changes and argues, quite convincingly, that the insights from the
      <i>in situ</i> structures determined here are less biased in determining such changes. The manuscript therefore
      succeeds in its major goals - and points to complex interdependencies of different properties in evolution and not
      a single conformational coordinate as the result of the selective pressure.
    </p>
    <p>Major points:</p>
    <ul>
      <li>
        <p>
          The paper begins with some variation in Furin cleavage and is mostly concerned with structural analysis, but
          the link between the biochemical properties and the structural/flexibility parameters uncovered is unclear.
          Furthermore the acronym FPPR is only defined in the Supplementary Figure 1 and the potential importance of the
          proximal peptide needs a bit more introduction to enable the reader to follow the arguments in the paper.
        </p>
      </li>
      <li>
        <p>
          Figure 2d is very tantalizing and potentially shows a simple property that is changing through time. Given
          that the caveats of small n are already noted in the manuscript, more speculation about the figure’s
          interpretation could be interesting. It would be good to elaborate in that discussion beyond: “a comparative
          statistical analysis between strains was not performed, because we cannot take possible variation between
          virus preparations into account.“ For example, were there notable differences in the preparation?
        </p>
      </li>
      <li>
        <p>
          Figure 3 focuses on the trimeric structure and identifying key sites - however, it might be useful for colors
          to be consistent across figures 3a and 3b . This would make the domains easier to structurally identify, and
          help the reader to associate domains (cleavage site, NTD, RBD, etc.) with the interpretation of the next
          couple of figures.
        </p>
      </li>
      <li>
        <p>
          Figure 4 details the structural comparison among variants at the NTD and RBD. It appears that the authors used
          the same global structural alignment as in figure 3, which may not be the optimal choice to examine local
          structural variations because overall domain shifts may interfere with the comparison. In addition, no
          reference or PDB code was included for the reference structure with linoleic acid.
        </p>
      </li>
    </ul>
    <p>Minor point:</p>
    <ul>
      <li>
        <p>
          We are confused as to whether they use B.1 as WT interchangeably in the manuscript. More precision in word
          choice would avoid some confusion with the figure 1 legend as comparisons also mention WT. In the legend for
          figure 1, the stats reference comparisons to WT, but some only have B.1 and not WT labels.
        </p>
      </li>
      <li><p>coulombic potential density (or potential density or density) not electron density</p></li>
      <li><p>In figure 2c, consider adding a legend that specifies red is prefusion and black is postfusion.</p></li>
    </ul>

    <h2>Competing interests</h2>

    <p>The author declares that they have no competing interests.</p>`,
} satisfies Prereview

const prereview5 = {
  id: 10411168,
  authors: {
    named: [
      { name: 'Miguel Oliveira, Jr.', orcid: Orcid('0000-0002-0866-0535') },
      { name: 'Arthur Ronald Brasil Terto', orcid: Orcid('0000-0003-4806-4946') },
      { name: 'Cleber Ataíde', orcid: Orcid('0000-0002-9340-9977') },
      { name: 'Glayci Kelli Reis da Silva Xavier', orcid: Orcid('0000-0002-2934-4734') },
      { name: 'Kyvia Fernanda Tenório da Silva', orcid: Orcid('0000-0002-0509-3555') },
      { name: 'Marcelo Travassos da Silva', orcid: Orcid('0000-0002-5425-5071') },
      { name: 'Pedro Ricardo Bin', orcid: Orcid('0000-0002-7547-3430') },
    ],
    anonymous: 0,
  },
  club: 'language-club',
  language: 'pt',
  text: html`<p><b>Introdução</b></p>
    <p>
      Este parecer representa uma avaliação comunitária conduzida pelos membros do "Language Club", um clube de revisões
      de preprints do PreReview, que analisaram o preprint intitulado "Traduções de sinais de pontuação desacompanhados
      em HQs". Abaixo, compartilhamos nossas impressões gerais sobre o texto, comentários específicos sobre pontos
      relevantes e sugestões para os autores.
    </p>
    <p><b>Avaliação Geral</b></p>
    <p>
      O manuscrito “Traduções de sinais de pontuação desacompanhados em HQs” se enquadra na modalidade “relato de
      pesquisa” e tem como objetivo analisar os sinais de pontuação (exclamação, interrogação e reticências) que
      aparecem, em balões de fala, sem qualquer palavra que os acompanhe. Duas questões fundamentais guiam a proposta de
      pesquisa: a) se esses sinais de pontuação são os mesmos da versão original ou se são traduzidos, assim como as
      palavras; e b) se esses sinais têm um papel significativo nos quadrinhos, já que os desenhos por si só expressam o
      conteúdo dos balões de fala. A questão central que se coloca no trabalho é se os sinais de pontuação
      desacompanhados são entendidos pelos tradutores como imagens ou signos linguísticos.
    </p>
    <p>
      O título do manuscrito está relacionado à temática abordada no estudo, refletindo o escopo do trabalho. O resumo,
      por sua vez, é compreensível, sucinto e apresenta com clareza o objetivo do trabalho. As seções em que o
      manuscrito foi dividido são importantes para que o leitor compreenda o problema de pesquisa investigado, bem como
      para que compreenda o percurso analítico conduzido pela autora. A metodologia, embora necessite de mais detalhes,
      é um ponto forte do estudo. Ressalta-se a relevância da escolha metodológica para comparar as quatros versões das
      HQs em painel, pois permite que os dados sejam apresentados de uma forma que o leitor/tradutor interessado
      visualize e descreva com mais precisão as diferenças de uma tradução para outra.
    </p>
    <p>
      As imagens trazidas no manuscrito também são importantes para uma melhor compreensão da análise reportada no
      estudo. A análise qualitativa feita sobre os dados é adequada, permitindo uma compreensão lógica dos usos dos
      sinais de pontuação desacompanhados nos balões de fala, bem como das estratégias de uso desses sinais empregadas
      pelos tradutores. Um outro ponto positivo do trabalho é o fato de a autora ter selecionado um número razoável de
      sequências de painéis provenientes de diferentes traduções da obra examinada para a análise dos usos dos sinais de
      pontuação. Isso representa uma seleção cuidadosa de amostras de histórias em quadrinhos, permitindo generalizações
      mais fundamentadas. A análise mostra como a tradução afeta os balões de fala que representam os sinais de
      pontuação, o que constitui um achado importante para os estudos da linguagem. A autora propõe uma interpretação
      relevante para o uso de sinais de pontuação desacompanhados: os sinais de pontuação na escrita seriam equivalentes
      aos gestos que acompanham a fala. A autora propõe essa interpretação com base em uma hipótese dos estudos sobre o
      processamento de gestos, a Gesture-For-Conceptualization Hypothesis (Kita; Alibali; Chu, 2017).
    </p>
    <p>
      Há um ponto, porém, que, se contemplado, pode melhorar ainda mais a qualidade do artigo. Como as histórias em
      quadrinhos são um gênero textual híbrido por excelência, aprofundar a análise em aspectos ligados à interação
      entre textos verbal e não verbal em si pode fornecer pistas valiosas a respeito dos usos dos sinais de pontuação
      no contexto investigado. Em outras palavras, uma análise cuja abordagem também seja multimodal, destacando
      aspectos enunciativos presentes nas narrativas e examinando com mais detalhes a relação entre as modalidades de
      texto, pode contribuir para embasar a argumentação construída pela autora ao longo do texto: a de que os usos dos
      sinais de pontuação isoladamente em balões de fala têm função de marcação de modalidades enunciativas. Além disso,
      seria importante uma discussão mais detalhada sobre a linguagem das histórias em quadrinhos, de modo geral.
    </p>
    <p>
      As conclusões são respaldadas pelos dados analisados, e o texto, bem escrito e estruturado conforme as normas da
      ABNT, atende tanto a leitores especializados quanto não especializados na área de letras. O estudo propõe
      reflexões importantes para o tema que envolve a tradução de gêneros multimodais, confortando-o com a hipótese da
      morfologia visual de Murthy e Foulsham (2016). Além disso, o trabalho destaca a especificidade da tradução de HQs
      ao combinar elementos que agrega os planos verbal, não-verbal e tipográficos, o que apresenta uma complexidade
      intrínseca ao processo de tradução. A análise comparativa de 51 sequências de cenas em quadrinhos nas quatro
      línguas revela que as reticências não são usadas sem palavras, enquanto exclamação e interrogação aparecem apenas
      desacompanhadas em balões de fala.
    </p>
    <p>
      Pesquisas que tratam da temática dos usos dos sinais de pontuação em histórias em quadrinhos trazem grande
      contribuição para as áreas da linguística, semiótica, psicologia, pedagogia e áreas afins da educação que tenham
      interesse na análise comparativa das traduções de sinais de pontuações das línguas por intermédio do gênero
      textual quadrinho, detém uma linguagem multimodal, que integra imagens, palavras e pontuações. Além disso,
      fornecem insights sobre a linguagem e a comunicação específicas nas histórias em quadrinhos. Nesse gênero textual
      específico, onde a combinação de textos verbal e não verbal é essencial, as diferentes estratégias de usos dos
      sinais de pontuação influenciam (i) o ritmo da leitura e a entonação atribuída às falas das personagens; (ii) a
      construção de nuances linguísticas e estilísticas associadas ao contexto pragmático-discursivo reportado nas
      narrativas; e (iii) a criatividade e expressividade próprias desse gênero narrativo híbrido. Dada sua relevância,
      este manuscrito pode ser de interesse, portanto, de linguistas, linguistas aplicados, semioticistas, pesquisadores
      e profissionais da comunicação, estudiosos da literatura e professores da área de linguagens. Os públicos que
      trabalham com gêneros textuais, traduções, análise imagética e sinais de pontuações podem fazer uso desse artigo
      para futuras pesquisas e material de apoio em sala de aula.
    </p>
    <p><b>Comentários Pontuais</b></p>
    <ol>
      <li>
        <p>
          É essencial observar que o artigo se baseia em recortes do texto multimodal da revista de Asterix, o gaulês, e
          não no texto completo.
        </p>
      </li>
      <li>
        <p>
          É crucial revisar a articulação entre a seção quatro, "metáfora do gesto", e os resultados da pesquisa antes
          da publicação. A escolha teórica de empregar a metáfora do gesto contribui para entender que, por serem
          reescritos pelos tradutores, os sinais de reticência, exclamação e interrogação desacompanhados desempenham um
          papel similar aos gestos que acompanham a fala, sendo atos enunciativos que agregam unidades informacionais.
          Essa revisão antes da publicação permitirá uma melhor conexão entre a seção mencionada e os resultados,
          fortalecendo a argumentação e clareza do estudo.
        </p>
      </li>
      <li>
        <p>
          As conclusões estão coerentes com a proposta teórica de análise, porém uma discussão mais aprofundada da
          relação entre sinais de pontuação desacompanhados e os gestos que acompanham a fala seria bem-vinda para
          fortalecer as conclusões apresentadas. Por exemplo, quando a autora afirma que "tanto os gestos como os sinais
          de pontuação são metalinguísticos em sua natureza", não está esclarecida qual é a implicação teórica do uso de
          metalinguístico nesta sentença. Para os estudos da linguagem em uma perspectiva multimodal, os gestos podem
          ser compreendidos a partir de diferentes concepções. Por exemplo, para alguns cientistas da linguagem, gestos
          e linguagem integram um mesmo processo (Kendon, 2004; McNeill, 1992). Para outros, gestos e linguagem estão
          intimamente relacionados mas são resultado de processos diferentes (Kita, 2000; Krauss; Chen; Gottesman,
          2000).
        </p>
      </li>
      <li>
        <p>
          Rever as citações de de Chittolina (2020), Cohn (2013) e Kleppa (no prelo). Essas referências Não aparecem no
          corpo do texto ou na indicação das obras no final do artigo.
        </p>
      </li>
      <li><p>Indicar o ano de publicação de Dahlet.</p></li>
      <li>
        <p>
          Melhorar a qualidade das imagens e incluir a língua correspondente de cada cena traduzida na apresentação dos
          painéis.
        </p>
      </li>
      <li>
        <p>
          Na página 9. – “Outros sinais, como vírgulas, travessões ou aspas não são comumente usados sozinhos em balões
          de fala nos quadrinhos – não que não haja exemplos, mas são da ordem do irrepetível.” “Irrepetível” dá ideia
          de que ocorre uma única vez. Talvez colocaria algo como: “não que não haja exemplos, mas são pouco
          recorrentes”.
        </p>
      </li>
      <li>
        <p>
          Na página 7 – “O ato tradutório seria, conforme Derrida (apud SELIGMAN-SILVA, 2022, p. 269)”, está faltando
          uma vírgula após o fechamento dos parênteses.
        </p>
      </li>
    </ol>
    <p><b>Sugestões</b></p>
    <ol>
      <li>
        <p>
          Investigar as variações nas traduções dos sinais de pontuação acompanhados do sistema linguístico,
          considerando aspectos como prosódia, gramática e estilo do tradutor. Um exemplo: Por que no francês a
          onomatopeia “MIAM MIAM ASTERIX!...”não tem vírgulas para separar as palavras e é seguida de exclamação com
          reticências, já nas demais línguas a forma de pontuar se dá de forma diferente? Essa variação das traduções
          dos sinais de pontuação tem relação com a prosódia da língua ou com a gramática ou é estilo do tradutor?
        </p>
      </li>
      <li><p>Incluir uma nota explicativa sobre o que são HQs (quadrinhos) para leitores não especializados.</p></li>
      <li>
        <p>
          Apresentar mais dados no manuscrito além dos paineis que foram incluídos no trabalho. Uma possibilidade é
          compilar todos os dados analisados como material suplementar do artigo para que o corpus de análise esteja
          disponível para leitoras/es e pesquisadoras/es.
        </p>
      </li>
      <li><p>Consultar as normas de citação da ABNT atualizadas em 2023 para corrigir inconsistências.</p></li>
      <li>
        <p>
          Desenvolver mais o texto a respeito da linguagem utilizada pelas histórias em quadrinhos. O conceito de
          linguagem das histórias em quadrinhos pode ser mais explorado, assim como a forma de consumo.
        </p>
      </li>
      <li><p>Precisar o termo "morfologia visual", considerando sua importância teórica na pesquisa.</p></li>
      <li>
        <p>
          Revisar a articulação entre a seção quatro, "metáfora do gesto", e os resultados da pesquisa para fortalecer a
          argumentação.
        </p>
      </li>
    </ol>
    <p><b>Conclusão</b></p>
    <p>
      O manuscrito "Traduções de sinais de pontuação desacompanhados em HQs" oferece uma análise aprofundada e relevante
      sobre a presença e o impacto dos sinais de pontuação nos balões de fala de histórias em quadrinhos. Ao explorar a
      possibilidade de esses sinais serem traduzidos, assim como as palavras, e questionar sua função em um meio visual
      onde os desenhos por si só transmitem informações, a autora traz contribuições valiosas para a compreensão da
      linguagem multimodal das HQs.
    </p>
    <p>
      A metodologia, embora necessitando de aprimoramentos, destaca-se pela escolha criteriosa de comparar diferentes
      versões das HQs em painel, permitindo uma análise comparativa robusta. A interpretação proposta pela autora, que
      equipara os sinais de pontuação a gestos que acompanham a fala, apresenta uma abordagem inovadora e alinhada à
      teoria da Gesture-For-Conceptualization.
    </p>
    <p>
      Contudo, sugere-se uma ampliação na análise, explorando mais detalhadamente a interação entre o texto verbal e não
      verbal, adotando uma abordagem multimodal. Além disso, a discussão sobre a linguagem das HQs poderia ser mais
      aprofundada, oferecendo uma compreensão mais abrangente desse gênero narrativo híbrido.
    </p>
    <p>
      As conclusões, respaldadas pelos dados analisados, reforçam a relevância do estudo para áreas como linguística,
      semiótica, psicologia, pedagogia e educação, destacando a contribuição para o entendimento das traduções de
      gêneros multimodais. As sugestões apresentadas para aprimorar o manuscrito visam fortalecer a articulação teórica
      e oferecer uma visão mais abrangente da complexidade da linguagem nas histórias em quadrinhos.
    </p>
    <p>
      Em última análise, o trabalho não apenas enriquece o campo da tradução e estudos linguísticos, mas também abre
      novos horizontes para a compreensão da linguagem única e complexa das histórias em quadrinhos, contribuindo para o
      avanço do conhecimento em diversas disciplinas relacionadas à comunicação, linguagem e estudos culturais.
    </p>

    <h2>Competing interests</h2>

    <p>The author declares that they have no competing interests.</p>`,
} satisfies Prereview

const rapidPrereview1 = {
  author: { name: 'Alizée Malnoë', orcid: Orcid('0000-0002-8777-3174') },
  questions: {
    availableCode: 'na',
    availableData: 'no',
    coherent: 'yes',
    ethics: 'na',
    future: 'yes',
    limitations: 'yes',
    methods: 'yes',
    newData: 'yes',
    novel: 'yes',
    peerReview: 'yes',
    recommend: 'yes',
    reproducibility: 'yes',
  },
} satisfies RapidPrereview
