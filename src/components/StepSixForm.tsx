import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Utensils,
  Clock,
  Plus,
  Trash2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  MapPin,
  Sparkles,
  Heart,
  Pill,
  HelpCircle,
  Calendar,
  Layers,
  FileText,
} from 'lucide-react';
import {
  PatientNutritionInfo,
  MealMomentEntry,
  StepSixErrors,
} from '../types';
import { VelaIcon } from './VelaIcon';

interface StepSixFormProps {
  initialData?: PatientNutritionInfo;
  onBack: () => void;
  onContinue: (data: PatientNutritionInfo) => void;
}

const DIETARY_RESTRICTION_OPTIONS = [
  'Ninguna',
  'Lactosa',
  'Gluten',
  'Vegetariana',
  'Vegana',
  'Alergia alimentaria',
  'Otra',
];

const MEAL_PREP_OPTIONS: Array<PatientNutritionInfo['mealPreparationStyle']> = [
  'Cocino en casa la mayoría de las veces',
  'Llevo comida preparada de casa',
  'Como por fuera la mayoría de las veces',
  'Es una mezcla de todo lo anterior',
];

const EATING_OUT_OPTIONS: Array<PatientNutritionInfo['eatingOutFrequency']> = [
  'Casi nunca',
  '1-2 veces por semana',
  '3-4 veces por semana',
  'Casi a diario',
];

const WEAK_SPOTS_OPTIONS = [
  'Antojos nocturnos',
  'Comer por ansiedad o estrés',
  'Picoteo entre comidas',
  'Porciones grandes',
  'Comer muy rápido',
  'Falta de tiempo para cocinar',
  'Comidas rápidas o ultraprocesados',
  'Saltarme comidas',
  'Dulces o postres',
  'Otro',
];

const DEFAULT_INITIAL_MEALS: MealMomentEntry[] = [
  {
    id: 'meal-1',
    name: 'Desayuno',
    time: '08:00',
    foodAndDrinks: '',
    location: 'En casa',
  },
  {
    id: 'meal-2',
    name: 'Almuerzo',
    time: '13:00',
    foodAndDrinks: '',
    location: 'En casa',
  },
  {
    id: 'meal-3',
    name: 'Cena',
    time: '20:00',
    foodAndDrinks: '',
    location: 'En casa',
  },
];

export const StepSixForm: React.FC<StepSixFormProps> = ({
  initialData,
  onBack,
  onContinue,
}) => {
  const [formData, setFormData] = useState<PatientNutritionInfo>(() => {
    if (initialData) return initialData;
    const saved = localStorage.getItem('vela_step6_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing step 6 draft', e);
      }
    }
    return {
      favoriteFoods: '',
      dislikedFoods: '',
      dietaryRestrictions: ['Ninguna'],
      dietaryRestrictionsOther: '',
      dietaryAllergiesDetails: '',
      dailyMealsTimeline: DEFAULT_INITIAL_MEALS,
      mealPreparationStyle: '',
      eatingOutFrequency: '',
      nutritionWeakSpots: [],
      nutritionWeakSpotsOther: '',
      nutritionWeakSpotsNotes: '',
      takesSupplements: '',
      supplementDetails: '',
    };
  });

  const [errors, setErrors] = useState<StepSixErrors>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Auto-save draft in localStorage
  useEffect(() => {
    localStorage.setItem('vela_step6_data', JSON.stringify(formData));
  }, [formData]);

  const validate = (): boolean => {
    const errs: StepSixErrors = {};

    // 1. Favorite foods
    if (!formData.favoriteFoods.trim()) {
      errs.favoriteFoods = 'Por favor cuéntanos cuáles alimentos son tus favoritos.';
    }

    // 2. Disliked foods
    if (!formData.dislikedFoods.trim()) {
      errs.dislikedFoods = 'Por favor dinos qué alimentos no te gustan o prefieres evitar.';
    }

    // 3. Dietary restrictions
    if (!formData.dietaryRestrictions || formData.dietaryRestrictions.length === 0) {
      errs.dietaryRestrictions = 'Selecciona al menos una opción o marca "Ninguna".';
    } else {
      if (
        formData.dietaryRestrictions.includes('Otra') &&
        (!formData.dietaryRestrictionsOther || !formData.dietaryRestrictionsOther.trim())
      ) {
        errs.dietaryRestrictionsOther = 'Por favor especifica cuál es tu otra restricción.';
      }
      if (
        formData.dietaryRestrictions.includes('Alergia alimentaria') &&
        (!formData.dietaryAllergiesDetails || !formData.dietaryAllergiesDetails.trim())
      ) {
        errs.dietaryAllergiesDetails = 'Por favor indícanos a qué alimentos eres alérgica.';
      }
    }

    // 4. Meal prep style
    if (!formData.mealPreparationStyle) {
      errs.mealPreparationStyle = 'Selecciona cómo sueles resolver tus comidas.';
    }

    // 5. Eating out frequency
    if (!formData.eatingOutFrequency) {
      errs.eatingOutFrequency = 'Selecciona la frecuencia con la que comes por fuera.';
    }

    // 6. Weak spots "Otro"
    if (
      formData.nutritionWeakSpots?.includes('Otro') &&
      (!formData.nutritionWeakSpotsOther || !formData.nutritionWeakSpotsOther.trim())
    ) {
      errs.nutritionWeakSpotsOther = 'Por favor detalla tu otro punto débil.';
    }

    // 7. Supplements
    if (!formData.takesSupplements) {
      errs.takesSupplements = 'Indica si tomas algún suplemento actualmente.';
    } else if (
      formData.takesSupplements === 'Sí' &&
      (!formData.supplementDetails || !formData.supplementDetails.trim())
    ) {
      errs.supplementDetails = 'Por favor cuéntanos cuáles suplementos tomas y con qué frecuencia.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Toggle Dietary Restriction Chips
  const handleToggleDietaryRestriction = (option: string) => {
    setFormData((prev) => {
      let current = [...prev.dietaryRestrictions];

      if (option === 'Ninguna') {
        return {
          ...prev,
          dietaryRestrictions: ['Ninguna'],
          dietaryRestrictionsOther: '',
          dietaryAllergiesDetails: '',
        };
      }

      // If user clicks a specific restriction, remove "Ninguna"
      current = current.filter((item) => item !== 'Ninguna');

      if (current.includes(option)) {
        current = current.filter((item) => item !== option);
        if (current.length === 0) {
          current = ['Ninguna'];
        }
      } else {
        current.push(option);
      }

      return {
        ...prev,
        dietaryRestrictions: current,
      };
    });

    if (attemptedSubmit) {
      setErrors((prev) => ({ ...prev, dietaryRestrictions: undefined }));
    }
  };

  // Toggle Weak Spots Chips
  const handleToggleWeakSpot = (option: string) => {
    setFormData((prev) => {
      const current = [...prev.nutritionWeakSpots];
      const isSelected = current.includes(option);
      const next = isSelected
        ? current.filter((item) => item !== option)
        : [...current, option];

      return {
        ...prev,
        nutritionWeakSpots: next,
      };
    });
  };

  // Dynamic Meal Timeline Operations
  const handleAddMealMoment = () => {
    const newId = `meal-${Date.now()}`;
    const newEntry: MealMomentEntry = {
      id: newId,
      name: 'Snack / Momento',
      time: '16:00',
      foodAndDrinks: '',
      location: 'En casa',
    };

    setFormData((prev) => ({
      ...prev,
      dailyMealsTimeline: [...prev.dailyMealsTimeline, newEntry],
    }));
  };

  const handleRemoveMealMoment = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      dailyMealsTimeline: prev.dailyMealsTimeline.filter((meal) => meal.id !== id),
    }));
  };

  const handleUpdateMealMoment = (
    id: string,
    field: keyof MealMomentEntry,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      dailyMealsTimeline: prev.dailyMealsTimeline.map((meal) =>
        meal.id === id ? { ...meal, [field]: value } : meal
      ),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    if (validate()) {
      onContinue(formData);
    } else {
      const firstError = document.querySelector('[data-error="true"]');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header section */}
      <div className="space-y-3 text-center sm:text-left border-b border-[#E8E2D8] pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF3F0] text-[#5B887E] text-xs font-semibold self-start">
          <VelaIcon size={14} />
          <span>Paso 6 de 7 • Nutrición y hábitos alimentarios</span>
        </div>

        <div className="space-y-2">
          <h1
            className="text-2xl sm:text-3xl lg:text-4xl text-[#2E3A36] font-normal leading-tight"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Hablemos de tu alimentación
          </h1>
          <p className="text-sm sm:text-base text-[#5C6E68] max-w-2xl leading-relaxed">
            No hay juicios aquí. Mientras más honesta seas, mejor podemos ayudarte a construir un plan que realmente disfrutes y se adapte a tu vida.
          </p>
        </div>
      </div>

      {/* SUB-SECCIÓN 1: TUS PREFERENCIAS */}
      <div
        id="section-preferencias"
        className="bg-white/80 rounded-3xl p-5 sm:p-7 border border-[#AEC9C0]/40 shadow-2xs space-y-6"
      >
        <div className="flex items-center gap-2.5 pb-2 border-b border-[#FAF6F0]">
          <div className="w-8 h-8 rounded-xl bg-[#FDEEE9] text-[#C66A4D] flex items-center justify-center font-bold text-sm">
            <Heart className="w-4 h-4" />
          </div>
          <div>
            <h2
              className="text-lg text-[#2E3A36] font-medium"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Tus preferencias
            </h2>
            <p className="text-xs text-[#5C6E68]">Lo que te encanta, lo que evitas y tus particularidades alimentarias</p>
          </div>
        </div>

        {/* 1. Alimentos favoritos */}
        <div
          data-error={!!errors.favoriteFoods}
          className="space-y-2"
        >
          <label
            htmlFor="favoriteFoods-input"
            className="text-xs sm:text-sm font-semibold text-[#2E3A36] flex items-center justify-between"
          >
            <span>
              1. ¿Cuáles son los alimentos que más te gustan? <strong className="text-[#C66A4D]">*</strong>
            </span>
          </label>
          <p className="text-xs text-[#5C6E68]">
            Aquellos platos, ingredientes o sabores que te hacen feliz y no te gustaría eliminar.
          </p>
          <textarea
            id="favoriteFoods-input"
            rows={2}
            value={formData.favoriteFoods}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, favoriteFoods: e.target.value }));
              if (attemptedSubmit) setErrors((prev) => ({ ...prev, favoriteFoods: undefined }));
            }}
            placeholder="Ejemplo: Arepa con queso, aguacate, pasta con mariscos, frutas frescas, café en la mañana..."
            className={`w-full px-4 py-3 rounded-2xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-xs sm:text-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white resize-y ${
              errors.favoriteFoods ? 'border-[#F2A488] ring-1 ring-[#F2A488]' : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
            }`}
          />
          {errors.favoriteFoods && (
            <p className="text-xs text-[#C66A4D] font-medium flex items-center gap-1.5 pt-0.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.favoriteFoods}
            </p>
          )}
        </div>

        {/* 2. Alimentos que menos te gustan */}
        <div
          data-error={!!errors.dislikedFoods}
          className="space-y-2"
        >
          <label
            htmlFor="dislikedFoods-input"
            className="text-xs sm:text-sm font-semibold text-[#2E3A36] flex items-center justify-between"
          >
            <span>
              2. ¿Cuáles son los alimentos que menos te gustan o simplemente no comerías? <strong className="text-[#C66A4D]">*</strong>
            </span>
          </label>
          <p className="text-xs text-[#5C6E68]">
            Ingredientes que te disgustan, texturas que no toleras o alimentos que prefieres que no estén en tu menú.
          </p>
          <textarea
            id="dislikedFoods-input"
            rows={2}
            value={formData.dislikedFoods}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, dislikedFoods: e.target.value }));
              if (attemptedSubmit) setErrors((prev) => ({ ...prev, dislikedFoods: undefined }));
            }}
            placeholder="Ejemplo: Hígado, brócoli hervido, mariscos, cebolla cruda, berenjena..."
            className={`w-full px-4 py-3 rounded-2xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-xs sm:text-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white resize-y ${
              errors.dislikedFoods ? 'border-[#F2A488] ring-1 ring-[#F2A488]' : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
            }`}
          />
          {errors.dislikedFoods && (
            <p className="text-xs text-[#C66A4D] font-medium flex items-center gap-1.5 pt-0.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.dislikedFoods}
            </p>
          )}
        </div>

        {/* 3. Intolerancias o restricciones */}
        <div
          data-error={!!errors.dietaryRestrictions || !!errors.dietaryRestrictionsOther || !!errors.dietaryAllergiesDetails}
          className="space-y-3"
        >
          <label className="text-xs sm:text-sm font-semibold text-[#2E3A36] flex items-center justify-between">
            <span>
              3. ¿Tienes alguna intolerancia o restricción alimentaria? <strong className="text-[#C66A4D]">*</strong>
            </span>
            <span className="text-[11px] font-normal text-[#8E9E99]">Selección múltiple</span>
          </label>

          <div className="flex flex-wrap gap-2">
            {DIETARY_RESTRICTION_OPTIONS.map((opt) => {
              const isSelected = formData.dietaryRestrictions?.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  id={`chip-restriction-${opt.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => handleToggleDietaryRestriction(opt)}
                  className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-medium transition-all duration-150 flex items-center gap-2 cursor-pointer border ${
                    isSelected
                      ? opt === 'Ninguna'
                        ? 'bg-[#EBF3F0] text-[#477369] border-[#6E9E93] ring-2 ring-[#6E9E93]/20 font-semibold'
                        : 'bg-[#FDEEE9] text-[#C66A4D] border-[#F2A488] ring-2 ring-[#F2A488]/30 font-semibold'
                      : 'bg-white text-[#5C6E68] border-[#D9D3C8] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]/60'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      isSelected
                        ? opt === 'Ninguna'
                          ? 'bg-[#5B887E] border-[#5B887E] text-white'
                          : 'bg-[#F2A488] border-[#F2A488] text-white'
                        : 'border-[#C8C2B7] bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-2 h-2 stroke-[3]" />}
                  </div>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Conditional Input: Alergia alimentaria */}
          {formData.dietaryRestrictions?.includes('Alergia alimentaria') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-1 space-y-1"
            >
              <label htmlFor="dietaryAllergiesDetails-input" className="text-xs font-semibold text-[#C66A4D]">
                Especifica a qué alimento(s) tienes alergia: <strong className="text-[#C66A4D]">*</strong>
              </label>
              <input
                type="text"
                id="dietaryAllergiesDetails-input"
                value={formData.dietaryAllergiesDetails || ''}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, dietaryAllergiesDetails: e.target.value }));
                  if (attemptedSubmit) setErrors((prev) => ({ ...prev, dietaryAllergiesDetails: undefined }));
                }}
                placeholder="Ejemplo: Maní, frutos secos, mariscos, huevo..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#F2A488] text-[#2E3A36] text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#F2A488]/40"
              />
              {errors.dietaryAllergiesDetails && (
                <p className="text-xs text-[#C66A4D] flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.dietaryAllergiesDetails}
                </p>
              )}
            </motion.div>
          )}

          {/* Conditional Input: Otra restricción */}
          {formData.dietaryRestrictions?.includes('Otra') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-1 space-y-1"
            >
              <label htmlFor="dietaryRestrictionsOther-input" className="text-xs font-semibold text-[#5B887E]">
                Especifica tu otra restricción: <strong className="text-[#C66A4D]">*</strong>
              </label>
              <input
                type="text"
                id="dietaryRestrictionsOther-input"
                value={formData.dietaryRestrictionsOther || ''}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, dietaryRestrictionsOther: e.target.value }));
                  if (attemptedSubmit) setErrors((prev) => ({ ...prev, dietaryRestrictionsOther: undefined }));
                }}
                placeholder="Ejemplo: Kosher, Halal, baja en FODMAPs, sin cafeína..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D9D3C8] text-[#2E3A36] text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40"
              />
              {errors.dietaryRestrictionsOther && (
                <p className="text-xs text-[#C66A4D] flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.dietaryRestrictionsOther}
                </p>
              )}
            </motion.div>
          )}

          {errors.dietaryRestrictions && (
            <p className="text-xs text-[#C66A4D] font-medium flex items-center gap-1.5 pt-0.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.dietaryRestrictions}
            </p>
          )}
        </div>
      </div>

      {/* SUB-SECCIÓN 2: UN DÍA NORMAL DE PRINCIPIO A FIN (Línea de tiempo dinámica) */}
      <div
        id="section-diario-comidas"
        className="bg-white/80 rounded-3xl p-5 sm:p-7 border border-[#AEC9C0]/40 shadow-2xs space-y-6"
      >
        <div className="flex items-center gap-2.5 pb-2 border-b border-[#FAF6F0]">
          <div className="w-8 h-8 rounded-xl bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center font-bold text-sm">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2
              className="text-lg text-[#2E3A36] font-medium"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Un día normal de principio a fin
            </h2>
            <p className="text-xs text-[#5C6E68]">
              Cuéntanos qué comes en un día típico, desde que te levantas hasta que te acuestas. Agrega cada momento en el que comes o tomas algo.
            </p>
          </div>
        </div>

        {/* Dynamic Meals Timeline List */}
        <div className="space-y-4 relative">
          {/* Subtle vertical connecting line on desktop */}
          <div className="hidden sm:block absolute left-4.5 top-6 bottom-6 w-0.5 bg-[#E8E2D8]" />

          {formData.dailyMealsTimeline.map((meal, index) => (
            <motion.div
              key={meal.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#FAF6F0]/90 rounded-2xl p-4 sm:p-5 border border-[#D9D3C8] shadow-2xs relative sm:pl-12 space-y-3"
            >
              {/* Timeline marker icon on left */}
              <div className="hidden sm:flex absolute left-2.5 top-5 w-4.5 h-4.5 rounded-full bg-[#5B887E] text-white items-center justify-center text-[10px] font-bold shadow-xs">
                {index + 1}
              </div>

              {/* Header row: Editable title, Time picker, Remove button */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-[#E8E2D8]">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={meal.name}
                    onChange={(e) => handleUpdateMealMoment(meal.id, 'name', e.target.value)}
                    placeholder="Ej. Desayuno, Snack, Merienda..."
                    className="font-semibold text-xs sm:text-sm text-[#2E3A36] bg-transparent border-b border-dashed border-[#AEC9C0] hover:border-[#5B887E] focus:outline-hidden focus:border-[#5B887E] px-1 py-0.5"
                  />
                  <span className="text-[10px] text-[#8E9E99]">(haz clic para editar)</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Time picker */}
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-[#D9D3C8] text-xs font-medium text-[#2E3A36]">
                    <Clock className="w-3 h-3 text-[#5B887E]" />
                    <input
                      type="time"
                      value={meal.time}
                      onChange={(e) => handleUpdateMealMoment(meal.id, 'time', e.target.value)}
                      className="bg-transparent text-xs text-[#2E3A36] focus:outline-hidden cursor-pointer"
                    />
                  </div>

                  {/* Remove button */}
                  {formData.dailyMealsTimeline.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMealMoment(meal.id)}
                      className="p-1.5 rounded-lg text-[#8E9E99] hover:text-[#C66A4D] hover:bg-[#FDEEE9] transition-colors cursor-pointer"
                      title="Eliminar este momento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Food and drinks textarea */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#5C6E68]">
                  ¿Qué comiste o tomaste habitualmente?
                </label>
                <textarea
                  rows={2}
                  value={meal.foodAndDrinks}
                  onChange={(e) => handleUpdateMealMoment(meal.id, 'foodAndDrinks', e.target.value)}
                  placeholder={`Ejemplo: Café con leche de almendras, 2 huevos revueltos con espinaca y 1 tostada integral...`}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D9D3C8] text-[#2E3A36] placeholder-[#8E9E99] text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 resize-y"
                />
              </div>

              {/* Location choice buttons */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#5C6E68] flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#5B887E]" />
                  <span>¿Dónde suele ser este momento?</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(['En casa', 'En el trabajo o estudio', 'Comida rápida o restaurante', 'Para llevar'] as const).map(
                    (loc) => {
                      const isSel = meal.location === loc;
                      return (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => handleUpdateMealMoment(meal.id, 'location', loc)}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-medium border text-center transition-all cursor-pointer truncate ${
                            isSel
                              ? 'bg-[#5B887E] text-white border-[#5B887E] shadow-2xs font-semibold'
                              : 'bg-white text-[#5C6E68] border-[#D9D3C8] hover:border-[#6E9E93]'
                          }`}
                        >
                          {loc}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Add Meal Moment Button */}
        <div className="pt-1 flex justify-center">
          <button
            type="button"
            id="btn-add-meal-moment"
            onClick={handleAddMealMoment}
            className="px-5 py-2.5 rounded-2xl border-2 border-dashed border-[#6E9E93] text-[#477369] bg-[#EBF3F0]/60 hover:bg-[#EBF3F0] hover:border-[#5B887E] font-medium text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-2xs hover:shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#5B887E]" />
            <span>+ Agregar momento de comida o bebida</span>
          </button>
        </div>
      </div>

      {/* SUB-SECCIÓN 3: CÓMO COMES EN TU DÍA A DÍA */}
      <div
        id="section-habitos-diarios"
        className="bg-white/80 rounded-3xl p-5 sm:p-7 border border-[#AEC9C0]/40 shadow-2xs space-y-6"
      >
        <div className="flex items-center gap-2.5 pb-2 border-b border-[#FAF6F0]">
          <div className="w-8 h-8 rounded-xl bg-[#FAF6F0] text-[#5B887E] border border-[#E8E2D8] flex items-center justify-center font-bold text-sm">
            <Utensils className="w-4 h-4" />
          </div>
          <div>
            <h2
              className="text-lg text-[#2E3A36] font-medium"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Cómo comes en tu día a día
            </h2>
            <p className="text-xs text-[#5C6E68]">Logística de tus comidas y frecuencia de comer fuera</p>
          </div>
        </div>

        {/* 5. Cómo resuelves normalmente tus comidas */}
        <div
          data-error={!!errors.mealPreparationStyle}
          className="space-y-3"
        >
          <label className="text-xs sm:text-sm font-semibold text-[#2E3A36] flex items-center justify-between">
            <span>
              5. ¿Cómo resuelves normalmente tus comidas? <strong className="text-[#C66A4D]">*</strong>
            </span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {MEAL_PREP_OPTIONS.map((option) => {
              const isSelected = formData.mealPreparationStyle === option;
              return (
                <button
                  key={option}
                  type="button"
                  id={`btn-mealprep-${option?.slice(0, 15).toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, mealPreparationStyle: option }));
                    if (attemptedSubmit) setErrors((prev) => ({ ...prev, mealPreparationStyle: undefined }));
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-[#EBF3F0] text-[#477369] border-[#6E9E93] ring-2 ring-[#6E9E93]/20 font-semibold shadow-xs'
                      : 'bg-[#FAF6F0]/60 text-[#2E3A36] border-[#D9D3C8] hover:border-[#AEC9C0] hover:bg-white'
                  }`}
                >
                  <span className="text-xs sm:text-sm">{option}</span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-[#5B887E] border-[#5B887E] text-white' : 'border-[#C8C2B7] bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
          {errors.mealPreparationStyle && (
            <p className="text-xs text-[#C66A4D] font-medium flex items-center gap-1.5 pt-0.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.mealPreparationStyle}
            </p>
          )}
        </div>

        {/* 6. Frecuencia de comer fuera */}
        <div
          data-error={!!errors.eatingOutFrequency}
          className="space-y-3 pt-2"
        >
          <label className="text-xs sm:text-sm font-semibold text-[#2E3A36] flex items-center justify-between">
            <span>
              6. ¿Con qué frecuencia comes por fuera (restaurantes, domicilios, comida rápida)? <strong className="text-[#C66A4D]">*</strong>
            </span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {EATING_OUT_OPTIONS.map((freq) => {
              const isSelected = formData.eatingOutFrequency === freq;
              return (
                <button
                  key={freq}
                  type="button"
                  id={`btn-eatingout-${freq?.slice(0, 10).toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, eatingOutFrequency: freq }));
                    if (attemptedSubmit) setErrors((prev) => ({ ...prev, eatingOutFrequency: undefined }));
                  }}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#EBF3F0] text-[#477369] border-[#6E9E93] ring-2 ring-[#6E9E93]/20 font-semibold shadow-xs'
                      : 'bg-[#FAF6F0]/60 text-[#5C6E68] border-[#D9D3C8] hover:border-[#AEC9C0] hover:bg-white'
                  }`}
                >
                  <span className="text-xs sm:text-sm font-medium">{freq}</span>
                </button>
              );
            })}
          </div>
          {errors.eatingOutFrequency && (
            <p className="text-xs text-[#C66A4D] font-medium flex items-center gap-1.5 pt-0.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.eatingOutFrequency}
            </p>
          )}
        </div>
      </div>

      {/* SUB-SECCIÓN 4: TUS PUNTOS DÉBILES */}
      <div
        id="section-puntos-debiles"
        className="bg-white/80 rounded-3xl p-5 sm:p-7 border border-[#AEC9C0]/40 shadow-2xs space-y-6"
      >
        <div className="flex items-center gap-2.5 pb-2 border-b border-[#FAF6F0]">
          <div className="w-8 h-8 rounded-xl bg-[#FDEEE9] text-[#C66A4D] flex items-center justify-center font-bold text-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2
              className="text-lg text-[#2E3A36] font-medium"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Tus puntos débiles
            </h2>
            <p className="text-xs text-[#5C6E68]">Retos habituales para enfocar juntos las mejores estrategias</p>
          </div>
        </div>

        {/* 7. Puntos débiles chips */}
        <div
          data-error={!!errors.nutritionWeakSpotsOther}
          className="space-y-3"
        >
          <label className="text-xs sm:text-sm font-semibold text-[#2E3A36] flex items-center justify-between">
            <span>
              7. ¿Cuáles sientes que son tus puntos débiles con la alimentación?
            </span>
            <span className="text-[11px] font-normal text-[#8E9E99]">Selecciona todos los que apliquen</span>
          </label>

          <div className="flex flex-wrap gap-2.5">
            {WEAK_SPOTS_OPTIONS.map((spot) => {
              const isSelected = formData.nutritionWeakSpots?.includes(spot);
              return (
                <button
                  key={spot}
                  type="button"
                  id={`chip-weakspot-${spot.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => handleToggleWeakSpot(spot)}
                  className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm transition-all duration-150 flex items-center gap-2.5 cursor-pointer border ${
                    isSelected
                      ? 'bg-[#FDEEE9] text-[#C66A4D] border-[#F2A488] font-semibold shadow-xs ring-2 ring-[#F2A488]/30'
                      : 'bg-[#FAF6F0]/70 text-[#2E3A36] border-[#D9D3C8] hover:border-[#AEC9C0] hover:bg-white'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-[#F2A488] border-[#F2A488] text-white' : 'border-[#C8C2B7] bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span>{spot}</span>
                </button>
              );
            })}
          </div>

          {/* Conditional text if "Otro" is checked */}
          {formData.nutritionWeakSpots?.includes('Otro') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-2 space-y-1"
            >
              <label htmlFor="nutritionWeakSpotsOther-input" className="text-xs font-semibold text-[#C66A4D]">
                Especifica tu otro punto débil: <strong className="text-[#C66A4D]">*</strong>
              </label>
              <input
                type="text"
                id="nutritionWeakSpotsOther-input"
                value={formData.nutritionWeakSpotsOther || ''}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, nutritionWeakSpotsOther: e.target.value }));
                  if (attemptedSubmit) setErrors((prev) => ({ ...prev, nutritionWeakSpotsOther: undefined }));
                }}
                placeholder="Ejemplo: Como cuando estoy aburrida viendo TV, me cuesta parar cuando empiezo con pan..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#F2A488] text-[#2E3A36] text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#F2A488]/40"
              />
              {errors.nutritionWeakSpotsOther && (
                <p className="text-xs text-[#C66A4D] flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.nutritionWeakSpotsOther}
                </p>
              )}
            </motion.div>
          )}

          {/* Optional open text area for more details */}
          <div className="pt-3 space-y-1.5">
            <label
              htmlFor="nutritionWeakSpotsNotes-input"
              className="text-xs font-medium text-[#5C6E68] flex items-center gap-1.5"
            >
              <span>¿Quieres contarnos algo más sobre esto?</span>
              <span className="text-[11px] text-[#8E9E99] font-normal">(opcional)</span>
            </label>
            <textarea
              id="nutritionWeakSpotsNotes-input"
              rows={2}
              value={formData.nutritionWeakSpotsNotes || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, nutritionWeakSpotsNotes: e.target.value }))
              }
              placeholder="Siéntete libre de profundizar si hay situaciones específicas o emociones ligadas a la comida..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6F0]/80 border border-[#D9D3C8] text-[#2E3A36] placeholder-[#8E9E99] text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 resize-y hover:border-[#AEC9C0]"
            />
          </div>
        </div>
      </div>

      {/* SUB-SECCIÓN 5: SUPLEMENTOS */}
      <div
        id="section-suplementos"
        className="bg-white/80 rounded-3xl p-5 sm:p-7 border border-[#AEC9C0]/40 shadow-2xs space-y-6"
      >
        <div className="flex items-center gap-2.5 pb-2 border-b border-[#FAF6F0]">
          <div className="w-8 h-8 rounded-xl bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center font-bold text-sm">
            <Pill className="w-4 h-4" />
          </div>
          <div>
            <h2
              className="text-lg text-[#2E3A36] font-medium"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Suplementos
            </h2>
            <p className="text-xs text-[#5C6E68]">Vitaminas, minerales, colágeno, proteína u otros complementos</p>
          </div>
        </div>

        {/* 8. ¿Tomas suplementos actualmente? */}
        <div
          data-error={!!errors.takesSupplements || !!errors.supplementDetails}
          className="space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs sm:text-sm font-semibold text-[#2E3A36]">
              8. ¿Tomas algún suplemento actualmente (vitaminas, proteína, colágeno, etc.)? <strong className="text-[#C66A4D]">*</strong>
            </label>
            <div className="flex gap-2 self-start sm:self-auto">
              {(['No', 'Sí'] as const).map((val) => {
                const isSelected = formData.takesSupplements === val;
                return (
                  <button
                    key={val}
                    type="button"
                    id={`btn-supplements-${val.toLowerCase()}`}
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        takesSupplements: val,
                        supplementDetails: val === 'No' ? '' : prev.supplementDetails,
                      }));
                      if (attemptedSubmit) {
                        setErrors((prev) => ({
                          ...prev,
                          takesSupplements: undefined,
                          supplementDetails: undefined,
                        }));
                      }
                    }}
                    className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? val === 'Sí'
                          ? 'bg-[#5B887E] text-white border-[#5B887E] shadow-2xs font-semibold'
                          : 'bg-[#5C6E68] text-white border-[#5C6E68] shadow-2xs font-semibold'
                        : 'bg-[#FAF6F0] text-[#5C6E68] border-[#D9D3C8] hover:border-[#6E9E93]'
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>
          {errors.takesSupplements && (
            <p className="text-xs text-[#C66A4D] font-medium flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.takesSupplements}
            </p>
          )}

          {/* 9. Condicional: Si toma suplementos -> ¿Cuáles y con qué frecuencia? */}
          {formData.takesSupplements === 'Sí' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-2 space-y-2 bg-[#FAF6F0]/80 p-4 rounded-2xl border border-[#E8E2D8]"
            >
              <label
                htmlFor="supplementDetails-input"
                className="text-xs sm:text-sm font-semibold text-[#2E3A36]"
              >
                9. ¿Cuáles y con qué frecuencia? <strong className="text-[#C66A4D]">*</strong>
              </label>
              <textarea
                id="supplementDetails-input"
                rows={2}
                value={formData.supplementDetails || ''}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, supplementDetails: e.target.value }));
                  if (attemptedSubmit) setErrors((prev) => ({ ...prev, supplementDetails: undefined }));
                }}
                placeholder="Ejemplo: Vitamina D3 (2000 UI diarias), Magnesio citrato en la noche, Proteína de suero después de entrenar..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D9D3C8] text-[#2E3A36] placeholder-[#8E9E99] text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 resize-y hover:border-[#AEC9C0]"
              />
              {errors.supplementDetails && (
                <p className="text-xs text-[#C66A4D] font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.supplementDetails}
                </p>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Submission Validation Banner if errors exist */}
      {attemptedSubmit && Object.keys(errors).length > 0 && (
        <div className="p-4 rounded-2xl bg-[#FDEEE9] border border-[#F2A488] text-[#C66A4D] flex items-start gap-3 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#C66A4D]" />
          <div>
            <p className="font-semibold">Por favor completa los campos obligatorios</p>
            <p className="mt-0.5 text-xs text-[#C66A4D]/90">
              Revisa los campos marcados con asterisco (*) antes de continuar al siguiente paso.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="pt-2 pb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-[#AEC9C0] text-[#2E3A36] hover:bg-[#EBF3F0] font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer order-2 sm:order-1"
        >
          <ArrowLeft className="w-4 h-4 text-[#5B887E]" />
          <span>Atrás</span>
        </button>

        {/* Continue Button */}
        <button
          type="submit"
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-medium text-sm shadow-sm transition-all duration-200 flex items-center justify-center gap-2 order-1 sm:order-2 bg-[#6E9E93] hover:bg-[#5B887E] text-white cursor-pointer hover:shadow-md"
        >
          <span>Continuar</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};
