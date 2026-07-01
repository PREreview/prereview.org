/* eslint-disable no-comments/disallowComments */
import { Schema } from 'effect'

export type ClubId = typeof ClubIdSchema.Type

export const ClubIdSchema = Schema.Literal(
  '13e21570-0d1a-47f0-b378-b8c20776496a', // ASAPbio Cancer Biology Crowd
  'd3e62606-0367-44b9-8d52-b75e0e7e5ba7', // ASAPbio Cell Biology Crowd
  '2a6fde8a-ca6d-4647-a3ac-8d8fb4ae5f52', // ASAPbio Immunology Crowd
  '901dba75-ecad-41b8-92b0-1aab56a96e54', // ASAPbio Meta-Research Crowd
  '3e820d44-fdb3-4cba-aeb6-ac03fb23108e', // ASAPbio Metabolism Crowd
  '8ee46f04-af8f-49f9-bc1c-1d3e2602672d', // ASAPbio Microbiology Crowd
  '317d0a13-5a10-44fc-9bcd-fb548e01e9cb', // ASAPbio Neurobiology Crowd
  '2dfeb178-dc0b-4970-9cdb-36b60250b3c4', // Biophysics Probing Neuroscience Lab
  '0bb49906-085d-41ad-9787-9355356e624b', // Bio-Ed Preprint Review Community
  '950e0757-d7ec-45b1-abbb-d171a03e5344', // Open Science Community BioBío (OSCB)
  '2eba66eb-cdf0-4aae-996d-f42e75e0ad94', // Biomass and Biocatalysis Group
  '7bff827e-bbaa-4ac9-8607-056643d8e16a', // BioPeers SLU
  'c8a72b87-cf45-42f0-aa75-a83a0d90eb5f', // Biophysics Leipzig University
  'd341790c-1757-4c10-82fe-70acc5f95fa4', // Computational Biodiversity Science and Services
  'e977f760-48ba-4541-bb9f-fdcaef4bd05d', // IU Bloomington Biology
  'b5041f10-289d-4d39-9c25-b4bea5ff3027', // CARA: Critical Analysis of Research Articles Club
  '07f0572c-aaee-4b93-b6ab-8bdc78644991', // Club Comunidad Iberoamericana de Ciencia Abierta (CIbCA)
  '490a8fe4-9cda-4e51-bf50-9307cba39997', // DEVL Ecology & Evolution Club
  'f26cbe5a-fb0a-43e9-9118-03cfa9aa601d', // eLife Community Ambassadors
  'a671af6b-f14a-4b72-b66d-a76b0e8623f7', // EMERGE, A Matrix for Ethnographic Collaboration and Practice
  '3701c505-32ea-4176-83b6-05714803a121', // Etymos Analytica
  '4dbef4c4-3793-4a32-9837-3fa39a69188a', // Future of Research Communication and e-Scholarship (FORCE11)
  '206ef17f-c5f3-44d3-acee-ba9b1f8299e9', // HHMI Transparent and Accountable Peer Review Training Program
  '17248b36-7ba3-4fc2-b9c4-1edc10b57463', // IIB-Mar del Plata Argentina
  '2ff5d1d9-beef-4054-b311-cf0c40946767', // Intersectional Feminist Club
  '23256c4b-ad41-4c1e-a3de-0dd28ca5177f', // JMIR Publications
  'caee8a6e-eabc-4bcc-a579-05295a928688', // Kone Consult Journal Club
  '998f32b4-ced9-49f8-8042-ce8fe41e62ec', // Language Club
  'a50913a6-5c49-4ab0-8394-661b4224b06f', // Biology of Marine Invertebrates & Friends
  '46ed1601-a895-4703-9661-e06893017c5c', // MLC Research Review Club
  '0cb0b787-fd2c-4325-83fe-0ed28361fcc6', // Neuroden
  'f5e1bdba-2ccf-435c-9404-ff43f21d2397', // Neuroscience Student Association at UTD
  'a7933faf-6568-4884-87a1-483068a57a28', // Open Box Science
  '980658e9-e025-46ff-9cee-f46ff02fc3f8', // Open Science Community Iraqi (OSCI)
  '3c728f14-d22a-4704-8d16-203984c9b4bb', // Open Science Community Uruguay (OSCU)
  '25a3af44-1d6c-4605-a22f-97a47d051439', // Open Scholarship Initiative at Simon Fraser University
  'd7681876-2aaa-46eb-a7b7-7164e6f3b3ef', // OxPlants Preprint Club
  'f0c71aca-aa3f-4a64-934e-4013e6811049', // PhD Program in Biomedical Sciences, University of Padua
  '8b34f6be-b086-4e2c-878a-5c3b74218448', // Parasitology and Infectious Diseases
  '098981c2-aa2a-44ba-ba75-83e1b0b7fcb1', // Physical Education Preprint & Review Club
  'b18ebd46-b563-49fa-8dc0-033d8a8c6074', // Plant Biotechnology Club
  'b5f170f1-59e2-4f2b-8019-59aff327e9e0', // Plant Pathology & Genomics Preprint Club
  '4bfded37-5773-4cc0-a073-2ce05cdb939c', // Proteostasis and Cancer Team INSERM U1242
  'c485e5e6-3d53-4700-9734-e4ead74ee76d', // Review & Curate Network (RCN)
  '4f8076fc-2219-49fc-be5f-6682ca7cc009', // Reviewing Dental Articles Club
  '3f07d8f6-4fbf-47e6-849c-2c157b6535b6', // RR\ID Student Reviewer Club
  'ed1dca96-74c0-46ff-b29f-c900fd543d6d', // SFB1638 Membrane Remodelling
  'e9a18a97-f895-4872-a75f-78823b5fc99a', // SG Biofilms and Microbiome Club
  '292651fd-e6d6-45e4-a46a-42912396a269', // SNL Semantics
  'd90a3f87-607e-4da0-9c50-6de6992e118d', // SUN Bioinformatics Journal Club
  '2c5334ae-e361-48c3-bcca-6810c2f33cb4', // University of Surrey Microbiology Journal Club
  'e1919a60-4875-4925-83b2-6b381543ed07', // Translate Science
  'f0a5bcaf-8016-4c2e-92dd-b3a359329ead', // TSL Preprint Club
  '1013ab22-0917-4f34-adcb-7c8cf0eba463', // ZMBP Preprint Club
)
