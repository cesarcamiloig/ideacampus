export interface CharacterizationCategory {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  hasActiveInitiatives?: boolean;
}

export interface AcademicPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}