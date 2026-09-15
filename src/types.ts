export type CivilStatus =
  | 'Soltera'
  | 'Casada'
  | 'Unión libre'
  | 'Divorciada'
  | 'Viuda'
  | 'Prefiero no decir';

export type ReferralSource =
  | 'Instagram'
  | 'Facebook'
  | 'Google'
  | 'Recomendación de alguien'
  | 'Recomendación médica'
  | 'Otro';

export type DocumentType = 'CC' | 'CE' | 'Pasaporte' | 'DNI' | 'Otro';

export interface PatientBasicInfo {
  fullName: string;
  documentType: DocumentType;
  documentNumber: string;
  birthDate: string;
  age: string;
  occupation: string;
  civilStatus: CivilStatus | '';
  referralSource: ReferralSource | '';
  referralOtherDetails: string;
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

export interface PatientWeightHistoryInfo {
  // Sub-sección 1: Tu peso y talla
  currentWeightKg: string;
  heightCm: string; // Talla / Estatura en cm
  lowestWeightSince18Kg: string;
  highestWeightSince18Kg: string;

  // Sub-sección 1.5: Trayectoria de peso y momentos clave de vida (Weight trajectory)
  weightTrajectoryMilestones?: WeightTrajectoryMilestone[];
  // Curva de peso a lo largo de la vida, dibujada por el paciente (gráfico interactivo)
  weightJourneyPoints?: WeightStagePoint[];
  // ¿En qué etapa de vida se estableció por primera vez el sobrepeso/obesidad?
  overweightOnsetStage?: LifeStageKey | '';

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
  weightMedicationsExperience?: string;
  weightMedicationsAdverseEffects?: string;

  // Sub-sección 4: Cirugía bariátrica
  hadBariatricSurgery: 'Sí' | 'No' | '';
  bariatricSurgeryTimeAgo?: string;

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
  'Evento cardiovascular a temprana edad (infarto / ACV)',
  'Síndrome de ovario poliquístico (SOP) o infertilidad (mujeres)',
] as const;

export type FamilyComorbidity = (typeof FAMILY_COMORBIDITIES_LIST)[number];

export interface ObesityFamilyMemberEntry {
  id: string;
  relationship: FamilyObesityMember | string;
  otherRelationship?: string;
  onsetAge: FamilyObesityOnsetAge | string;
  comorbidities: string[];
  otherComorbidities?: string;
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
] as const;

export type ObesogenicDrug = (typeof OBESOGENIC_DRUGS_LIST)[number];

export interface PatientHealthMapInfo {
  // Sub-sección 1: Antecedentes generales
  pathologicalHistory: string;
  pharmacologicalHistory: string;

  // Pregunta estructurada sobre fármacos obesogénicos
  takesObesogenicMedications?: 'Sí' | 'No' | '';
  selectedObesogenicDrugs?: string[]; // Lista seleccionable de fármacos obesogénicos
  otherMedicationsDetails?: string; // Campo para 'otros' medicamentos no listados

  surgicalHistory: string;
  hospitalHistory: string;
  toxicAllergicHistory: string;

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

  // Trastornos de la conducta alimentaria (TCA)
  hasEatingDisorderHistory: 'Sí' | 'No' | '';
  eatingDisorderDetails?: string;

  // Sub-sección 2: Antecedentes familiares
  familyHistory: FamilyHistoryCondition[];
  hasFamilyObesityHistory?: 'Sí' | 'No' | '';
  familyObesityMembers?: ObesityFamilyMemberEntry[];
  familyHistoryNotes?: string;
}

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

export interface MoodSleepHabitsInfo {
  stressLevel?: number; // 1 to 10
  bedtime?: string; // e.g. "23:00"
  wakeTime?: string; // e.g. "07:00"
  calculatedSleepHours?: number; // calculated hours e.g. 8
  dailyRoutineDescription?: string;
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

export interface FirestoreQuestionnaireDocument {
  id?: string;
  patientId: string;
  patientName: string;
  patientDocument: string;
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
  occupation?: string;
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
  highestWeightSince18Kg?: string;
  hasPreviousAttempts?: string;
  fluctuationCount?: string;
  regainSpeed?: string;
  previousMethods?: string;
  includedExercise?: string;
  restrictiveDiets?: string;
  usedWeightMedications?: string;
  weightMedicationsNames?: string;
  weightMedicationsExperience?: string;
  weightMedicationsAdverseEffects?: string;
  hadBariatricSurgery?: string;
  bariatricSurgeryTimeAgo?: string;
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
  appliesGynecoObstetric?: string;
  pregnanciesCount?: string;
  vaginalDeliveriesCount?: string;
  cesareanCount?: string;
  lossesCount?: string;
  cycleRegularity?: string;
  cycleDuration?: string;
  menarcheAge?: string;
  menopauseStage?: string;
  hasEatingDisorderHistory?: string;
  eatingDisorderDetails?: string;
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
