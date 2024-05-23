export type FieldId = (typeof fieldIds)[number]

export const fieldIds = [
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '20',
  '21',
  '22',
  '23',
  '24',
  '25',
  '26',
  '27',
  '28',
  '29',
  '30',
  '31',
  '32',
  '33',
  '34',
  '35',
  '36',
] as const

export function getFieldName(id: FieldId): string {
  return fieldNames[id]
}

export function isFieldId(value: string): value is FieldId {
  return (fieldIds as ReadonlyArray<string>).includes(value)
}

const fieldNames = {
  '11': 'Agricultural and Biological Sciences',
  '12': 'Arts and Humanities',
  '13': 'Biochemistry, Genetics and Molecular Biology',
  '14': 'Business, Management and Accounting',
  '15': 'Chemical Engineering',
  '16': 'Chemistry',
  '17': 'Computer Science',
  '18': 'Decision Sciences',
  '19': 'Earth and Planetary Sciences',
  '20': 'Economics, Econometrics and Finance',
  '21': 'Energy',
  '22': 'Engineering',
  '23': 'Environmental Science',
  '24': 'Immunology and Microbiology',
  '25': 'Materials Science',
  '26': 'Mathematics',
  '27': 'Medicine',
  '28': 'Neuroscience',
  '29': 'Nursing',
  '30': 'Pharmacology, Toxicology and Pharmaceutics',
  '31': 'Physics and Astronomy',
  '32': 'Psychology',
  '33': 'Social Sciences',
  '34': 'Veterinary',
  '35': 'Dentistry',
  '36': 'Health Professions',
} satisfies Record<FieldId, string>
