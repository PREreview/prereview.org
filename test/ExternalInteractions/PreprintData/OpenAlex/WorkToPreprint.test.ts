import { FileSystem, Effect, Option, pipe, Schema } from 'effect'
import { NodeFileSystem } from '@effect/platform-node'
import { expect, it } from '../../../vitest.ts'
import { Temporal } from '@js-temporal/polyfill'
import { OpenAlex } from '../../../../src/ExternalApis/index.ts'
import { LanguageDetection } from '../../../../src/ExternalInteractions/index.ts'
import { workToPreprint } from '../../../../src/ExternalInteractions/PreprintData/OpenAlex/WorkToPreprint.ts'
import { rawHtml } from '../../../../src/html.ts'
import {
  AfricarxivFigsharePreprintId,
  AfricarxivOsfPreprintId,
  AfricarxivUbuntunetPreprintId,
  ArxivPreprintId,
  BiorxivPreprintId,
  ChemrxivPreprintId,
  EcoevorxivPreprintId,
  EdarxivPreprintId,
  EngrxivPreprintId,
  JmirPreprintId,
  MetaarxivPreprintId,
  OsfPreprintId,
  OsfPreprintsPreprintId,
  PreprintsorgPreprintId,
  PsyarxivPreprintId,
  PsychArchivesPreprintId,
  ResearchSquarePreprintId,
  ScieloPreprintId,
  SocarxivPreprintId,
  SsrnPreprintId,
  TechrxivPreprintId,
  VerixivPreprintId,
  ZenodoPreprintId,
  Preprint,
} from '../../../../src/Domain/Preprints/index.ts'
import { Doi } from '../../../../src/types/Doi.ts'
import { Name } from '../../../../src/types/Name.ts'
import { OrcidId } from '../../../../src/types/OrcidId.ts'

const readWork = (response: string) =>
  pipe(
    FileSystem.FileSystem,
    Effect.andThen(fs => fs.readFileString(`test/ExternalApis/OpenAlex/WorkSamples/${response}.json`)),
    Effect.andThen(Schema.decodeUnknownEffect(Schema.fromJsonString(OpenAlex.WorkSchema))),
  )

it.effect.each([
  {
    response: 'africarxiv-osf',
    id: new AfricarxivOsfPreprintId({ value: Doi('10.31730/osf.io/xq6jh') }),
    expected: Preprint({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>Background: We studied the incidence of and risk factors for various types of cancers in adolescents and young adults living with HIV (AYALWH) in South Africa between 2004 and 2014. Methods: We included individuals aged 15 to 24 years from the South African HIV Cancer Match study, a large cohort resulting from a linkage between HIV-related laboratory measurements from the National Health Laboratory Services and records from the National Cancer Registry. We computed incidence rates for the most common cancers. We assessed associations between these cancers and sex, age, calendar year, and CD4 cell count using Cox models and adjusted hazard ratios (aHR).Findings: We included 782,454 AYALWH (89% female). Of those, 867 developed incident cancer including 429 who developed Kaposi sarcoma, 107 non-Hodgkin lymphoma, 48 Hodgkin lymphoma, 45 cervical cancer, and 32 leukaemia. Kaposi sarcoma was more common in the 20-24 year age group than the 15-19 year age group (aHR 1.39, 95% CI 1.03-1.86). Male sex was associated with higher rates of Kaposi sarcoma (aHR 2.06, 95% CI 1.61-2.63), non-Hodgkin lymphoma (aHR 3.17, 95% CI 2.06-4.89), Hodgkin lymphoma (aHR 4.83, 95% 2.61-8.93), and leukaemia (aHR 5.90, 95% CI 2.87-12.1). Lower CD4 cell counts at baseline were associated with higher rates of Kaposi sarcoma, cervical cancer, non-Hodgkin and Hodgkin lymphoma.Interpretation: Infection-related cancers are the most common cancer types among AYALWH in South Africa. The burden of these cancers may be reduced through HPV vaccination, targeted HIV testing, early initiation of antiretroviral therapy, and improvement of treatment adherence.</p>',
        ),
      },
      authors: [
        { name: Name('Yann Ruffieux'), orcid: OrcidId('0000-0002-0891-2448') },
        { name: Name('Tafadzwa Dhokotera'), orcid: OrcidId('0000-0002-4353-0787') },
        { name: Name('Mazvita Molleen Muchengeti') },
        { name: Name('Lina Bartels'), orcid: OrcidId('0000-0003-1330-5885') },
        { name: Name('Victor Olago'), orcid: OrcidId('0000-0002-0154-0688') },
        { name: Name('Julia Bohlius'), orcid: OrcidId('0000-0003-1955-1585') },
        { name: Name('Elvira Singh'), orcid: OrcidId('0000-0003-1259-2122') },
        { name: Name('Matthias Egger'), orcid: OrcidId('0000-0001-7462-5132') },
        { name: Name('Eliane Rohner'), orcid: OrcidId('0000-0002-0554-2875') },
      ],
      id: new AfricarxivOsfPreprintId({ value: Doi('10.31730/osf.io/xq6jh') }),
      posted: Temporal.PlainDate.from('2021-07-15'),
      title: {
        language: 'en',
        text: rawHtml(
          'Cancer risk among adolescents and young adults living with HIV in South Africa: a national cohort study',
        ),
      },
      url: new URL('https://doi.org/10.31730/osf.io/xq6jh'),
    }),
  },
  {
    response: 'africarxiv-ubuntunet',
    id: new AfricarxivUbuntunetPreprintId({ value: Doi('10.60763/africarxiv/1417') }),
    expected: Preprint({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>This article comes from the research project "Transmission of Covid 19 in Senegal: analysis of the socio-spatial dynamics of the factors of propagation in the region of Dakar and the town of Touba", implemented by the LEIDI Laboratory of the Gaston Berger University from 2021 to 2022 (02 years). It analyses the problem of community perception of the COVID-19 pandemic and its evolution in the town of Touba. It takes stock of the factors involved in resistance to and denial of the disease, and of the occupational categories most affected (commerce and transport). The overall aim of the study is to contribute to a better understanding of the community dynamics that prevailed during the Covid 19 pandemic in the city of Touba. Specifically, the aim is to question community players about their perception of the disease, and then the characteristics that explain the spread of the pandemic, particularly in terms of trade and transport. The methodology is based on the overall methodology of the research project mentioned above. The tools of the Active Participatory Research Method were favoured because of their ability to capture socio-economic realities through focus groups, interviews and testimonials, which we combined with a survey of 500 individuals from different socio-professional categories. The main findings are that community-based approaches should be favoured to deal with pandemics and future epidemics. Community transmission is generally linked to the precarious living conditions of a population that is often hard-working and obliged to travel every day in search of daily expenses in places open to the public, notably markets and bus stations.</p>',
        ),
      },
      authors: [{ name: Name('TOURE, Mamadou Ndong') }],
      id: new AfricarxivUbuntunetPreprintId({ value: Doi('10.60763/africarxiv/1417') }),
      posted: Temporal.PlainDate.from('2023-10-05'),
      title: {
        language: 'fr',
        text: rawHtml('LA COVID 19 DANS LA VILLE DE TOUBA : DE LA RÉSISTANCE À LA RÉSILIENCE COMMUNAUTAIRE.'),
      },
      url: new URL('https://doi.org/10.60763/africarxiv/1417'),
    }),
  },
  {
    response: 'chemrxiv',
    id: new ChemrxivPreprintId({ value: Doi('10.26434/chemrxiv.12057846.v1') }),
    expected: Preprint({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>The current global crisis due to COVID-19 has almost brought normal life to standstill in most parts of the world. With our research interest on repurposing known drugs/drug candidates targeting various diseases, we decided to analyse the available data on the deadly pathogen that has already taken thousands of lives since its outbreak in China in December 2019. Our host institute is now shutdown and we are confining ourselves to our homes with limited access to computational resources. Using a simple in silico approach based on the principle of ‘neighbourhood behaviour’ in three-dimensional (3D) space and two-dimensional (2D) space of protein and small molecules respectively, we have identified potential drugs/drug candidates which can be repurposed against protein targets encoded by the SARS-CoV-2 genome. Based on our preliminary analysis, we have so far prioritized more than 20 known drugs/drug candidates which might elucidate anti-coronavirus properties by binding to main protease of the pathogen. These drugs belong to diverse therapeutic areas such as antiviral, anticancer, antibacterial agents etc. Notably, apart from many synthetic molecules, our analysis also hints that phytochemicals obtained from vinca plant (vinca alkaloids) and camptotheca tree (camptothecin and its derivatives) have the potential to bind to main protease of SARS-CoV-2. In-depth investigation on our findings are currently on-going. Here we are presenting the results we obtained so far. The sole purpose of making these preliminary findings openly available to the community is for the experimental biologists and biomedical researchers to investigate our predictions in experimental set ups and for the clinicians to evaluate the potential of these findings for anti-COVID-19 treatment. Our findings should only be used for research purposes and we strongly urge that no individual should interpret these findings for any self-diagnosis or self-medication without the prior approval from competent international health/medical regulatory agencies.</p>',
        ),
      },
      authors: [
        { name: Name('Sohini Chakraborti'), orcid: OrcidId('0000-0002-4591-2658') },
        { name: Name('Narayanaswamy Srinivasan'), orcid: OrcidId('0000-0002-6566-6239') },
      ],
      id: new ChemrxivPreprintId({ value: Doi('10.26434/chemrxiv.12057846.v1') }),
      posted: Temporal.PlainDate.from('2020-04-02'),
      title: {
        language: 'en',
        text: rawHtml(
          'Drug Repurposing Approach Targeted Against Main Protease of SARS-CoV-2 Exploiting ‘Neighbourhood Behaviour’ in 3D Protein Structural Space and 2D Chemical Space of Small Molecules',
        ),
      },
      url: new URL('https://doi.org/10.26434/chemrxiv.12057846.v1'),
    }),
  },
  {
    response: 'ecoevorxiv',
    id: new EcoevorxivPreprintId({ value: Doi('10.32942/x2rp4v') }),
    expected: Preprint({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>Background: Population structure and ancestry inference are routine in human genetics, yet remain inconvenient for non experts because canonical tools (PLINK, GCTA, ADMIXTURE) require command line expertise and careful data management.</p>',
        ),
      },
      authors: [{ name: Name('Joan Fibla'), orcid: OrcidId('0000-0002-3255-2227') }],
      id: new EcoevorxivPreprintId({ value: Doi('10.32942/x2rp4v') }),
      posted: Temporal.PlainDate.from('2022-10-28'),
      title: {
        language: 'en',
        text: rawHtml('BPGA: an interactive Shiny application for basic population genetic analysis of genotype data'),
      },
      url: new URL('https://doi.org/10.32942/x2rp4v'),
    }),
  },
  {
    response: 'edarxiv',
    id: new EdarxivPreprintId({ value: Doi('10.35542/osf.io/dhmwb_v1') }),
    expected: Preprint({
      abstract: {
        language: 'en',
        text: rawHtml(
          "<p>Predictive models are now embedded across education, flagging at-risk students and shaping the support they receive. Most fairness audits measure group disparity in the final prediction and then apply a fix, but this end-of-pipeline view cannot say where the unfairness originated or how far it travelled. We introduce Bias Provenance and Propagation (BPP), a measurement framework—not a new mitigation method—that treats disparity as a quantity with a source stage and a path through the machine-learning pipeline. Five stages (sampling, preprocessing, feature engineering, model training, evaluation) plus an exploratory simulation of distribution shift are placed on one threshold-independent scale, the Absolute Between-ROC Area (ABROCA), by projecting each stage's information through a single frozen reference model. Two derived measures form a bias ledger that records where fairness debt is incurred and repaid, each with a bootstrap confidence interval. Applied to the Open University Learning Analytics Dataset (32,593 records) on a leakage-free early-warning task, BPP shows that the origin of disparity is attribute-specific: for disability it is present in the raw data and attenuates once early assessment and registration features enter, whereas for sex/gender and deprivation it is introduced at feature engineering. Several pre-specified hypotheses were not supported—in particular, no universal origin stage exists (Kendall's W = 0.11)—and, tellingly, output-only post-processing reduces the operating-point gap while leaving ABROCA untouched. All observed disparities were modest, below our pre-specified 0.08 minimum effect of interest, so we frame them as consistent, stage-localised patterns rather than confirmed effects. BPP reframes fairness auditing as an accounting problem across stages, showing practitioners where a fix will actually pay off.</p>",
        ),
      },
      authors: [{ name: Name('MD ISLAM'), orcid: OrcidId('0009-0006-8813-6317') }],
      id: new EdarxivPreprintId({ value: Doi('10.35542/osf.io/dhmwb_v1') }),
      posted: Temporal.PlainDate.from('2026-07-30'),
      title: {
        language: 'en',
        text: rawHtml(
          'Tracing Fairness Disparities Across the Machine Learning Pipeline: A Stage-Resolved Bias Provenance and Propagation Framework for Educational Prediction',
        ),
      },
      url: new URL('https://doi.org/10.35542/osf.io/dhmwb_v1'),
    }),
  },
  {
    response: 'engrxiv',
    id: new EngrxivPreprintId({ value: Doi('10.31224/3866') }),
    expected: Preprint({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>The UN 2030 Agenda for Sustainable Development (SDGs) emphasizes addressing poverty, inequality, environmental sustainability, and economic growth. Artificial Intelligence (AI) has emerged as a pivotal technology capable of accelerating progress towards these goals. This perspective explores the potential of AI to address environmental, social, and ethical challenges related to the SDGs. The verdicts indicate that AI can significantly enhance healthcare, education, environmental protection, economic growth, and gender equality. Specific applications include renewable energy optimization, waste management, disease detection, personalized education, and the promotion of gender equality. The perspective also highlights the ethical concerns associated with AI development and deployment, such as algorithmic bias, data privacy breaches, and potential job displacement. To mitigate these risks and fully harness AI’s potential, the judgment recommends the implementation of intelligent automation governance systems, professional engagement, educational initiatives, and stringent regulatory frameworks. Achieving the SDGs through AI necessitates a comprehensive, ethical approach that fosters interdisciplinary research, public-private partnerships, AI literacy among the general populace, environmentally sustainable AI policies, and adherence to ethical standards. AI advancements that align with a people-centered, ethical framework for sustainability can significantly accelerate the achievement of the SDGs, paving the way for a more inclusive and equitable future.</p>',
        ),
      },
      authors: [
        { name: Name('Mirza Abdul Aleem Baig') },
        { name: Name('Jingchen Huang') },
        { name: Name('Jingzehua Xu'), orcid: OrcidId('0009-0007-2860-5203') },
      ],
      id: new EngrxivPreprintId({ value: Doi('10.31224/3866') }),
      posted: Temporal.PlainDate.from('2024-09-04'),
      title: {
        language: 'en',
        text: rawHtml('AI for United Nations Sustainable Development Goals'),
      },
      url: new URL('https://doi.org/10.31224/3866'),
    }),
  },
  {
    response: 'jmir',
    id: new JmirPreprintId({ value: Doi('10.2196/preprints.100170') }),
    expected: Preprint({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>BACKGROUND Wearable biosensors, remote physiologic monitoring, and patient-generated digital data are increasingly visible in pediatric cardiology, but their clinical use remains uneven. Pediatric cardiology clinics need practical guidance on which data streams have been studied, what clinical decisions they can support, and what safety, workflow, validation, and equity barriers must be addressed before routine integration. OBJECTIVE To map the literature on wearable biosensors and patient-generated digital data in pediatric cardiology and congenital heart disease, with emphasis on clinical applications, implementation pathways, validation, safety, and evidence gaps. METHODS A scoping review protocol was developed using the Population-Concept-Context framework and PRISMA-ScR reporting principles. Publicly accessible PubMed/MEDLINE, PubMed Central, and web-indexed searches were performed on May 3, 2026, with citation chasing of key background sources. Eligible records involved children, adolescents, young adults, or congenital heart disease populations and evaluated wearable biosensors, remote monitoring, mobile health tools, patient- or family-generated health data, or clinician-facing integration of digital data into pediatric cardiology workflows. RESULTS Thirty-five unique candidate records were screened. Twenty-two primary or clinically extractable records were mapped, with 11 additional background or source-mining records. Evidence clustered into single-ventricle interstage/home monitoring; high-risk congenital heart disease mobile health programs; telemedicine-linked monitoring; digital stethoscopes; smartwatch/mobile electrocardiography; cardiac implantable electronic device remote monitoring; and advanced wearable biomarker validation. The strongest clinical integration evidence was found in interstage single-ventricle monitoring and pediatric rhythm evaluation. Across categories, studies emphasized feasibility and diagnostic or workflow utility more often than long-term outcome effects, cost-effectiveness, interoperability, privacy, or equity. CONCLUSIONS Wearable biosensors and patient-generated digital data are most clinically actionable in pediatric cardiology when linked to a predefined clinical question, validated data stream, responsible reviewer, escalation threshold, and documentation pathway. Current evidence supports selective use in interstage congenital heart disease monitoring, arrhythmia capture, remote device surveillance, and telecardiology adjuncts, but routine broad deployment requires stronger pediatric validation, workflow design, safety standards, and equity-focused implementation research.</p>',
        ),
      },
      authors: [
        { name: Name('Abenezer Feleke Kebede'), orcid: OrcidId('0009-0002-4319-9921') },
        { name: Name('Ziad Chemaly'), orcid: OrcidId('0009-0007-1894-3954') },
        { name: Name('Maria Pestana') },
        { name: Name('Ana Aquino') },
        { name: Name('JUSTIN SCOTT GOUCHER') },
      ],
      id: new JmirPreprintId({ value: Doi('10.2196/preprints.100170') }),
      posted: Temporal.PlainDate.from('2026-05-03'),
      title: {
        language: 'en',
        text: rawHtml(
          'Clinical Integration of Wearable Biosensors and Patient-Generated Digital Data in Pediatric Cardiology: A Scoping Review (Preprint)',
        ),
      },
      url: new URL('https://doi.org/10.2196/preprints.100170'),
    }),
  },
  {
    response: 'osf',
    id: new OsfPreprintId({ value: Doi('10.17605/osf.io/cqf5t') }),
    expected: Preprint({
      abstract: {
        language: 'en',
        text: rawHtml('<p>Review of the development of human voice perception</p>'),
      },
      authors: [
        { name: Name('Lori L. Holt'), orcid: OrcidId('0000-0002-8732-4977') },
        { name: Name('Emily E. Harford'), orcid: OrcidId('0000-0001-8769-2238') },
        { name: Name('Taylor J. Abel') },
      ],
      id: new OsfPreprintId({ value: Doi('10.17605/osf.io/cqf5t') }),
      posted: Temporal.PlainDate.from('2023-01-01'),
      title: {
        language: 'en',
        text: rawHtml(
          'Unveiling the Development of Human Voice Perception: Neurobiological Mechanisms and Pathophysiology',
        ),
      },
      url: new URL('https://doi.org/10.17605/osf.io/cqf5t'),
    }),
  },
  {
    response: 'preprintsorg',
    id: new PreprintsorgPreprintId({ value: Doi('10.20944/preprints202304.0001.v1') }),
    expected: Preprint({
      abstract: {
        language: 'en',
        text: rawHtml(
          "<p>Background Obesity compromises the health of a woman's pregnancy and her newborn. Aim: To describe weight-gaining changes throughout pregnancy and evaluating outcomes for the mother and the baby. Methods A retrospective review of women who delivered singletons using Large Perinatal Registry. According to their BMI, patients were categorized into four categories: underweight, normal, overweight, and obese. Mode of delivery, gestational diabetes, hypertensive diseases, obstetric cholestasis, and postpartum hemorrhage were the main maternal outcome measures. The newborn outcome indicators were birth weight, NICU hospitalization, premature birth, and stillbirth. Results The study sample included 2,352 natives (25%) and 7,058 expatriates (75%). The majority of the sample (4726) were aged 20-29 years, 43.6% were aged 30-39 years, and 2.1% and 3.9% were aged 19 years and 40 years respectively. The incidence of hypertension, obstetric cholestasis, diabetes, postpartum hemorrhage, and cesarean section varied among the entire sample. In the underweight group, the incidence of CS was 15.7%, in the normal weight group (24.9%), in the overweight group (31.3%), and in the obese group (41%). Hypertensive disorders were 3 times more prevalent in obese women than in normal-weight women (2%), and 5.3% of obese women had PPH compared to 5. 6% of women of normal weight. The underweight groups gained the most weight during pregnancy, whereas the obese gained the least. Conclusions A significant proportion of pregnant women in our sample will become obese by the time of delivery. Obesity during pregnancy is associated with negative maternal and fetal outcomes.</p>",
        ),
      },
      authors: [
        { name: Name('Gamal Sayed'), orcid: OrcidId('0000-0001-7313-4518') },
        { name: Name('Husam Salama'), orcid: OrcidId('0000-0002-6595-5022') },
        { name: Name('Lina Abdullah') },
        { name: Name('Sawsan Al-Obaidly'), orcid: OrcidId('0000-0001-6058-3437') },
        { name: Name('Mai AlQubaisi') },
        { name: Name('Ashraf Mansour'), orcid: OrcidId('0000-0002-8765-0051') },
      ],
      id: new PreprintsorgPreprintId({ value: Doi('10.20944/preprints202304.0001.v1') }),
      posted: Temporal.PlainDate.from('2023-04-03'),
      title: {
        language: 'en',
        text: rawHtml(
          'The Pattern of Changes in Body Mass Index before and during Pregnancy: The Maternal and Neonatal Outcome',
        ),
      },
      url: new URL('https://doi.org/10.20944/preprints202304.0001.v1'),
    }),
  },
  {
    response: 'research-square',
    id: new ResearchSquarePreprintId({ value: Doi('10.21203/rs.3.rs-420780/v1') }),
    expected: Preprint({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>Abstract The COVID-19 pandemic has claimed the lives of millions of people. Vaccination is a critical tool for the control of transmission; however, the recent emergence of potentially vaccine-resistant variants renders it important to have a range of vaccines types. It is desirable that vaccines are safe, effective, easy to administer and store, and inexpensive to produce. Newcastle disease virus (NDV), responsible for respiratory disease in chickens, has no pathogenic homologue in humans. We developed two types of NDV-vectored candidate vaccines, and evaluated them in a SARS-CoV-2 challenge in hamsters. Vaccinations resulted in generation of neutralizing antibodies, prevented lung damage, and reduced viral load and viability. In conclusion, our NDV-based vaccine candidate performed well in a SARS-CoV-2 challenge and warrants evaluation in a Phase I human clinical trial. This candidate represents a promising tool in the fight against COVID-19.</p>',
        ),
      },
      authors: [
        { name: Name('Manolo Fernández‐Díaz'), orcid: OrcidId('0000-0001-6289-0270') },
        { name: Name('Katherine I. Calderón'), orcid: OrcidId('0000-0002-7461-8335') },
        { name: Name('Aldo Rojas-Neyra'), orcid: OrcidId('0000-0002-0053-9458') },
        { name: Name('Vikram N. Vakharia'), orcid: OrcidId('0000-0002-0955-3010') },
        { name: Name('Ricardo Choque-Guevara'), orcid: OrcidId('0000-0002-5926-1526') },
        { name: Name('Ángela Montalván-Ávalos'), orcid: OrcidId('0000-0001-6590-835X') },
        { name: Name('Astrid Poma-Acevedo'), orcid: OrcidId('0000-0002-9814-3821') },
        { name: Name('Dora Ríos-Matos'), orcid: OrcidId('0000-0002-9665-1515') },
        { name: Name('Andrés Agurto-Arteaga'), orcid: OrcidId('0000-0002-6881-8234') },
        { name: Name('Maria De Grecia Cauti Mendoza'), orcid: OrcidId('0000-0003-1982-2592') },
        { name: Name('Norma Pérez-Martínez') },
        { name: Name('Gisela Isasi-Rivas'), orcid: OrcidId('0000-0002-8417-7860') },
        { name: Name('Luis Tataje‐Lavanda'), orcid: OrcidId('0000-0003-4177-3125') },
        { name: Name('Yacory Sernaque-Aguilar') },
        { name: Name('Freddy Ygnacio'), orcid: OrcidId('0000-0003-2305-6130') },
        { name: Name('Manuel Criollo-Orozco'), orcid: OrcidId('0000-0001-6228-0405') },
        { name: Name('Edison Huaccachi-Gonzalez') },
        { name: Name('Elmer Delgado-Ccancce') },
        { name: Name('Doris Villanueva-Pérez'), orcid: OrcidId('0000-0001-8763-0379') },
        { name: Name('Ricardo Montesinos'), orcid: OrcidId('0000-0001-8747-7458') },
        { name: Name('Kristel Gutiérrez-Manchay') },
        { name: Name('Katherine Pauyac-Antezana') },
        { name: Name('Ingrid Ramirez-Ortiz') },
        { name: Name('Stefany Quiñones-García'), orcid: OrcidId('0000-0002-1266-1725') },
        { name: Name('Yudith Cauna-Orocollo'), orcid: OrcidId('0000-0002-4998-7171') },
        { name: Name('Katherine Vallejos-Sánchez'), orcid: OrcidId('0000-0002-2434-5244') },
        { name: Name('Angela A. Rios-Angulo'), orcid: OrcidId('0000-0002-3025-543X') },
        { name: Name('Dennis Fernandez'), orcid: OrcidId('0000-0001-5574-6967') },
        { name: Name('Mario I. Salguedo-Bohorquez'), orcid: OrcidId('0000-0003-4989-6680') },
        { name: Name('Julio Ticona') },
        { name: Name('Manolo Fernández-Sánchez'), orcid: OrcidId('0000-0001-7216-0669') },
        { name: Name('Eliana Icochea') },
        { name: Name('Luis A. Guevara-Sarmiento') },
        { name: Name('Mirko Zimic'), orcid: OrcidId('0000-0002-7203-8847') },
        { name: Name('COVID-19 Working Group in Perú.') },
      ],
      id: new ResearchSquarePreprintId({ value: Doi('10.21203/rs.3.rs-420780/v1') }),
      posted: Temporal.PlainDate.from('2021-04-27'),
      title: {
        language: 'en',
        text: rawHtml('Preclinical Evaluation of a Newcastle Disease Virus-Vectored Intranasal SARS-CoV-2 Vaccine'),
      },
      url: new URL('https://doi.org/10.21203/rs.3.rs-420780/v1'),
    }),
  },
  {
    response: 'scielo',
    id: new ScieloPreprintId({ value: Doi('10.1590/scielopreprints.6356') }),
    expected: Preprint({
      abstract: {
        language: 'pt',
        text: rawHtml(
          '<p>RESUMO: O presente estudo é uma revisão de literatura sobre o tema escolarização de pessoas trans. Trata-se de um levantamento das produções publicadas no período de 2015 a 2020 no Portal de Periódicos da Coordenação de Aperfeiçoamento de Pessoal de Nível Superior (CAPES) e na Scientific Electronic Library Online - (SciELO). Foi utilizado o rigor técnico do protocolo Prisma no processo de seleção do material analisado e 28 artigos foram selecionados e estudados na íntegra. Verifica-se a prevalência da abordagem qualitativa como método de estudo mais utilizado pelos investigadores da temática. Os resultados explicitam a preocupação dos pesquisadores com a falta de ações e efetividade das políticas públicas em fazer frente às violências que impedem um altíssimo número de pessoas trans de concluírem o percurso escolar. Além disso, apesar do significativo aumento no número de produções sobre escolarização de pessoas trans, ainda há carência de produção acerca da temática, sobretudo na área da psicologia.</p>',
        ),
      },
      authors: [
        { name: Name('Alessia Rodrigues Moura'), orcid: OrcidId('0000-0002-7859-9389') },
        { name: Name('Marlí Lúcia Tonatto Zibetti'), orcid: OrcidId('0000-0003-3939-5663') },
      ],
      id: new ScieloPreprintId({ value: Doi('10.1590/scielopreprints.6356') }),
      posted: Temporal.PlainDate.from('2023-07-05'),
      title: {
        language: 'pt',
        text: rawHtml('A ESCOLA PARA TODES? O QUE DIZEM OS ESTUDOS SOBRE EDUCAÇÃO DE PESSOAS TRANS'),
      },
      url: new URL('https://doi.org/10.1590/scielopreprints.6356'),
    }),
  },
  {
    response: 'ssrn',
    id: new SsrnPreprintId({ value: Doi('10.2139/ssrn.6030314') }),
    expected: Preprint({
      abstract: undefined,
      authors: [{ name: Name('Julian Rodriguez') }],
      id: new SsrnPreprintId({ value: Doi('10.2139/ssrn.6030314') }),
      posted: Temporal.PlainDate.from('2026-01-01'),
      title: {
        language: 'en',
        text: rawHtml(
          'Asymmetric Compliance: Behavioral Intent vs. Systemic Friction in the Era of AI-Driven IRS Collections',
        ),
      },
      url: new URL('https://doi.org/10.2139/ssrn.6030314'),
    }),
  },
  {
    response: 'techrxiv',
    id: new TechrxivPreprintId({ value: Doi('10.36227/techrxiv.177092213.38234529/v1') }),
    expected: Preprint({
      abstract: {
        language: 'en',
        text: rawHtml(
          "<p>The increasing reliance on lithium-ion batteries in Electric Vehicles (EVs) and energy storage systems demands accurate, real-time estimation of State of Charge (SOC) and State of Health (SOH). Conventional digital estimation methods such as Kalman Filters and machine-learning models provide high accuracy but require complex computation, expensive microcontrollers, and high power consumption. This project presents a hardware-efficient, analog-centric estimation system that performs both SOC and SOH analysis using low-power operational amplifier circuits. A Hybrid Coulomb Counting technique, combined with voltage-based correction, enables driftfree SOC tracking, while a pulse-based internal resistance measurement accurately detects battery degradation for SOH estimation. Cadence Virtuoso simulations validate the design's ability to distinguish healthy and degraded batteries through measurable voltage sag characteristics. The proposed approach significantly reduces system complexity, cost, and computational load, making it suitable for compact, real-time Battery Management Systems (BMS) in low-cost EVs and stationary energy storage applications.</p>",
        ),
      },
      authors: [
        { name: Name('H. N. Vidyasaraswathi') },
        { name: Name('Lakshmi C. R.') },
        { name: Name('Kruthika D. S.'), orcid: OrcidId('0009-0006-0773-8341') },
        { name: Name('Madhavi C.') },
      ],
      id: new TechrxivPreprintId({ value: Doi('10.36227/techrxiv.177092213.38234529/v1') }),
      posted: Temporal.PlainDate.from('2026-02-12'),
      title: {
        language: 'en',
        text: rawHtml('Design of a Hardware-Efficient SOC and SOH Estimator for Electric Vehicle Batteries'),
      },
      url: new URL('https://doi.org/10.36227/techrxiv.177092213.38234529/v1'),
    }),
  },
  {
    response: 'zenodo-deleted-preprint',
    id: new ZenodoPreprintId({ value: Doi('10.5281/zenodo.23105722') }),
    expected: Preprint({
      abstract: {
        language: 'en',
        text: rawHtml(
          "<p>Krause et al. (2018) argue that the presence of female signatories in peace agreements contributes to more durable peace. This study evaluates the reproducibility of their findings and critically examines the strengths and limitations of the underlying analysis. While only minor discrepancies were identified, the principal results are reproducible, and the data generally meet the key assumptions of the statistical models used. Nevertheless, the analysis reveals several limitations, including low statistical power and an imprecise specification of both theoretical and empirical estimands. These issues complicate the interpretation of the observed association between female signatories and peace durability, raising concerns about the causal inferences made by the original study. Additional empirical research is necessary to clarify the role of women's participation in peace processes.</p>",
        ),
      },
      authors: [{ name: Name('Lenka Olejníková'), orcid: OrcidId('0000-0002-0417-6009') }],
      id: new ZenodoPreprintId({ value: Doi('10.5281/zenodo.23105722') }),
      posted: Temporal.PlainDate.from('2026-10-02'),
      title: {
        language: 'en',
        text: rawHtml('Female Signatories and Peace Durability: Replicating Krause, Krause, and Bränfors (2018)'),
      },
      url: new URL('https://doi.org/10.5281/zenodo.23105722'),
    }),
  },
])('can parse an OpenAlex work ($response)', ({ response, id, expected }) =>
  Effect.gen(function* () {
    const actual = yield* pipe(readWork(response), Effect.andThen(workToPreprint(id)))

    expect(actual).toStrictEqual(expected)
  }).pipe(Effect.provide([NodeFileSystem.layer, LanguageDetection.layerCld])),
)

it.effect.each([
  ['africarxiv-figshare-merged', new AfricarxivFigsharePreprintId({ value: Doi('10.6084/m9.figshare.22904504.v1') })],
  ['arxiv-merged', new ArxivPreprintId({ value: Doi('10.48550/arxiv.2305.06746') })],
  ['biorxiv-merged', new BiorxivPreprintId({ value: Doi('10.64898/2026.02.22.705581') })],
  ['biorxiv-old-prefix-merged', new BiorxivPreprintId({ value: Doi('10.1101/2023.03.20.533560') })],
  ['metaarxiv-merged', new MetaarxivPreprintId({ value: Doi('10.31222/osf.io/xdekq') })],
  ['osf-preprints-merged', new OsfPreprintsPreprintId({ value: Doi('10.31219/osf.io/xb57u') })],
  ['psyarxiv-merged', new PsyarxivPreprintId({ value: Doi('10.31234/osf.io/7yzhd') })],
  ['psycharchives-merged', new PsychArchivesPreprintId({ value: Doi('10.23668/psycharchives.21242') })],
  ['socarxiv-merged', new SocarxivPreprintId({ value: Doi('10.31235/osf.io/k7reb') })],
  ['verixiv-merged', new VerixivPreprintId({ value: Doi('10.12688/verixiv.630.1') })],
] as const)('returns a specific error for a work merged into a published article (%s)', ([response, id]) =>
  Effect.gen(function* () {
    const actual = yield* pipe(readWork(response), Effect.andThen(workToPreprint(id)), Effect.flip)

    expect(actual._tag).toStrictEqual('NotAPreprint')
  }).pipe(Effect.provide([NodeFileSystem.layer, LanguageDetection.layerCld])),
)

const zenodoId = new ZenodoPreprintId({ value: Doi('10.5281/zenodo.23105722') })

it.effect('returns a specific error for a work without authors', () =>
  Effect.gen(function* () {
    const actual = yield* pipe(
      readWork('zenodo-deleted-preprint'),
      Effect.andThen(work => workToPreprint(zenodoId)({ ...work, authorships: [] })),
      Effect.flip,
    )

    expect(actual._tag).toStrictEqual('PreprintIsUnavailable')
  }).pipe(Effect.provide([NodeFileSystem.layer, LanguageDetection.layerCld])),
)

it.effect.each<[Option.Option<string>]>([[Option.none()], [Option.some('enc')]])(
  'detects the language when OpenAlex does not give a usable one (%s)',
  ([language]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        readWork('zenodo-deleted-preprint'),
        Effect.andThen(work => workToPreprint(zenodoId)({ ...work, language })),
      )

      expect(actual.title.language).toStrictEqual('en')
    }).pipe(Effect.provide([NodeFileSystem.layer, LanguageDetection.layerCld])),
)
