import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Minus,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Sparkles,
  HeartHandshake,
  Check,
  X,
  Clock,
  Tag,
  MessageSquare,
  Lightbulb,
} from 'lucide-react';
import { WeightTrajectoryMilestone, TrajectoryShiftType } from '../types';

interface WeightTrajectoryTimelineProps {
  milestones: WeightTrajectoryMilestone[];
  onChange: (milestones: WeightTrajectoryMilestone[]) => void;
}

const COMMON_PRESET_MOMENTS = [
  'Universidad / Primer trabajo',
  'Embarazo / Postparto',
  'Pandemia / Confinamiento',
  'Cambio de trabajo / Alta carga de estrés',
  'Duelo o ruptura personal',
  'Mudanza / Cambio de ciudad',
  'Dieta muy estricta / Efecto rebote',
  'Lesión física / Dejar el deporte',
  'Menopausia o cambios hormonales',
];

const COMMON_TRIGGERS = [
  'Estrés laboral o académico',
  'Ansiedad / Comer emocional',
  'Horarios desordenados / Falta de tiempo',
  'Duelo o separación',
  'Embarazo / Cuidado de hijos',
  'Dieta muy restrictiva previa',
  'Inicio o cambio de medicación',
  'Dejar de fumar',
  'Lesión o abandono de ejercicio',
  'Problemas de sueño / Turnos nocturnos',
  'Mayor vida social / Comer fuera',
  'Estabilidad y tranquilidad',
];

const SHIFT_TYPE_CONFIG: Record<
  TrajectoryShiftType,
  {
    label: string;
    description: string;
    icon: React.ElementType;
    badgeBg: string;
    badgeText: string;
    borderColor: string;
    dotBg: string;
  }
> = {
  subida: {
    label: 'Subida notoria',
    description: 'Aumento de peso significativo',
    icon: TrendingUp,
    badgeBg: 'bg-[#FDEEE9]',
    badgeText: 'text-[#C66A4D]',
    borderColor: 'border-[#F2A488]',
    dotBg: 'bg-[#C66A4D]',
  },
  bajada: {
    label: 'Bajada notoria',
    description: 'Pérdida de peso marcada',
    icon: TrendingDown,
    badgeBg: 'bg-[#EBF3F0]',
    badgeText: 'text-[#477369]',
    borderColor: 'border-[#6E9E93]',
    dotBg: 'bg-[#477369]',
  },
  rebote: {
    label: 'Fluctuación / Rebote',
    description: 'Bajada seguida de aumento rápido',
    icon: RefreshCw,
    badgeBg: 'bg-[#FFF6E5]',
    badgeText: 'text-[#B27318]',
    borderColor: 'border-[#F5C77E]',
    dotBg: 'bg-[#B27318]',
  },
  estabilidad: {
    label: 'Etapa de estabilidad',
    description: 'Peso sostenido en el tiempo',
    icon: Minus,
    badgeBg: 'bg-[#F2F6F9]',
    badgeText: 'text-[#3D5A80]',
    borderColor: 'border-[#8FAFD1]',
    dotBg: 'bg-[#3D5A80]',
  },
};

export const WeightTrajectoryTimeline: React.FC<WeightTrajectoryTimelineProps> = ({
  milestones = [],
  onChange,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state for new/edited milestone
  const [stageOrAge, setStageOrAge] = useState('');
  const [shiftType, setShiftType] = useState<TrajectoryShiftType>('subida');
  const [approxWeightOrChange, setApproxWeightOrChange] = useState('');
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [customTriggerInput, setCustomTriggerInput] = useState('');
  const [lifeContext, setLifeContext] = useState('');
  const [formError, setFormError] = useState('');

  const openNewMilestoneForm = (presetMoment?: string) => {
    setEditingId(null);
    setStageOrAge(presetMoment || '');
    setShiftType('subida');
    setApproxWeightOrChange('');
    setSelectedTriggers([]);
    setCustomTriggerInput('');
    setLifeContext('');
    setFormError('');
    setIsAdding(true);
  };

  const openEditMilestoneForm = (item: WeightTrajectoryMilestone) => {
    setEditingId(item.id);
    setStageOrAge(item.stageOrAge);
    setShiftType(item.shiftType);
    setApproxWeightOrChange(item.approxWeightOrChange || '');
    setSelectedTriggers(item.triggers || []);
    setCustomTriggerInput('');
    setLifeContext(item.lifeContext);
    setFormError('');
    setIsAdding(true);
  };

  const handleToggleTrigger = (trigger: string) => {
    if (selectedTriggers.includes(trigger)) {
      setSelectedTriggers(selectedTriggers.filter((t) => t !== trigger));
    } else {
      setSelectedTriggers([...selectedTriggers, trigger]);
    }
  };

  const handleAddCustomTrigger = () => {
    const trimmed = customTriggerInput.trim();
    if (trimmed && !selectedTriggers.includes(trimmed)) {
      setSelectedTriggers([...selectedTriggers, trimmed]);
      setCustomTriggerInput('');
    }
  };

  const handleSaveMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageOrAge.trim()) {
      setFormError('Por favor indica la época o momento de vida (ej. A mis 25 años, Durante la pandemia).');
      return;
    }
    if (!lifeContext.trim()) {
      setFormError('Por favor cuéntanos brevemente qué estaba pasando en tu vida en ese momento.');
      return;
    }

    const newMilestone: WeightTrajectoryMilestone = {
      id: editingId || `milestone-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      stageOrAge: stageOrAge.trim(),
      shiftType,
      approxWeightOrChange: approxWeightOrChange.trim(),
      triggers: selectedTriggers,
      lifeContext: lifeContext.trim(),
    };

    if (editingId) {
      onChange(milestones.map((m) => (m.id === editingId ? newMilestone : m)));
    } else {
      onChange([...milestones, newMilestone]);
    }

    setIsAdding(false);
    setEditingId(null);
  };

  const handleDeleteMilestone = (id: string) => {
    onChange(milestones.filter((m) => m.id !== id));
  };

  return (
    <div className="space-y-6 bg-white/70 backdrop-blur-xs p-6 sm:p-8 rounded-3xl border border-[#AEC9C0]/30 shadow-xs">
      {/* Header section */}
      <div className="border-b border-[#E8E2D8] pb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#6E9E93]" />
          <h2
            className="text-xl sm:text-2xl text-[#2E3A36] font-normal"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Línea de tiempo y trayectoria de peso
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-[#5C6E68] mt-1.5 leading-relaxed">
          En medicina integrativa sabemos que el peso no varía por azar: responde a etapas de vida,
          emociones, estrés, cambios hormonales y rutinas. Ubicar estos hitos ayuda a identificar
          tus <strong>disparadores reales</strong> para tratarlos desde la raíz.
        </p>

        {/* Doctor clinical insight badge */}
        <div className="mt-3 p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#E8E2D8] flex items-start gap-2.5">
          <Lightbulb className="w-4 h-4 text-[#B27318] shrink-0 mt-0.5" />
          <p className="text-xs text-[#5C6E68] leading-relaxed">
            <span className="font-semibold text-[#2E3A36]">Ejercicio de Trajectory:</span> Señala los momentos en que tu peso subió o bajó de forma notoria y qué vivías entonces (ej. exámenes, nuevo trabajo, postparto, dietas estrictas, etc.).
          </p>
        </div>
      </div>

      {/* Existing timeline list */}
      {milestones.length > 0 && (
        <div className="relative pl-4 sm:pl-6 space-y-6 before:absolute before:left-3 sm:before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#AEC9C0]/50">
          {milestones.map((milestone, index) => {
            const config = SHIFT_TYPE_CONFIG[milestone.shiftType] || SHIFT_TYPE_CONFIG.subida;
            const ShiftIcon = config.icon;

            return (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
                className="relative pl-6 sm:pl-8 group"
              >
                {/* Timeline node icon */}
                <div
                  className={`absolute -left-1.5 sm:-left-0.5 top-3.5 w-6 h-6 rounded-full flex items-center justify-center text-white ring-4 ring-white shadow-xs ${config.dotBg}`}
                >
                  <ShiftIcon className="w-3.5 h-3.5" />
                </div>

                {/* Milestone card */}
                <div className={`p-4 sm:p-5 rounded-2xl bg-[#FAF6F0]/90 border ${config.borderColor} shadow-2xs space-y-3 transition-all hover:bg-white`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[#2E3A36] text-base flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#6E9E93]" />
                        {milestone.stageOrAge}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.badgeBg} ${config.badgeText}`}
                      >
                        <ShiftIcon className="w-3 h-3" />
                        {config.label}
                      </span>
                      {milestone.approxWeightOrChange && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-white text-[#5C6E68] border border-[#D9D3C8]">
                          {milestone.approxWeightOrChange}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        id={`edit-milestone-${milestone.id}`}
                        onClick={() => openEditMilestoneForm(milestone)}
                        className="p-1.5 rounded-lg text-[#5C6E68] hover:text-[#2E3A36] hover:bg-white transition-colors"
                        title="Editar momento"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        id={`delete-milestone-${milestone.id}`}
                        onClick={() => handleDeleteMilestone(milestone.id)}
                        className="p-1.5 rounded-lg text-[#8E9E99] hover:text-[#C66A4D] hover:bg-white transition-colors"
                        title="Eliminar momento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Trigger tags */}
                  {milestone.triggers && milestone.triggers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {milestone.triggers.map((t, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-white border border-[#AEC9C0]/40 text-[#2E3A36]"
                        >
                          <Tag className="w-2.5 h-2.5 text-[#6E9E93]" />
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Life context description */}
                  <div className="bg-white/80 p-3 rounded-xl border border-[#E8E2D8]/60 text-xs sm:text-sm text-[#2E3A36] leading-relaxed">
                    <p className="font-medium text-[#5C6E68] text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-[#6E9E93]" />
                      Qué estaba pasando en tu vida:
                    </p>
                    <p className="italic text-[#2E3A36]">"{milestone.lifeContext}"</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Empty state prompt */}
      {milestones.length === 0 && !isAdding && (
        <div className="text-center py-8 px-4 rounded-2xl bg-[#FAF6F0]/60 border border-dashed border-[#AEC9C0] space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-semibold text-[#2E3A36]">
              Añade tus momentos clave de cambio
            </h3>
            <p className="text-xs text-[#5C6E68]">
              Puedes agregar una época universitaria, un cambio de empleo, la maternidad, un período de mucho estrés o una dieta previa.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              id="add-first-milestone-btn"
              onClick={() => openNewMilestoneForm()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5B887E] text-white text-sm font-semibold hover:bg-[#477369] transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Agregar primer momento clave
            </button>
          </div>
        </div>
      )}

      {/* Preset suggestion chips (when not in add mode or to add fast) */}
      {!isAdding && (
        <div className="space-y-2 pt-1">
          <span className="text-xs font-semibold text-[#5C6E68] block">
            💡 Sugerencias de momentos frecuentes para agregar:
          </span>
          <div className="flex flex-wrap gap-2">
            {COMMON_PRESET_MOMENTS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                id={`preset-moment-${idx}`}
                onClick={() => openNewMilestoneForm(preset)}
                className="text-xs px-3 py-1.5 rounded-xl bg-white border border-[#D9D3C8] hover:border-[#6E9E93] hover:bg-[#EBF3F0]/40 text-[#2E3A36] transition-all text-left flex items-center gap-1.5"
              >
                <Plus className="w-3 h-3 text-[#6E9E93]" />
                {preset}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Button to add when milestones already exist */}
      {milestones.length > 0 && !isAdding && (
        <div className="pt-2">
          <button
            type="button"
            id="add-another-milestone-btn"
            onClick={() => openNewMilestoneForm()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#6E9E93] text-[#5B887E] hover:bg-[#EBF3F0] text-sm font-semibold transition-all shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            Añadir otro momento en tu línea de tiempo
          </button>
        </div>
      )}

      {/* Milestone Form Modal / Inline Box */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-5 sm:p-6 rounded-2xl bg-white border-2 border-[#6E9E93]/60 shadow-lg space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#E8E2D8] pb-3">
              <h3 className="text-lg font-semibold text-[#2E3A36] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#6E9E93]" />
                {editingId ? 'Editar momento en tu trayectoria' : 'Nuevo momento en tu línea de tiempo'}
              </h3>
              <button
                type="button"
                id="close-milestone-form-btn"
                onClick={() => setIsAdding(false)}
                className="p-1.5 rounded-lg text-[#8E9E99] hover:text-[#2E3A36] hover:bg-[#FAF6F0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-[#FDEEE9] text-[#C66A4D] text-xs font-medium border border-[#F2A488]">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Época o momento */}
              <div className="space-y-1.5">
                <label
                  htmlFor="stageOrAge-input"
                  className="text-xs font-semibold text-[#2E3A36] block"
                >
                  Momento o edad aproximada <span className="text-[#F2A488]">*</span>
                </label>
                <input
                  id="stageOrAge-input"
                  type="text"
                  value={stageOrAge}
                  onChange={(e) => setStageOrAge(e.target.value)}
                  placeholder="Ej. A mis 24 años, Durante el 2020, Tras el parto..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6F0]/80 border border-[#D9D3C8] focus:border-[#6E9E93] focus:bg-white text-sm text-[#2E3A36]"
                />
              </div>

              {/* 2. Variación aproximada */}
              <div className="space-y-1.5">
                <label
                  htmlFor="approxWeightOrChange-input"
                  className="text-xs font-semibold text-[#2E3A36] block"
                >
                  Variación o peso aproximado (opcional)
                </label>
                <input
                  id="approxWeightOrChange-input"
                  type="text"
                  value={approxWeightOrChange}
                  onChange={(e) => setApproxWeightOrChange(e.target.value)}
                  placeholder="Ej. Subí 10 kg, Llegué a 85 kg, Bajé 15 kg..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6F0]/80 border border-[#D9D3C8] focus:border-[#6E9E93] focus:bg-white text-sm text-[#2E3A36]"
                />
              </div>
            </div>

            {/* 3. Tipo de cambio (Segmented choice) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#2E3A36] block">
                ¿Qué ocurrió con tu peso en esa etapa? <span className="text-[#F2A488]">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {(
                  Object.keys(SHIFT_TYPE_CONFIG) as TrajectoryShiftType[]
                ).map((type) => {
                  const conf = SHIFT_TYPE_CONFIG[type];
                  const Icon = conf.icon;
                  const isSelected = shiftType === type;

                  return (
                    <button
                      key={type}
                      type="button"
                      id={`shift-type-${type}`}
                      onClick={() => setShiftType(type)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all ${
                        isSelected
                          ? `${conf.borderColor} ${conf.badgeBg} ring-2 ring-[#6E9E93]/40`
                          : 'border-[#D9D3C8] bg-[#FAF6F0]/50 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`p-1.5 rounded-lg ${conf.badgeBg} ${conf.badgeText}`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-[#5B887E]" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#2E3A36] block">
                          {conf.label}
                        </span>
                        <span className="text-[11px] text-[#5C6E68] leading-tight block">
                          {conf.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Factores / Disparadores presentes */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#2E3A36] block">
                Selecciona los factores o disparadores que influyeron (puedes marcar varios):
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 bg-[#FAF6F0]/60 rounded-xl border border-[#E8E2D8]">
                {COMMON_TRIGGERS.map((trigger, idx) => {
                  const isSelected = selectedTriggers.includes(trigger);
                  return (
                    <button
                      key={idx}
                      type="button"
                      id={`trigger-tag-${idx}`}
                      onClick={() => handleToggleTrigger(trigger)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#5B887E] text-white border-[#5B887E] font-medium'
                          : 'bg-white text-[#5C6E68] border-[#D9D3C8] hover:border-[#AEC9C0]'
                      }`}
                    >
                      {isSelected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3 text-[#8E9E99]" />}
                      {trigger}
                    </button>
                  );
                })}
              </div>

              {/* Custom trigger add */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  id="custom-trigger-input"
                  value={customTriggerInput}
                  onChange={(e) => setCustomTriggerInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomTrigger();
                    }
                  }}
                  placeholder="Otro disparador o factor..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-[#FAF6F0]/80 border border-[#D9D3C8] text-xs text-[#2E3A36]"
                />
                <button
                  type="button"
                  id="add-custom-trigger-btn"
                  onClick={handleAddCustomTrigger}
                  className="px-3 py-1.5 rounded-lg bg-[#EBF3F0] text-[#5B887E] border border-[#6E9E93]/40 text-xs font-medium hover:bg-[#5B887E] hover:text-white transition-all"
                >
                  Agregar tag
                </button>
              </div>
            </div>

            {/* 5. ¿Qué estaba pasando en tu vida? (Contexto de vida real) */}
            <div className="space-y-1.5">
              <label
                htmlFor="lifeContext-input"
                className="text-xs font-semibold text-[#2E3A36] block"
              >
                ¿Qué estaba pasando en tu vida en ese momento? (Disparadores reales){' '}
                <span className="text-[#F2A488]">*</span>
              </label>
              <textarea
                id="lifeContext-input"
                rows={3}
                value={lifeContext}
                onChange={(e) => setLifeContext(e.target.value)}
                placeholder="Ej. Estaba rindiendo exámenes finales con mucho insomnio y comía comida rápida a medianoche. Luego comencé mi primer empleo sedentario..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6F0]/80 border border-[#D9D3C8] focus:border-[#6E9E93] focus:bg-white text-sm text-[#2E3A36] leading-relaxed resize-y"
              />
              <p className="text-[11px] text-[#8E9E99]">
                Describe el contexto de forma natural y honesta. Toda la información es confidencial.
              </p>
            </div>

            {/* Form actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E8E2D8]">
              <button
                type="button"
                id="cancel-milestone-btn"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5C6E68] hover:bg-[#FAF6F0] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="save-milestone-btn"
                onClick={handleSaveMilestone}
                className="px-5 py-2 rounded-xl bg-[#5B887E] text-white text-xs font-semibold hover:bg-[#477369] transition-all shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                {editingId ? 'Guardar cambios' : 'Guardar en la línea de tiempo'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
