export type CivilStatus =
  | 'Soltero/a'
  | 'Casado/a'
  | 'Unión libre'
  | 'Divorciado/a'
  | 'Viudo/a'
  | 'Prefiero no decir'
  | 'Soltera'
  | 'Casada'
  | 'Divorciada'
  | 'Viuda';

export type ReferralSource =
  | 'Instagram'
  | 'Facebook'
  | 'Google'
  | 'Recomendación de alguien'
  | 'Recomendación médica'
  | 'Otro';

export type DocumentType = 'CC' | 'CE' | 'Pasaporte' | 'DNI' | 'Otro';

export type PatientSex = 'Femenino' | 'Masculino' | '';

/**
 * Normalizes boolean or string Yes/No values safely across Firestore, local state, and drafts.
 */
export function normalizeYesNo(val: any): 'Sí' | 'No' | '' {
  if (val === true || val === 'true' || val === 'Sí' || val === 'si' || val === 'SI' || val === 'Si') {
    return 'Sí';
  }
  if (val === false || val === 'false' || val === 'No' || val === 'no' || val === 'NO') {
    return 'No';
  }
  return '';
}

export function isYesNoAnswered(val: any): boolean {
  return normalizeYesNo(val) !== '';
}

export type EthnicOrigin =
  | 'Mestizo(a)'
  | 'Afrodescendiente'
  | 'Indígena'
  | 'Blanco(a)'
  | 'Asiático(a)'
  | 'Otro'
  | 'Prefiero no decir';

export const ETHNIC_ORIGIN_OPTIONS: EthnicOrigin[] = [
  'Mestizo(a)',
  'Afrodescendiente',
  'Indígena',
  'Blanco(a)',
  'Asiático(a)',
  'Otro',
  'Prefiero no decir',
];

export type EducationLevel =
  | 'Primaria'
  | 'Bachillerato'
  | 'Técnico / Tecnológico'
  | 'Universitario'
  | 'Posgrado'
  | 'Ninguna';

export interface PatientBasicInfo {
  fullName: string;
  documentType: DocumentType;
  documentNumber: string;
  birthDate: string;
  age: string;
  occupation: string;
  educationLevel?: EducationLevel | '';
  civilStatus: CivilStatus | '';
  referralSource: ReferralSource | '';
  referralOtherDetails: string;
  sex: PatientSex;
  ethnicOrigin?: EthnicOrigin | '';
  phone: string;
  email: string;
}

export interface PatientMotivationInfo {
  consultationReason: string;
  expectedGoals: string;
  futureVision: string;
  currentObstacles: string;
}

export type WeightFluctuationCount =
  | '1 vez'
  | '2-3 veces'
  | '4-5 veces'
  | 'más de 5 veces'
  | 'no sabría decir';

export type WeightRegainSpeed =
  | 'en menos de 3 meses'
  | 'entre 3 y 6 meses'
  | 'entre 6 meses y 1 año'
  | 'más de 1 año'
  | 'no lo he recuperado';

export type TrajectoryShiftType =
  | 'subida'
  | 'bajada'
  | 'rebote'
  | 'estabilidad';

export interface WeightTrajectoryMilestone {
  id: string;
  stageOrAge: string;
  shiftType: TrajectoryShiftType;
  approxWeightOrChange?: string;
  triggers: string[];
  lifeContext: string;
  // Solo aplica cuando shiftType es 'bajada' o 'rebote': qué hizo el paciente
  // para lograr bajar de peso en ese momento de su vida.
  weightLossMethod?: string;
}

// Etapas de vida fijas usadas en el gráfico interactivo de trayectoria de peso
// y en la pregunta de "etapa de origen" del sobrepeso/obesidad.
export type LifeStageKey =
  | 'infancia'
  | 'adolescencia'
  | 'juventud'
  | 'adultez'
  | 'actualidad';

export interface WeightStagePoint {
  stage: LifeStageKey;
  // null = el paciente no marcó/recuerda un peso para esta etapa
  weightKg: number | null;
}

// Las 3 "rutas" de trayectoria de peso (guía ADA 2026 / anamnesis dirigida):
// cada patrón orienta hacia un enfoque clínico distinto.
export type WeightTrajectoryPattern =
  | 'ascenso_lento' // obesidad de toda la vida, se estableció temprano
  | 'salto_detonante' // subida repentina asociada a un evento/detonante
  | 'oscilaciones_repetidas' // ciclos de subida y bajada repetidos (yo-yo)
  | '';

export type WeightStigmaExperience = 'Sí' | 'No' | 'Prefiero no responder' | '';

export type WeightStigmaContext =
  | 'En consultorios médicos / con personal de salud'
  | 'En el trabajo'
  | 'En la familia'
  | 'Con amistades o pareja'
  | 'En redes sociales o medios'
  | 'En espacios públicos (calle, transporte, tiendas)'
  | 'Otro';

export type PreviousMethodOption =
  | 'Por mi cuenta'
  | 'Con acompañamiento de un profesional o coach'
  | 'Con apps o programas online'
  | 'Con grupos de apoyo';

export type ExerciseInAttempts = 'Sí' | 'No' | 'A veces';

export type WeightMedicationCurrentlyUsing =
  | 'Sí, lo uso actualmente'
  | 'No, lo suspendí'
  | '';

export type WeightMedicationDiscontinueReason =
  | 'Efectos secundarios'
  | 'Costo'
  | 'No vi resultados'
  | 'Alcancé mi meta'
  | 'Falta de disponibilidad'
  | 'Indicación médica'
  | 'Otro';

export const WEIGHT_MEDICATION_DISCONTINUE_REASONS: WeightMedicationDiscontinueReason[] = [
  'Efectos secundarios',
  'Costo',
  'No vi resultados',
  'Alcancé mi meta',
  'Falta de disponibilidad',
  'Indicación médica',
  'Otro',
];

export interface WeightMedicationItem {
  id: string;
  name: string;
  dose: string;
  currentlyUsing: WeightMedicationCurrentlyUsing;
  discontinueReasons: WeightMedicationDiscontinueReason[];
  discontinueOther?: string;
}

export interface PatientWeightHistoryInfo {
  // Sub-sección 1: Tu peso y talla
  currentWeightKg: string;
  heightCm: string; // Talla / Estatura en cm
  lowestWeightSince18Kg: string;
  lowestWeightAge?: string;
  lowestWeightDontRemember?: boolean;
  lowestWeightAgeDontRemember?: boolean;
  highestWeightSince18Kg: string;
  highestWeightAge?: string;
  highestWeightDontRemember?: boolean;
  highestWeightAgeDontRemember?: boolean;

  // Sub-sección 1.5: Trayectoria de peso y momentos clave de vida (Weight trajectory)
  weightTrajectoryMilestones?: WeightTrajectoryMilestone[];
  // Curva de peso a lo largo de la vida, dibujada por el paciente (gráfico interactivo)
  weightJourneyPoints?: WeightStagePoint[];
  // ¿En qué etapa de vida se estableció por primera vez el sobrepeso/obesidad?
  overweightOnsetStage?: LifeStageKey | '';
  // Si inició en la infancia: edad aproximada en años (alerta clínica si < 5 años para posible estudio genético)
  childhoodOnsetAge?: string;

  // Sub-sección 1.6: Las 4 preguntas guía ADA 2026 (tabla 3.4) — se usan
  // "tal cual" según la guía, distintas de simplemente preguntar el peso actual.
  // 1) Peso más alto como adulto -> highestWeightSince18Kg (ya existente)
  // 2) Peso más bajo -> lowestWeightSince18Kg (ya existente)
  // 3) Peso con el que se sintió mejor (NO es el peso ideal teórico — es una
  //    meta más realista y motivante, elegida por el propio paciente)
  feltBestWeightKg?: string;
  // 4) Qué se le dificulta hacer con su peso actual (funcionalidad, no estética)
  currentWeightDifficulty?: string;

  // Sub-sección 1.7: Patrón/ruta de la trayectoria de peso (ver WeightTrajectoryPattern)
  weightTrajectoryPattern?: WeightTrajectoryPattern;
  // Solo si el patrón es 'salto_detonante': qué evento asocia el paciente
  trajectoryDetonanteEvent?: string;

  // Sub-sección 1.8: Estigma de peso / determinantes sociales / trauma (ADA 2026)
  weightStigmaExperience?: WeightStigmaExperience;
  weightStigmaContexts?: WeightStigmaContext[];
  weightStigmaContextOtherDetails?: string;
  weightStigmaDetails?: string;

  // Sub-sección 2: Intentos previos
  hasPreviousAttempts: 'Sí' | 'No' | '';
  fluctuationCount?: WeightFluctuationCount | '';
  regainSpeed?: WeightRegainSpeed | '';
  previousMethods?: PreviousMethodOption[];
  includedExercise?: ExerciseInAttempts | '';
  restrictiveDiets?: 'Sí' | 'No' | '';
  restrictiveDietsDetails?: string;

  // Sub-sección 3: Medicamentos para el peso
  usedWeightMedications: 'Sí' | 'No' | '';
  weightMedicationsNames?: string;
  weightMedicationsDose?: string;
  weightMedicationsCurrentlyUsing?: WeightMedicationCurrentlyUsing;
  weightMedicationsDiscontinueReasons?: WeightMedicationDiscontinueReason[];
  weightMedicationsDiscontinueOther?: string;
  weightMedicationsList?: WeightMedicationItem[];
  weightMedicationsExperience?: string;
  weightMedicationsAdverseEffects?: string;

  // Sub-sección 4: Cirugía bariátrica
  hadBariatricSurgery: 'Sí' | 'No' | '';
  bariatricSurgeryTimeAgo?: string;
  bariatricPreOpWeightKg?: string;
  bariatricLowestWeightPostOpKg?: string;
  bariatricWeightRegain?: 'Sí' | 'No' | '';
  bariatricWeightRegainedKg?: string;

  // Sub-sección 5: Cirugías estéticas
  hadAestheticSurgery: 'Sí' | 'No' | '';
  aestheticSurgeryDetails?: string;
  aestheticSurgeryTimeAgo?: string;
}

export type FamilyHistoryCondition =
  | 'Obesidad'
  | 'Enfermedades cardiovasculares'
  | 'Diabetes'
  | 'Enfermedad tiroidea'
  | 'Cáncer'
  | 'Enfermedad renal';

export const FAMILY_OBESITY_MEMBERS = [
  'Madre',
  'Padre',
  'Hermano(a)',
  'Hermano',
  'Hermana',
  'Hijo(a)',
  'Hijo',
  'Hija',
  'Abuela materna',
  'Abuelo materno',
  'Abuela paterna',
  'Abuelo paterno',
  'Tío(a)',
  'Otro familiar',
] as const;

export type FamilyObesityMember = (typeof FAMILY_OBESITY_MEMBERS)[number];

export const FAMILY_OBESITY_ONSET_AGES = [
  'Desde la infancia / niñez',
  'En la adolescencia',
  'En la edad adulta',
  'No sabe con certeza',
] as const;

export type FamilyObesityOnsetAge = (typeof FAMILY_OBESITY_ONSET_AGES)[number];

export const FAMILY_COMORBIDITIES_LIST = [
  'Diabetes mellitus tipo 2',
  'Hipertensión arterial',
  'Dislipidemia (colesterol o triglicéridos elevados)',
  'Infarto / Ataque cardíaco',
  'Trombosis / ACV (Accidente cerebrovascular)',
  'Muerte súbita',
  'Síndrome de ovario poliquístico (SOP) o problemas de fertilidad',
] as const;

export type FamilyComorbidity = (typeof FAMILY_COMORBIDITIES_LIST)[number];

export interface ObesityFamilyMemberEntry {
  id: string;
  relationship: FamilyObesityMember | string;
  otherRelationship?: string;
  onsetAge: FamilyObesityOnsetAge | string;
  comorbidities: string[];
  comorbiditiesAges?: Record<string, string>;
  otherComorbidities?: string;
  otherComorbiditiesAge?: string;
}

export type MenopauseStage =
  | 'No estoy en perimenopausia ni menopausia'
  | 'Perimenopausia'
  | 'Menopausia'
  | '';

export type CycleRegularity =
  | 'Regulares'
  | 'Irregulares'
  | 'No menstruo actualmente (anticonceptivo / DIU / tratamiento)'
  | 'Ya no menstruo (menopausia / histerectomía)'
  | '';

export type ContraceptiveMethod =
  | 'Ninguno'
  | 'Pastillas anticonceptivas'
  | 'Inyección'
  | 'Implante subdérmico'
  | 'DIU de cobre'
  | 'DIU hormonal'
  | 'Preservativo'
  | 'Pomeroy (ligadura de trompas)'
  | 'Vasectomía de la pareja'
  | 'Otro';

export const CONTRACEPTIVE_METHODS: ContraceptiveMethod[] = [
  'Ninguno',
  'Pastillas anticonceptivas',
  'Inyección',
  'Implante subdérmico',
  'DIU de cobre',
  'DIU hormonal',
  'Preservativo',
  'Pomeroy (ligadura de trompas)',
  'Vasectomía de la pareja',
  'Otro',
];

export type PregnancyPlan =
  | 'Sí, en el próximo año'
  | 'Sí, más adelante'
  | 'No'
  | 'No estoy segura';

export const PREGNANCY_PLAN_OPTIONS: PregnancyPlan[] = [
  'Sí, en el próximo año',
  'Sí, más adelante',
  'No',
  'No estoy segura',
];

export const OBESOGENIC_DRUGS_LIST = [
  'Olanzapina',
  'Clozapina',
  'Quetiapina',
  'Risperidona',
  'Paroxetina',
  'Mirtazapina',
  'Amitriptilina',
  'Litio',
  'Valproato',
  'Gabapentina',
  'Pregabalina',
  'Prednisona',
  'Dexametasona',
  'Glibenclamida',
  'Glimepirida',
  'Gliclazida',
  'Glipizida',
  'Clorpropamida',
  'Tolbutamida',
  'Insulina',
  'Propranolol',
  'Metoprolol',
  'Bisoprolol',
  'Anticonceptivos hormonales (pastillas, inyección, implante, DIU hormonal)',
] as const;

export type ObesogenicDrug = (typeof OBESOGENIC_DRUGS_LIST)[number];

export interface PatientMedicationEntry {
  id: string;
  name: string;
  isCustom?: boolean;
  startMonth?: string;
  startYear?: string;
  dose?: string;
}

export interface PatientHealthMapInfo {
  // Sub-sección 1: Antecedentes generales
  pathologicalHistory: string;
  pharmacologicalHistory: string;

  // Pregunta estructurada sobre fármacos obesogénicos y habituales
  takesObesogenicMedications?: 'Sí' | 'No' | '';
  selectedObesogenicDrugs?: string[]; // Lista seleccionable de fármacos obesogénicos
  medicationEntries?: PatientMedicationEntry[]; // Detalle con fecha de inicio (mes/año) y dosis por cada medicamento
  otherMedicationsDetails?: string; // Campo para 'otros' medicamentos no listados u observaciones

  surgicalHistory: string;
  hospitalHistory: string;
  toxicAllergicHistory: string;

  // A) Alergias estructuradas
  hasDrugAllergies?: 'Sí' | 'No' | '';
  drugAllergiesDetails?: string; // ¿cuál y qué reacción tuviste?
  hasFoodAllergies?: 'Sí' | 'No' | '';
  foodAllergiesDetails?: string; // ¿cuál?

  // B) Salud ósea
  hasBoneFracturesAfter40?: 'Sí' | 'No' | '';
  boneFracturesDetails?: string; // cuál y a qué edad
  hasBoneDensitometry?: 'Sí' | 'No' | '';
  boneDensitometryYear?: string;
  boneDensitometryResult?: BoneDensitometryResult;

  // Antecedentes gineco-obstétricos estructurados
  appliesGynecoObstetric: 'Sí' | 'No' | '';
  pregnanciesCount?: string; // Gestaciones
  vaginalDeliveriesCount?: string; // Partos
  cesareanCount?: string; // Cesáreas
  lossesCount?: string; // Pérdidas / Abortos
  cycleRegularity?: CycleRegularity;
  cycleDuration?: string; // Cuánto duran
  menarcheAge?: string; // Fecha / edad en que se desarrolló
  menopauseStage?: MenopauseStage; // Perimenopausia o menopausia
  menopauseSymptoms?: string[]; // Síntomas asociados
  menopauseSymptomsOther?: string;

  // C) Terapia hormonal para la menopausia (solo si sexo femenino y en menopausia / perimenopausia)
  usesHormoneReplacementTherapy?: HormoneTherapyOption;
  hormoneReplacementTherapyDetails?: string; // cuál y desde cuándo

  // Preguntas gineco-obstétricas complementarias
  currentlyBreastfeeding?: 'Sí' | 'No' | '';
  contraceptiveMethod?: ContraceptiveMethod | '';
  contraceptiveMethodOther?: string;
  pregnancyPlan?: PregnancyPlan | '';

  // Trastornos de la conducta alimentaria (TCA)
  hasEatingDisorderHistory: 'Sí' | 'No' | '';
  eatingDisorderDetails?: string;

  // Hábitos: tabaco y alcohol
  smokingStatus?: SmokingStatus | '';
  smokingCigarettesPerDay?: string;
  smokingYears?: string;
  smokingQuitTimeAgo?: string;
  usesVape?: boolean;

  alcoholConsumption?: AlcoholConsumption | '';
  alcoholTypicalDrinksDetails?: string;

  // Sub-sección 2: Antecedentes familiares
  familyHistory: FamilyHistoryCondition[];
  hasFamilyObesityHistory?: 'Sí' | 'No' | '';
  familyObesityMembers?: ObesityFamilyMemberEntry[];
  familyHistoryNotes?: string;
}

export type BoneDensitometryResult = 'Normal' | 'Osteopenia' | 'Osteoporosis' | 'No sé' | '';

export const BONE_DENSITOMETRY_RESULTS: ('Normal' | 'Osteopenia' | 'Osteoporosis' | 'No sé')[] = [
  'Normal',
  'Osteopenia',
  'Osteoporosis',
  'No sé',
];

export type HormoneTherapyOption = 'Sí' | 'No' | 'La usé antes' | '';

export const HORMONE_THERAPY_OPTIONS: ('Sí' | 'No' | 'La usé antes')[] = [
  'Sí',
  'No',
  'La usé antes',
];

export type SmokingStatus =
  | 'Nunca he fumado'
  | 'Fumo actualmente'
  | 'Fumé pero ya lo dejé';

export type AlcoholConsumption =
  | 'No consumo'
  | 'Ocasionalmente (menos de 1 vez al mes)'
  | '1 a 4 veces al mes'
  | '2 a 3 veces por semana'
  | '4 o más veces por semana';

export interface BodyCategoryState {
  hasNoSymptoms: boolean;
  selectedChips: string[];
  skipped?: boolean;
}

export interface DigestiveHabitsInfo {
  stoolConsistency?: 'Líquidas / Acuosas' | 'Blandas / Pastosas' | 'Normales / Formadas' | 'Duras / Secas / En bolitas' | 'Variables (alterna duras y blandas)' | '';
  dailyBowelMovementCount?: string;
  takesLaxatives?: 'No' | 'Ocasionalmente' | 'Frecuentemente / A diario' | '';
  laxativeDetails?: string;
  hasDifficultyDefecating?: 'No, sin esfuerzo' | 'A veces me cuesta' | 'Sí, con esfuerzo o dolor frecuente' | '';
}

export type PHQ2Option =
  | 'Nunca'
  | 'Varios días'
  | 'Más de la mitad de los días'
  | 'Casi todos los días';

export const PHQ2_OPTIONS: PHQ2Option[] = [
  'Nunca',
  'Varios días',
  'Más de la mitad de los días',
  'Casi todos los días',
];

export function getPHQ2OptionScore(option?: string | null): number {
  switch (option) {
    case 'Nunca':
      return 0;
    case 'Varios días':
      return 1;
    case 'Más de la mitad de los días':
      return 2;
    case 'Casi todos los días':
      return 3;
    default:
      return 0;
  }
}

export function calculatePHQ2Score(littleInterest?: string | null, feelingDown?: string | null): number {
  return getPHQ2OptionScore(littleInterest) + getPHQ2OptionScore(feelingDown);
}

export interface PHQ2Screening {
  littleInterest?: PHQ2Option | '';
  feelingDown?: PHQ2Option | '';
  totalScore?: number; // 0 to 6
}

export type SleepQuality =
  | 'Muy buena'
  | 'Buena'
  | 'Regular'
  | 'Mala'
  | 'Muy mala';

export const SLEEP_QUALITY_OPTIONS: SleepQuality[] = [
  'Muy buena',
  'Buena',
  'Regular',
  'Mala',
  'Muy mala',
];

export interface StopApneaScreening {
  snoringLoudly?: 'Sí' | 'No' | ''; // S: Ronquido fuerte
  tiredDuringDay?: 'Sí' | 'No' | ''; // T: Cansancio / somnolencia diurna
  observedApnea?: 'Sí' | 'No' | ''; // O: Apneas observadas / ahogo al dormir
  highBloodPressure?: 'Sí' | 'No' | ''; // P: Presión arterial alta
  score?: number; // 0 to 4
}

export function calculateStopScore(screening?: StopApneaScreening | null): number {
  if (!screening) return 0;
  let count = 0;
  if (screening.snoringLoudly === 'Sí') count++;
  if (screening.tiredDuringDay === 'Sí') count++;
  if (screening.observedApnea === 'Sí') count++;
  if (screening.highBloodPressure === 'Sí') count++;
  return count;
}

export interface SleepAssessmentInfo {
  usualSleepHours?: string; // 1) ¿Cuántas horas duermes en una noche habitual?
  sleepQuality?: SleepQuality | ''; // 2) ¿Cómo calificarías la calidad de tu sueño?
  nightOrRotatingShift?: 'Sí' | 'No' | ''; // 3) ¿Trabajas en turnos nocturnos o rotativos?
  stopScreening?: StopApneaScreening; // 4) STOP Apnea Screening
}

export type StressSourceOption =
  | 'Trabajo'
  | 'Dinero'
  | 'Familia'
  | 'Pareja'
  | 'Salud'
  | 'Estudios'
  | 'Otro';

export const STRESS_SOURCES_LIST: StressSourceOption[] = [
  'Trabajo',
  'Dinero',
  'Familia',
  'Pareja',
  'Salud',
  'Estudios',
  'Otro',
];

export type ScreenTimeOption =
  | 'Menos de 1'
  | '1 a 2'
  | '2 a 4'
  | 'Más de 4'
  | '';

export const SCREEN_TIME_OPTIONS: ScreenTimeOption[] = [
  'Menos de 1',
  '1 a 2',
  '2 a 4',
  'Más de 4',
];

export type WhoCooksOption =
  | 'Yo'
  | 'Mi pareja'
  | 'Otro familiar'
  | 'Empleada del hogar'
  | 'Compramos hecho o domicilios'
  | 'Otro'
  | '';

export const WHO_COOKS_OPTIONS: WhoCooksOption[] = [
  'Yo',
  'Mi pareja',
  'Otro familiar',
  'Empleada del hogar',
  'Compramos hecho o domicilios',
  'Otro',
];

export type FoodSecurityWorryOption =
  | 'Nunca'
  | 'A veces'
  | 'Frecuentemente'
  | '';

export const FOOD_SECURITY_OPTIONS: FoodSecurityWorryOption[] = [
  'Nunca',
  'A veces',
  'Frecuentemente',
];

export type CommuteTimeOption =
  | 'Menos de 30 min'
  | '30 a 60 min'
  | '1 a 2 horas'
  | 'Más de 2 horas'
  | '';

export const COMMUTE_TIME_OPTIONS: CommuteTimeOption[] = [
  'Menos de 30 min',
  '30 a 60 min',
  '1 a 2 horas',
  'Más de 2 horas',
];

export interface MoodSleepHabitsInfo {
  stressLevel?: number; // 1 to 10 ('¿Qué tan estresado(a) te has sentido el último mes?')
  stressSources?: string[]; // Selección múltiple: Trabajo / Dinero / Familia / Pareja / Salud / Estudios / Otro
  stressSourcesOther?: string; // Especificación si marca 'Otro'
  
  screenTimeHours?: ScreenTimeOption; // '¿Cuántas horas al día pasas frente a pantallas fuera del trabajo (celular, TV, computador)?'
  
  whoCooksAtHome?: WhoCooksOption; // '¿Quién cocina habitualmente en tu casa?'
  whoCooksAtHomeOther?: string; // Especificación si marca 'Otro'
  foodSecurityWorry?: FoodSecurityWorryOption; // 'En el último año, ¿te ha preocupado que no alcance el dinero para la comida?'
  dailyCommuteTime?: CommuteTimeOption; // '¿Cuánto tiempo gastas al día en desplazamientos?'
  
  bedtime?: string; // e.g. "23:00"
  wakeTime?: string; // e.g. "07:00"
  calculatedSleepHours?: number; // calculated hours e.g. 8
  dailyRoutineDescription?: string;
  phq2?: PHQ2Screening;
  sleepAssessment?: SleepAssessmentInfo;
}

export interface PatientBodySymptomsInfo {
  general: BodyCategoryState;
  cardiovascular: BodyCategoryState;
  respiratory: BodyCategoryState;
  digestive: BodyCategoryState;
  digestiveHabits?: DigestiveHabitsInfo;
  skinHairHormones: BodyCategoryState;
  musclesJoints: BodyCategoryState;
  moodSleepMind: BodyCategoryState;
  moodSleepHabits?: MoodSleepHabitsInfo;
  additionalNotes?: string;
}

export interface MealMomentEntry {
  id: string;
  name: string; // e.g. "Desayuno", "Almuerzo", "Cena", "Snack", etc.
  time: string; // approximate time e.g. "08:00"
  foodAndDrinks: string; // what was eaten/drunk
  location: 'En casa' | 'En el trabajo o estudio' | 'Comida rápida o restaurante' | 'Para llevar' | '';
}

export interface PatientNutritionInfo {
  favoriteFoods: string;
  dislikedFoods: string;
  dietaryRestrictions: string[]; // Ninguna, Lactosa, Gluten, Vegetariana, Vegana, Alergia alimentaria, Otra
  dietaryRestrictionsOther?: string;
  dietaryAllergiesDetails?: string;
  
  dailyMealsTimeline: MealMomentEntry[];
  
  mealPreparationStyle: 'Cocino en casa la mayoría de las veces' | 'Llevo comida preparada de casa' | 'Como por fuera la mayoría de las veces' | 'Es una mezcla de todo lo anterior' | '';
  eatingOutFrequency: 'Casi nunca' | '1-2 veces por semana' | '3-4 veces por semana' | 'Casi a diario' | '';
  
  nutritionWeakSpots: string[]; // Antojos nocturnos, Comer por ansiedad o estrés, etc.
  nutritionWeakSpotsOther?: string;
  nutritionWeakSpotsNotes?: string;
  
  takesSupplements: 'Sí' | 'No' | '';
  supplementDetails?: string;
}

export interface PatientPhysicalActivityInfo {
  // Sub-sección 1: Tu movimiento diario
  dailyActivityType:
    | 'Sentada la mayor parte del día'
    | 'Sentada, pero me paro con frecuencia'
    | 'De pie la mayor parte del día'
    | 'Con desplazamientos y movimiento constante'
    | 'Trabajo físico intenso'
    | '';
  takesStairsFrequency:
    | 'Nunca o casi nunca'
    | 'A veces'
    | 'Frecuentemente'
    | 'Es parte de mi rutina diaria'
    | '';
  walksForTransport:
    | 'Casi nunca'
    | 'Pocas veces por semana'
    | 'Varias veces por semana'
    | 'Casi a diario'
    | '';
  hasStepTrackerDevice?:
    | 'Sí, en mi reloj inteligente o pulsera'
    | 'Sí, en mi celular (app de salud)'
    | 'No tengo forma de medirlo'
    | '';
  dailyStepsApprox?: string;
  dailySittingHours:
    | 'Menos de 4 horas'
    | 'Entre 4 y 8 horas'
    | 'Entre 8 y 12 horas'
    | 'Más de 12 horas'
    | '';

  // Sub-sección 2: Ejercicio estructurado
  doesStructuredExercise: 'Sí' | 'No' | '';
  exerciseTypes?: string[]; // Cardio, Pesas, Yoga, Deportes, Baile, Otro
  exerciseTypesOther?: string;
  exerciseWeeklyFrequency?: '1 día' | '2 días' | '3 días' | '4 días' | '5 días o más' | '';
  exerciseSessionDuration?: 'Menos de 30 min' | '30-45 min' | '45-60 min' | 'Más de 60 min' | '';
  exerciseIntensity?: 'Leve (puedo hablar sin esfuerzo)' | 'Moderada (me cuesta un poco hablar)' | 'Intensa (me cuesta mucho hablar)' | '';

  // Sub-sección 3: Tu motivación
  motivationStructuredExercise: number; // 1 to 5
  motivationDailyMovement: number; // 1 to 5
  movementBarriersOrConcerns?: string;
}

export interface UploadedLabFile {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
  downloadUrl?: string;
  storagePath?: string;
  description?: string; // "¿Qué examen es y de qué fecha?"
  uploadedAt?: string;
}

export type UserRole = 'doctora' | 'paciente';
export type UserStatus = 'invitado' | 'registrado';
export type PatientClinicalStatus = 'invitado' | 'cuenta creada' | 'cuestionario completado' | 'Formulario recibido';

export interface AppUser {
  id: string;
  email: string;
  nombre: string;
  rol: UserRole;
  estado: UserStatus;
  fechaCreacion?: string;
  fechaRegistro?: string;
  cuestionarioCompletado?: boolean;
  cuestionarioId?: string;
}

export interface PatientListItem {
  id: string;
  nombre: string;
  email: string;
  documento?: string;
  celular?: string;
  rol: 'paciente';
  estado: UserStatus;
  clinicalStatus: PatientClinicalStatus;
  fechaCreacion: string;
  fechaRegistro?: string;
  fechaEnvio?: string | null;
  invitationToken?: string;
  inviteLink?: string;
  cuestionarioCompletado: boolean;
  cuestionarioId?: string;
  cuestionarioUpdatedAt?: string;
  cuestionarioDriveLink?: string;
  cuestionarioStep?: number;
  isDirectSubmission?: boolean;
}

export interface InvitationDetails {
  id?: string;
  token: string;
  email: string;
  nombre: string;
  estado: UserStatus;
  valid: boolean;
}

export interface AuthResponse {
  success: boolean;
  user?: AppUser;
  token?: string;
  error?: string;
}

export interface FirestoreQuestionnaireDocument {
  id?: string;
  patientId: string;
  userId?: string | null;
  userEmail?: string | null;
  patientName: string;
  patientDocument: string;
  patientSex?: PatientSex | null;
  patientPhone?: string | null;
  status: 'en progreso' | 'completado';
  isSavedByPatient?: boolean;
  savedAt?: string | null;
  currentStep: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string | null;
  pdfUrl?: string | null;
  pdfUploadedAt?: string | null;
  driveFileId?: string | null;
  driveFileName?: string | null;
  driveWebViewLink?: string | null;
  driveFolderId?: string | null;
  driveUploadedAt?: string | null;
  banderas_revisar: {
    id: string;
    category: string;
    symptom: string;
    clinicalNote: string;
  }[];
  identificacion?: PatientBasicInfo | null;
  motivo_objetivos?: PatientMotivationInfo | null;
  relacion_peso?: PatientWeightHistoryInfo | null;
  mapa_salud?: PatientHealthMapInfo | null;
  revision_sistemas?: PatientBodySymptomsInfo | null;
  entrevista_dietetica?: PatientNutritionInfo | null;
  actividad_fisica?: PatientPhysicalActivityInfo | null;
  paraclinicos?: PatientLabExamsInfo | null;
  inbody?: PatientInBodyInfo | null;
}

export interface PatientLabExamsInfo {
  hasRecentLabs: 'Sí' | 'No' | '';
  files: UploadedLabFile[];
  notesOrFindings?: string; // "¿Algo que quieras contarnos sobre estos resultados?"
}

export interface ExtractedInBodyMetrics {
  pesoKg?: number | null;
  tallaCm?: number | null;
  porcentajeGrasaCorporal?: number | null;
  masaGrasaCorporalKg?: number | null;
  masaMuscularEsqueleticaKg?: number | null;
  masaLibreDeGrasaKg?: number | null;
  nivelGrasaVisceral?: number | null;
  aguaCorporalTotalLt?: number | null;
  imc?: number | null;
  tasaMetabolicaBasalKcal?: number | null;
  relacionCinturaCadera?: number | null;
  puntuacionInBody?: number | null;
  fechaExamen?: string | null;
  modeloEquipo?: string | null;
  observacionesClinicas?: string | null;
  extractedAt?: string;
  sourceFileName?: string;
}

export interface PatientInBodyInfo {
  hasInBodyReport: 'Sí' | 'No' | '';
  files: UploadedLabFile[];
  testDateOrCenter?: string; // Fecha y/o lugar del examen
  knownMetrics?: string; // Por ejemplo % grasa, masa muscular, peso
  notesOrGoals?: string; // Comentarios adicionales sobre composición corporal
  extractedMetrics?: ExtractedInBodyMetrics | null; // Extracción automática inteligente
}

export interface StepNineErrors {
  hasRecentLabs?: string;
  files?: string;
}

export interface StepInBodyErrors {
  hasInBodyReport?: string;
  files?: string;
}

export interface StepSevenErrors {
  dailyActivityType?: string;
  takesStairsFrequency?: string;
  walksForTransport?: string;
  dailySittingHours?: string;
  doesStructuredExercise?: string;
  exerciseTypes?: string;
  exerciseTypesOther?: string;
  exerciseWeeklyFrequency?: string;
  exerciseSessionDuration?: string;
  exerciseIntensity?: string;
  motivationStructuredExercise?: string;
  motivationDailyMovement?: string;
}

export interface StepSixErrors {
  favoriteFoods?: string;
  dislikedFoods?: string;
  dietaryRestrictions?: string;
  dietaryRestrictionsOther?: string;
  dietaryAllergiesDetails?: string;
  dailyMealsTimeline?: string;
  mealPreparationStyle?: string;
  eatingOutFrequency?: string;
  nutritionWeakSpots?: string;
  nutritionWeakSpotsOther?: string;
  takesSupplements?: string;
  supplementDetails?: string;
}

export interface StepOneErrors {
  fullName?: string;
  documentNumber?: string;
  birthDate?: string;
  age?: string;
  sex?: string;
  ethnicOrigin?: string;
  phone?: string;
  email?: string;
  occupation?: string;
  educationLevel?: string;
  civilStatus?: string;
  referralSource?: string;
  referralOtherDetails?: string;
}

export interface StepTwoErrors {
  consultationReason?: string;
  expectedGoals?: string;
  futureVision?: string;
  currentObstacles?: string;
}

export interface StepThreeErrors {
  currentWeightKg?: string;
  heightCm?: string;
  lowestWeightSince18Kg?: string;
  lowestWeightAge?: string;
  highestWeightSince18Kg?: string;
  highestWeightAge?: string;
  childhoodOnsetAge?: string;
  hasPreviousAttempts?: string;
  fluctuationCount?: string;
  regainSpeed?: string;
  previousMethods?: string;
  includedExercise?: string;
  restrictiveDiets?: string;
  usedWeightMedications?: string;
  weightMedicationsNames?: string;
  weightMedicationsDose?: string;
  weightMedicationsCurrentlyUsing?: string;
  weightMedicationsDiscontinueReasons?: string;
  weightMedicationsExperience?: string;
  weightMedicationsAdverseEffects?: string;
  hadBariatricSurgery?: string;
  bariatricSurgeryTimeAgo?: string;
  bariatricPreOpWeightKg?: string;
  bariatricLowestWeightPostOpKg?: string;
  bariatricWeightRegain?: string;
  bariatricWeightRegainedKg?: string;
  hadAestheticSurgery?: string;
  aestheticSurgeryDetails?: string;
  aestheticSurgeryTimeAgo?: string;
}

export interface StepFourErrors {
  pathologicalHistory?: string;
  pharmacologicalHistory?: string;
  takesObesogenicMedications?: string;
  surgicalHistory?: string;
  hospitalHistory?: string;
  toxicAllergicHistory?: string;
  hasDrugAllergies?: string;
  drugAllergiesDetails?: string;
  hasFoodAllergies?: string;
  foodAllergiesDetails?: string;
  hasBoneFracturesAfter40?: string;
  boneFracturesDetails?: string;
  hasBoneDensitometry?: string;
  boneDensitometryYear?: string;
  boneDensitometryResult?: string;
  appliesGynecoObstetric?: string;
  pregnanciesCount?: string;
  vaginalDeliveriesCount?: string;
  cesareanCount?: string;
  lossesCount?: string;
  cycleRegularity?: string;
  cycleDuration?: string;
  menarcheAge?: string;
  menopauseStage?: string;
  usesHormoneReplacementTherapy?: string;
  hormoneReplacementTherapyDetails?: string;
  currentlyBreastfeeding?: string;
  contraceptiveMethod?: string;
  contraceptiveMethodOther?: string;
  pregnancyPlan?: string;
  hasEatingDisorderHistory?: string;
  eatingDisorderDetails?: string;
  smokingStatus?: string;
  smokingCigarettesPerDay?: string;
  smokingYears?: string;
  smokingQuitTimeAgo?: string;
  alcoholConsumption?: string;
  alcoholTypicalDrinksDetails?: string;
  familyHistory?: string;
  hasFamilyObesityHistory?: string;
  familyObesityMembers?: string;
  familyHistoryNotes?: string;
}

export type FormErrors = StepOneErrors;

export interface StepItem {
  id: number;
  title: string;
  shortTitle: string;
  description: string;
  status: 'current' | 'upcoming' | 'completed';
}
