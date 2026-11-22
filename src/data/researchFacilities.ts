export interface ResearchFacilityDefinition {
  id: string;
  name: string;
  purpose: string;
  classification: 'PUBLIC' | 'RESTRICTED' | 'TOP SECRET';
}

export const RESEARCH_FACILITIES: ResearchFacilityDefinition[] = [
  { id: 'biology_lab', name: 'Biology Laboratory', purpose: 'Study infected creatures, tissue cultures and virus samples.', classification: 'RESTRICTED' },
  { id: 'medical_research', name: 'Medical Research Center', purpose: 'Develop medicines, vaccines and experimental treatments.', classification: 'RESTRICTED' },
  { id: 'meteor_lab', name: 'Meteor Research Lab', purpose: 'Analyse meteor fragments and anomalous materials.', classification: 'TOP SECRET' },
  { id: 'infection_testing', name: 'Infection Testing Chambers', purpose: 'Run controlled tests in sealed, monitored rooms.', classification: 'TOP SECRET' },
  { id: 'genetics_lab', name: 'Genetics Laboratory', purpose: 'Track mutations and infection evolution.', classification: 'TOP SECRET' },
  { id: 'sample_storage', name: 'Underground Sample Storage', purpose: 'Secure specimen vaults with independent cold storage.', classification: 'TOP SECRET' },
  { id: 'research_command', name: 'Research Command Center', purpose: 'Monitor experiments, alarms, access and facility security.', classification: 'RESTRICTED' },
  { id: 'scientist_quarters', name: 'Scientist Quarters', purpose: 'Provide offices, bedrooms, mess and staff facilities.', classification: 'PUBLIC' },
  { id: 'quarantine_ward', name: 'Quarantine Ward', purpose: 'Isolate exposed survivors for observation and treatment.', classification: 'RESTRICTED' },
  { id: 'secret_lab', name: 'Secret Underground Laboratory', purpose: 'Conceal the classified origin-of-outbreak programme.', classification: 'TOP SECRET' },
];
