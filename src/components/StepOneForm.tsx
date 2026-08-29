import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  CreditCard,
  Calendar,
  Briefcase,
  HeartHandshake,
  Compass,
  ArrowRight,
  Info,
  Check,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import {
  CivilStatus,
  ReferralSource,
  DocumentType,
  PatientBasicInfo,
  FormErrors,
} from '../types';
import { VelaIcon } from './VelaIcon';

interface StepOneFormProps {
  initialData?: PatientBasicInfo;
  onContinue: (data: PatientBasicInfo) => void;
}

const CIVIL_STATUS_OPTIONS: CivilStatus[] = [
  'Soltera',
  'Casada',
  'Unión libre',
  'Divorciada',
  'Viuda',
  'Prefiero no decir',
];

const REFERRAL_OPTIONS: ReferralSource[] = [
  'Instagram',
  'Facebook',
  'Google',
  'Recomendación de alguien',
  'Recomendación médica',
  'Otro',
];

const DOCUMENT_TYPES: DocumentType[] = ['CC', 'CE', 'Pasaporte', 'DNI', 'Otro'];

export const StepOneForm: React.FC<StepOneFormProps> = ({
  initialData,
  onContinue,
}) => {
  const [formData, setFormData] = useState<PatientBasicInfo>(() => {
    const saved = localStorage.getItem('vela_step1_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return (
      initialData || {
        fullName: '',
        documentType: 'CC',
        documentNumber: '',
        birthDate: '',
        age: '',
        occupation: '',
        civilStatus: '',
        referralSource: '',
        referralOtherDetails: '',
      }
    );
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSavedTime, setAutoSavedTime] = useState<string>('');

  // Persist form state automatically
  useEffect(() => {
    localStorage.setItem('vela_step1_data', JSON.stringify(formData));
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setAutoSavedTime(timeStr);
  }, [formData]);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // Helper to auto-calculate age when birth date changes
  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const bDate = e.target.value;
    let computedAge = formData.age;

    if (bDate) {
      const birth = new Date(bDate);
      const today = new Date();
      let ageYears = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        ageYears--;
      }
      if (ageYears >= 0 && ageYears <= 120) {
        computedAge = ageYears.toString();
      }
    }

    setFormData((prev) => ({
      ...prev,
      birthDate: bDate,
      age: computedAge,
    }));

    if (touched.birthDate) {
      validateField('birthDate', bDate);
    }
    if (touched.age && computedAge) {
      validateField('age', computedAge);
    }
  };

  const validateField = (field: keyof PatientBasicInfo, value: string): string => {
    switch (field) {
      case 'fullName':
        if (!value.trim()) return 'Por favor escribe tu nombre completo.';
        if (value.trim().split(' ').length < 2)
          return 'Por favor ingresa nombre y apellido.';
        return '';
      case 'documentNumber':
        if (!value.trim()) return 'Por favor ingresa tu número de identificación.';
        if (value.trim().length < 4) return 'El número ingresado parece incompleto.';
        return '';
      case 'birthDate':
        if (!value) return 'Por favor selecciona tu fecha de nacimiento.';
        return '';
      case 'age':
        if (!value.trim()) return 'Por favor indica tu edad.';
        const numAge = parseInt(value, 10);
        if (isNaN(numAge) || numAge < 10 || numAge > 120)
          return 'Ingresa una edad válida.';
        return '';
      case 'occupation':
        if (!value.trim()) return 'Por favor compártenos tu ocupación o actividad.';
        return '';
      case 'civilStatus':
        if (!value) return 'Por favor selecciona una opción de estado civil.';
        return '';
      case 'referralSource':
        if (!value) return 'Por favor selecciona cómo nos conociste.';
        return '';
      case 'referralOtherDetails':
        if (formData.referralSource === 'Otro' && !value.trim()) {
          return 'Cuéntanos brevemente cómo nos encontraste.';
        }
        return '';
      default:
        return '';
    }
  };

  const handleBlur = (field: keyof PatientBasicInfo) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errorMsg = validateField(field, formData[field] as string);
    setErrors((prev) => ({ ...prev, [field]: errorMsg }));
  };

  const handleChange = (
    field: keyof PatientBasicInfo,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const errorMsg = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: errorMsg }));
    }
  };

  // Check if step 1 is complete and valid
  const isFormComplete =
    formData.fullName.trim().length > 0 &&
    formData.documentNumber.trim().length > 0 &&
    formData.birthDate.length > 0 &&
    formData.age.trim().length > 0 &&
    formData.occupation.trim().length > 0 &&
    formData.civilStatus.length > 0 &&
    formData.referralSource.length > 0 &&
    (formData.referralSource !== 'Otro' || formData.referralOtherDetails.trim().length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all as touched
    const allTouched: Record<string, boolean> = {
      fullName: true,
      documentNumber: true,
      birthDate: true,
      age: true,
      occupation: true,
      civilStatus: true,
      referralSource: true,
      referralOtherDetails: formData.referralSource === 'Otro',
    };
    setTouched(allTouched);

    // Validate all
    const newErrors: FormErrors = {
      fullName: validateField('fullName', formData.fullName),
      documentNumber: validateField('documentNumber', formData.documentNumber),
      birthDate: validateField('birthDate', formData.birthDate),
      age: validateField('age', formData.age),
      occupation: validateField('occupation', formData.occupation),
      civilStatus: validateField('civilStatus', formData.civilStatus),
      referralSource: validateField('referralSource', formData.referralSource),
      referralOtherDetails: validateField(
        'referralOtherDetails',
        formData.referralOtherDetails
      ),
    };

    setErrors(newErrors);

    const hasAnyError = Object.values(newErrors).some((err) => Boolean(err));
    if (hasAnyError) {
      // Scroll smoothly to first error
      const firstErrorKey = Object.keys(newErrors).find((k) =>
        Boolean(newErrors[k as keyof FormErrors])
      );
      if (firstErrorKey) {
        const el = document.getElementById(`field-${firstErrorKey}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onContinue(formData);
    }, 400);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {/* Title & Human warm subtitle */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 text-[#5B887E]">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#EBF3F0] text-xs font-semibold">
            1
          </span>
          <span className="text-xs uppercase tracking-widest font-semibold text-[#5B887E]">
            Identidad & Contacto
          </span>
        </div>

        <h1
          id="screen-title"
          className="text-3xl sm:text-4xl text-[#2E3A36] font-normal leading-tight"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          Cuéntanos quién eres
        </h1>

        <p className="text-base sm:text-lg text-[#5C6E68] font-normal leading-relaxed">
          Empecemos por lo básico. Tómate tu tiempo.
        </p>

        {/* Safe space and confidentiality card */}
        <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-[#F4F9F7] border border-[#AEC9C0]/70 flex items-start gap-3.5 shadow-2xs">
          <div className="p-2 rounded-xl bg-white text-[#6E9E93] shrink-0 mt-0.5 shadow-2xs">
            <ShieldCheck className="w-5 h-5 text-[#6E9E93]" />
          </div>
          <div className="text-xs sm:text-sm text-[#2E3A36]/90 leading-relaxed space-y-1">
            <p className="font-semibold text-[#2E3A36]">
              Un espacio seguro y confidencial
            </p>
            <p className="text-[#5C6E68]">
              Cada detalle de este formulario lo revisa personalmente la <strong>Dra. Lorena Castro</strong> antes de tu cita, para diseñar una guía médica adaptada a tu historia y biología. Puedes responderlo con calma y guardar tu progreso en cualquier momento.
            </p>
          </div>
        </div>
      </div>

      {/* Fields Container */}
      <div className="space-y-7 bg-white/70 backdrop-blur-xs p-6 sm:p-8 rounded-3xl border border-[#AEC9C0]/30 shadow-xs">
        
        {/* 1. Nombre completo */}
        <div id="field-fullName" className="space-y-2">
          <label
            htmlFor="fullName-input"
            className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]"
          >
            <span className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#6E9E93]" />
              Nombre completo <span className="text-[#F2A488] font-bold">*</span>
            </span>
            <span className="text-xs font-normal text-[#8E9E99]">Como te gusta que te llamen</span>
          </label>
          <input
            id="fullName-input"
            type="text"
            value={formData.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            onBlur={() => handleBlur('fullName')}
            placeholder="Ej. Mariana Gómez Restrepo"
            className={`w-full px-4 py-3.5 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-base transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white ${
              touched.fullName && errors.fullName
                ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
            }`}
          />
          {touched.fullName && errors.fullName && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              {errors.fullName}
            </motion.p>
          )}
        </div>

        {/* 2. Número de identificación */}
        <div id="field-documentNumber" className="space-y-2">
          <label
            htmlFor="documentNumber-input"
            className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]"
          >
            <span className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#6E9E93]" />
              Número de identificación <span className="text-[#F2A488] font-bold">*</span>
            </span>
            <span className="text-xs font-normal text-[#8E9E99]">Para tu expediente clínico</span>
          </label>
          
          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Document Type Selector */}
            <div className="sm:w-36 shrink-0">
              <select
                id="documentType-select"
                aria-label="Tipo de documento"
                value={formData.documentType}
                onChange={(e) =>
                  handleChange('documentType', e.target.value as DocumentType)
                }
                className="w-full px-3 py-3.5 rounded-xl bg-[#FAF6F0]/80 border border-[#D9D3C8] text-[#2E3A36] text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white hover:border-[#AEC9C0] cursor-pointer"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type === 'CC'
                      ? 'Cédula (CC)'
                      : type === 'CE'
                      ? 'Extranjería (CE)'
                      : type}
                  </option>
                ))}
              </select>
            </div>

            {/* Document Number Input */}
            <div className="flex-1">
              <input
                id="documentNumber-input"
                type="text"
                value={formData.documentNumber}
                onChange={(e) => handleChange('documentNumber', e.target.value)}
                onBlur={() => handleBlur('documentNumber')}
                placeholder="Ej. 1020304050"
                className={`w-full px-4 py-3.5 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-base transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white ${
                  touched.documentNumber && errors.documentNumber
                    ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                    : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
                }`}
              />
            </div>
          </div>

          {touched.documentNumber && errors.documentNumber && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              {errors.documentNumber}
            </motion.p>
          )}
        </div>

        {/* 3 & 4. Fecha de nacimiento & Edad en grid de 2 columnas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Fecha de nacimiento (2 cols) */}
          <div id="field-birthDate" className="sm:col-span-2 space-y-2">
            <label
              htmlFor="birthDate-input"
              className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]"
            >
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#6E9E93]" />
                Fecha de nacimiento <span className="text-[#F2A488] font-bold">*</span>
              </span>
            </label>
            <input
              id="birthDate-input"
              type="date"
              max={new Date().toISOString().split('T')[0]}
              value={formData.birthDate}
              onChange={handleBirthDateChange}
              onBlur={() => handleBlur('birthDate')}
              className={`w-full px-4 py-3.5 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] text-base transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white ${
                touched.birthDate && errors.birthDate
                  ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                  : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
              }`}
            />
            {touched.birthDate && errors.birthDate && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
              >
                <Info className="w-3.5 h-3.5 shrink-0" />
                {errors.birthDate}
              </motion.p>
            )}
          </div>

          {/* Edad (1 col) */}
          <div id="field-age" className="space-y-2">
            <label
              htmlFor="age-input"
              className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]"
            >
              <span>
                Edad <span className="text-[#F2A488] font-bold">*</span>
              </span>
              <span className="text-[11px] font-normal text-[#8E9E99]">Años</span>
            </label>
            <div className="relative">
              <input
                id="age-input"
                type="number"
                min="10"
                max="120"
                value={formData.age}
                onChange={(e) => handleChange('age', e.target.value)}
                onBlur={() => handleBlur('age')}
                placeholder="Ej. 34"
                className={`w-full px-4 py-3.5 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-base transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white ${
                  touched.age && errors.age
                    ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                    : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
                }`}
              />
              {formData.birthDate && formData.age && (
                <div
                  title="Calculado automáticamente"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B887E]"
                >
                  <Sparkles className="w-4 h-4" />
                </div>
              )}
            </div>
            {touched.age && errors.age && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
              >
                <Info className="w-3.5 h-3.5 shrink-0" />
                {errors.age}
              </motion.p>
            )}
          </div>
        </div>

        {/* 5. Ocupación */}
        <div id="field-occupation" className="space-y-2">
          <label
            htmlFor="occupation-input"
            className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]"
          >
            <span className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#6E9E93]" />
              Ocupación o actividad principal <span className="text-[#F2A488] font-bold">*</span>
            </span>
          </label>
          <input
            id="occupation-input"
            type="text"
            value={formData.occupation}
            onChange={(e) => handleChange('occupation', e.target.value)}
            onBlur={() => handleBlur('occupation')}
            placeholder="Ej. Docente, Ingeniera, Diseñadora, Comerciante, etc."
            className={`w-full px-4 py-3.5 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-base transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white ${
              touched.occupation && errors.occupation
                ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
            }`}
          />
          <p className="text-xs text-[#5C6E68] pl-1">
            Conocer tu ritmo de vida y horarios nos permite adaptar cualquier pauta a tu realidad.
          </p>
          {touched.occupation && errors.occupation && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              {errors.occupation}
            </motion.p>
          )}
        </div>

        {/* 6. Estado civil */}
        <div id="field-civilStatus" className="space-y-3 pt-1">
          <label className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]">
            <span className="flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-[#6E9E93]" />
              Estado civil <span className="text-[#F2A488] font-bold">*</span>
            </span>
            <span className="text-xs font-normal text-[#8E9E99]">Selecciona una opción</span>
          </label>

          <div
            role="radiogroup"
            aria-label="Estado civil"
            className="grid grid-cols-2 sm:grid-cols-3 gap-2.5"
          >
            {CIVIL_STATUS_OPTIONS.map((status) => {
              const isSelected = formData.civilStatus === status;
              return (
                <button
                  type="button"
                  key={status}
                  id={`civil-status-${status.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => {
                    handleChange('civilStatus', status);
                    handleBlur('civilStatus');
                  }}
                  className={`group relative flex items-center justify-between px-3.5 py-3 rounded-xl border text-sm font-medium transition-all duration-200 text-left cursor-pointer ${
                    isSelected
                      ? 'bg-[#EBF3F0] border-[#6E9E93] text-[#2E3A36] shadow-2xs font-semibold'
                      : 'bg-[#FAF6F0]/60 border-[#D9D3C8] text-[#5C6E68] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                  }`}
                >
                  <span className="truncate">{status}</span>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ml-1 transition-all ${
                      isSelected
                        ? 'bg-[#6E9E93] text-white'
                        : 'border border-[#C8C2B7] group-hover:border-[#AEC9C0]'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>

          {touched.civilStatus && errors.civilStatus && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              {errors.civilStatus}
            </motion.p>
          )}
        </div>

        {/* 7. ¿Cómo te enteraste de nosotros? */}
        <div id="field-referralSource" className="space-y-3 pt-1">
          <label className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]">
            <span className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#6E9E93]" />
              ¿Cómo te enteraste de nosotros? <span className="text-[#F2A488] font-bold">*</span>
            </span>
            <span className="text-xs font-normal text-[#8E9E99]">Nos alegra saber de ti</span>
          </label>

          <div
            role="radiogroup"
            aria-label="Fuente de referencia"
            className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
          >
            {REFERRAL_OPTIONS.map((option) => {
              const isSelected = formData.referralSource === option;
              return (
                <button
                  type="button"
                  key={option}
                  id={`referral-${option.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => {
                    handleChange('referralSource', option);
                    handleBlur('referralSource');
                  }}
                  className={`group relative flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 text-left cursor-pointer ${
                    isSelected
                      ? 'bg-[#EBF3F0] border-[#6E9E93] text-[#2E3A36] shadow-2xs font-semibold'
                      : 'bg-[#FAF6F0]/60 border-[#D9D3C8] text-[#5C6E68] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                  }`}
                >
                  <span>{option}</span>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ml-2 transition-all ${
                      isSelected
                        ? 'bg-[#6E9E93] text-white'
                        : 'border border-[#C8C2B7] group-hover:border-[#AEC9C0]'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Expandable input for "Otro" */}
          <AnimatePresence>
            {formData.referralSource === 'Otro' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-2"
              >
                <div id="field-referralOtherDetails" className="space-y-1.5 pl-0.5">
                  <label
                    htmlFor="referralOtherDetails-input"
                    className="text-xs font-semibold text-[#5C6E68]"
                  >
                    ¿Podrías contarnos un poco más? <span className="text-[#F2A488] font-bold">*</span>
                  </label>
                  <input
                    id="referralOtherDetails-input"
                    type="text"
                    value={formData.referralOtherDetails}
                    onChange={(e) =>
                      handleChange('referralOtherDetails', e.target.value)
                    }
                    onBlur={() => handleBlur('referralOtherDetails')}
                    placeholder="Ej. Una amiga me compartió el enlace / conferencia / podcast..."
                    className={`w-full px-4 py-3 rounded-xl bg-white border text-[#2E3A36] placeholder-[#8E9E99] text-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 ${
                      touched.referralOtherDetails && errors.referralOtherDetails
                        ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                        : 'border-[#AEC9C0]'
                    }`}
                  />
                  {touched.referralOtherDetails && errors.referralOtherDetails && (
                    <p className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      {errors.referralOtherDetails}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {touched.referralSource && errors.referralSource && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              {errors.referralSource}
            </motion.p>
          )}
        </div>
      </div>

      {/* Bottom Actions Bar */}
      <div className="pt-2 pb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Autosave status indicator */}
        <div className="text-xs text-[#5C6E68] flex items-center gap-2 order-2 sm:order-1">
          <div className="w-2 h-2 rounded-full bg-[#6E9E93] animate-pulse" />
          <span>Tus avances se guardan en este dispositivo</span>
          {autoSavedTime && (
            <span className="text-[#8E9E99]">({autoSavedTime})</span>
          )}
        </div>

        {/* Continue Button */}
        <div className="w-full sm:w-auto order-1 sm:order-2 flex flex-col items-center sm:items-end">
          <button
            type="submit"
            id="continue-button"
            disabled={!isFormComplete || isSubmitting}
            className={`w-full sm:w-auto min-w-[200px] px-8 py-4 rounded-2xl font-semibold text-white shadow-md flex items-center justify-center gap-2.5 transition-all duration-300 ${
              isFormComplete && !isSubmitting
                ? 'bg-[#6E9E93] hover:bg-[#5B887E] active:bg-[#4B736A] hover:shadow-lg cursor-pointer transform hover:-translate-y-0.5'
                : 'bg-[#6E9E93]/40 text-white/80 cursor-not-allowed shadow-none'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <span>Continuar</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
          
          {!isFormComplete && (
            <p className="text-[11px] text-[#8E9E99] mt-2 text-center sm:text-right">
              Completa los campos obligatorios (*) para avanzar al siguiente paso
            </p>
          )}
        </div>
      </div>
    </form>
  );
};
