import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UploadCloud,
  FileText,
  Trash2,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  FileCheck2,
  Sparkles,
  Activity,
  Calendar,
  Scale,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Edit3,
  Flame,
  Droplets,
  Heart,
  Info,
} from 'lucide-react';
import {
  PatientInBodyInfo,
  UploadedLabFile,
  StepInBodyErrors,
  ExtractedInBodyMetrics,
} from '../types';
import { VelaIcon } from './VelaIcon';

interface StepInBodyFormProps {
  initialData?: PatientInBodyInfo;
  onBack: () => void;
  onContinue: (data: PatientInBodyInfo) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const StepInBodyForm: React.FC<StepInBodyFormProps> = ({
  initialData,
  onBack,
  onContinue,
}) => {
  const [formData, setFormData] = useState<PatientInBodyInfo>(() => {
    if (initialData) return initialData;
    const saved = localStorage.getItem('vela_step10_inbody_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing step 10 InBody draft', e);
      }
    }
    return {
      hasInBodyReport: '',
      files: [],
      testDateOrCenter: '',
      knownMetrics: '',
      notesOrGoals: '',
      extractedMetrics: null,
    };
  });

  const [errors, setErrors] = useState<StepInBodyErrors>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-save draft with safety for storage limits
  useEffect(() => {
    try {
      localStorage.setItem('vela_step10_inbody_data', JSON.stringify(formData));
    } catch (e) {
      try {
        const lightweight = {
          ...formData,
          files: formData.files.map((f) => ({
            id: f.id,
            name: f.name,
            size: f.size,
            type: f.type,
            description: f.description,
            uploadedAt: f.uploadedAt,
          })),
        };
        localStorage.setItem('vela_step10_inbody_data', JSON.stringify(lightweight));
      } catch (err) {
        console.warn('Could not save InBody draft to localStorage', err);
      }
    }
  }, [formData]);

  // Extract InBody metrics automatically from uploaded document
  const analyzeInBodyDocument = async (fileDataUrl: string, fileType: string, fileName: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisStatus('Leyendo y analizando parámetros del InBody...');

    try {
      const response = await fetch('/api/inbody/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileDataUrl,
          fileType,
          fileName,
        }),
      });

      const data = await response.json();

      if (data.success && data.metrics) {
        const m = data.metrics as ExtractedInBodyMetrics;
        const now = new Date().toLocaleDateString('es-CO');

        const metricsWithMeta: ExtractedInBodyMetrics = {
          ...m,
          extractedAt: now,
          sourceFileName: fileName,
        };

        // Construct readable summary for knownMetrics
        const summaryParts: string[] = [];
        if (m.pesoKg != null) summaryParts.push(`Peso: ${m.pesoKg} kg`);
        if (m.porcentajeGrasaCorporal != null) summaryParts.push(`% Grasa: ${m.porcentajeGrasaCorporal}%`);
        if (m.masaGrasaCorporalKg != null) summaryParts.push(`Masa Grasa: ${m.masaGrasaCorporalKg} kg`);
        if (m.masaMuscularEsqueleticaKg != null) summaryParts.push(`Masa Muscular: ${m.masaMuscularEsqueleticaKg} kg`);
        if (m.masaLibreDeGrasaKg != null) summaryParts.push(`Masa Libre de Grasa: ${m.masaLibreDeGrasaKg} kg`);
        if (m.nivelGrasaVisceral != null) summaryParts.push(`Grasa Visceral: Nivel ${m.nivelGrasaVisceral}`);
        if (m.aguaCorporalTotalLt != null) summaryParts.push(`Agua Total: ${m.aguaCorporalTotalLt} L`);
        if (m.tasaMetabolicaBasalKcal != null) summaryParts.push(`TMB: ${m.tasaMetabolicaBasalKcal} kcal`);

        setFormData((prev) => ({
          ...prev,
          extractedMetrics: metricsWithMeta,
          testDateOrCenter: prev.testDateOrCenter || m.fechaExamen || m.modeloEquipo || '',
          knownMetrics: summaryParts.length > 0 ? summaryParts.join(' • ') : prev.knownMetrics,
        }));

        setAnalysisStatus('¡Parámetros extraídos con éxito!');
      } else {
        setAnalysisError('No pudimos extraer automáticamente todos los datos del archivo. Puedes escribirlos manualmente abajo.');
      }
    } catch (err: any) {
      console.error('Error analyzing InBody file:', err);
      setAnalysisError('No fue posible realizar la extracción automática. Puedes registrar los datos de tu reporte manualmente.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const validate = (): boolean => {
    const errs: StepInBodyErrors = {};

    if (!formData.hasInBodyReport) {
      errs.hasInBodyReport = 'Por favor indica si tienes algún reporte o registro de InBody / bioimpedancia.';
    } else if (formData.hasInBodyReport === 'Sí') {
      if (!formData.files || formData.files.length === 0) {
        errs.files = 'Por favor adjunta la foto o PDF de tu examen InBody, o marca "No" si no lo tienes a mano.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProcessFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];

    const filesArray = Array.from(fileList);

    filesArray.forEach((file, index) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const isAllowedExt = ext === 'pdf' || ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp';

      if (!allowedTypes.includes(file.type) && !isAllowedExt) {
        alert(`El archivo "${file.name}" no es compatible. Por favor sube archivos en formato PDF, JPG o PNG.`);
        return;
      }

      const fileId = `inbody-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const reader = new FileReader();

      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : undefined;
        const uploadedFile: UploadedLabFile = {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl,
          description: '',
          uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setFormData((prev) => ({
          ...prev,
          files: [...prev.files, uploadedFile],
        }));

        if (attemptedSubmit) {
          setErrors((prev) => ({ ...prev, files: undefined }));
        }

        // Trigger automatic intelligent extraction for the first uploaded InBody document
        if (dataUrl && index === 0) {
          analyzeInBodyDocument(dataUrl, file.type, file.name);
        }
      };

      if (file.size < 8 * 1024 * 1024) {
        reader.readAsDataURL(file);
      } else {
        const uploadedFile: UploadedLabFile = {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          description: '',
          uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setFormData((prev) => ({
          ...prev,
          files: [...prev.files, uploadedFile],
        }));
      }
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleProcessFiles(e.dataTransfer.files);
  };

  const handleRemoveFile = (fileId: string) => {
    setFormData((prev) => ({
      ...prev,
      files: prev.files.filter((f) => f.id !== fileId),
      extractedMetrics: prev.files.length <= 1 ? null : prev.extractedMetrics,
    }));
  };

  const handleUpdateFileDescription = (fileId: string, description: string) => {
    setFormData((prev) => ({
      ...prev,
      files: prev.files.map((f) => (f.id === fileId ? { ...f, description } : f)),
    }));
  };

  const handleUpdateMetricField = (field: keyof ExtractedInBodyMetrics, val: any) => {
    setFormData((prev) => {
      const current = prev.extractedMetrics || {};
      const updated = {
        ...current,
        [field]: val === '' ? null : val,
      };

      // Re-synthesize summary
      const summaryParts: string[] = [];
      if (updated.pesoKg != null) summaryParts.push(`Peso: ${updated.pesoKg} kg`);
      if (updated.porcentajeGrasaCorporal != null) summaryParts.push(`% Grasa: ${updated.porcentajeGrasaCorporal}%`);
      if (updated.masaGrasaCorporalKg != null) summaryParts.push(`Masa Grasa: ${updated.masaGrasaCorporalKg} kg`);
      if (updated.masaMuscularEsqueleticaKg != null) summaryParts.push(`Masa Muscular: ${updated.masaMuscularEsqueleticaKg} kg`);
      if (updated.masaLibreDeGrasaKg != null) summaryParts.push(`Masa Libre de Grasa: ${updated.masaLibreDeGrasaKg} kg`);
      if (updated.nivelGrasaVisceral != null) summaryParts.push(`Grasa Visceral: Nivel ${updated.nivelGrasaVisceral}`);
      if (updated.aguaCorporalTotalLt != null) summaryParts.push(`Agua Total: ${updated.aguaCorporalTotalLt} L`);
      if (updated.tasaMetabolicaBasalKcal != null) summaryParts.push(`TMB: ${updated.tasaMetabolicaBasalKcal} kcal`);

      return {
        ...prev,
        extractedMetrics: updated,
        knownMetrics: summaryParts.join(' • '),
      };
    });
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

  const isContinueDisabled = formData.hasInBodyReport === 'Sí' && formData.files.length === 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header section */}
      <div className="space-y-3 text-center sm:text-left border-b border-[#E8E2D8] pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF3F0] text-[#5B887E] text-xs font-semibold self-start">
          <VelaIcon size={14} />
          <span>Paso 10 de 11 • Composición corporal y bioimpedancia</span>
        </div>

        <div className="space-y-2">
          <h1
            className="text-2xl sm:text-3xl lg:text-4xl text-[#2E3A36] font-normal leading-tight"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            ¿Tienes algún registro de InBody o composición corporal?
          </h1>
          <p className="text-sm sm:text-base text-[#5C6E68] max-w-2xl leading-relaxed">
            Si te has realizado un examen de bioimpedancia (InBody, Tanita, DEXA u otro escáner de composición corporal) en el último año, súbelo aquí. Nuestro sistema extraerá automáticamente tu masa muscular, grasa visceral y distribución corporal para que no tengas que transcribirlo todo a mano.
          </p>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white/80 rounded-3xl p-5 sm:p-7 border border-[#AEC9C0]/40 shadow-2xs space-y-6">
        {/* 1. ¿Tienes reporte de InBody? */}
        <div
          data-error={!!errors.hasInBodyReport}
          className="space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="text-xs sm:text-sm font-semibold text-[#2E3A36]">
              1. ¿Tienes algún reporte de InBody o bioimpedancia reciente que puedas compartir? <strong className="text-[#C66A4D]">*</strong>
            </label>
            <div className="flex gap-2 self-start sm:self-auto">
              {(['No', 'Sí'] as const).map((val) => {
                const isSelected = formData.hasInBodyReport === val;
                return (
                  <button
                    key={val}
                    type="button"
                    id={`btn-has-inbody-${val.toLowerCase()}`}
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        hasInBodyReport: val,
                      }));
                      if (attemptedSubmit) {
                        setErrors((prev) => ({
                          ...prev,
                          hasInBodyReport: undefined,
                          files: undefined,
                        }));
                      }
                    }}
                    className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-medium border transition-all cursor-pointer ${
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
          {errors.hasInBodyReport && (
            <p className="text-xs text-[#C66A4D] font-medium flex items-center gap-1.5 pt-0.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.hasInBodyReport}
            </p>
          )}
        </div>

        {/* If NO: Reassuring message */}
        {formData.hasInBodyReport === 'No' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-[#EBF3F0]/90 border border-[#AEC9C0] text-[#2E3A36] space-y-2"
          >
            <div className="flex items-center gap-2.5 text-[#5B887E] font-semibold text-xs sm:text-sm">
              <Sparkles className="w-4 h-4 text-[#5B887E]" />
              <span>¡No te preocupes, no es indispensable para comenzar!</span>
            </div>
            <p className="text-xs sm:text-sm text-[#5C6E68] leading-relaxed">
              Muchas pacientes inician su camino en Vela sin registros previos de bioimpedancia. Si tu médica considera oportuno evaluar tu masa muscular o grasa corporal más adelante, te orientará sobre la mejor forma de hacerlo.
            </p>
            <p className="text-[11px] text-[#5B887E] font-medium pt-1">
              Puedes pulsar "Continuar" para avanzar.
            </p>
          </motion.div>
        )}

        {/* If YES: Upload zone + automated extraction + file management + metrics inputs */}
        {formData.hasInBodyReport === 'Sí' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-6 pt-2 border-t border-[#E8E2D8]/70"
          >
            {/* Privacy note */}
            <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#AEC9C0]/50 text-xs text-[#2E3A36]">
              <ShieldCheck className="w-4 h-4 text-[#5B887E] shrink-0" />
              <span>
                <strong>Confidencialidad médica y extracción automática:</strong> Tus reportes serán analizados de manera segura para extraer tus métricas y quedarán almacenados para la revisión detallada de la Dra. Lorena Castro.
              </span>
            </div>

            {/* 2. Drag & Drop File Upload Area */}
            <div
              data-error={!!errors.files}
              className="space-y-3"
            >
              <label className="text-xs sm:text-sm font-semibold text-[#2E3A36] flex items-center justify-between">
                <span>
                  2. Sube la hoja, foto o PDF de tu InBody / Bioimpedancia <strong className="text-[#C66A4D]">*</strong>
                </span>
                <span className="text-[11px] font-normal text-[#8E9E99]">PDF, JPG o PNG • Extracción automática</span>
              </label>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                id="inbody-file-input"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png"
                onChange={(e) => handleProcessFiles(e.target.files)}
                className="hidden"
              />

              {/* Dropzone container */}
              <div
                id="inbody-dropzone-container"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full p-6 sm:p-8 rounded-3xl border-2 border-dashed transition-all duration-200 text-center cursor-pointer flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? 'border-[#5B887E] bg-[#EBF3F0] scale-[1.01]'
                    : 'border-[#AEC9C0] bg-[#FAF6F0]/60 hover:bg-white hover:border-[#6E9E93]'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center shadow-2xs">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-md">
                  <p className="text-xs sm:text-sm font-semibold text-[#2E3A36]">
                    Arrastra aquí el reporte o foto de tu InBody, o{' '}
                    <span className="text-[#5B887E] underline decoration-1 underline-offset-2">
                      haz clic para buscar en tu dispositivo
                    </span>
                  </p>
                  <p className="text-[11px] sm:text-xs text-[#5C6E68]">
                    Al subir la foto o PDF, extraeremos automáticamente tu peso, grasa corporal, masa muscular y grasa visceral
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-select-inbody-file"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-4 py-2 rounded-xl bg-[#5B887E] text-white text-xs font-medium hover:bg-[#477369] transition-colors cursor-pointer shadow-2xs mt-1"
                >
                  Seleccionar reporte
                </button>
              </div>

              {errors.files && (
                <p className="text-xs text-[#C66A4D] font-medium flex items-center gap-1.5 pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.files}
                </p>
              )}
            </div>

            {/* Extraction in progress spinner */}
            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl bg-[#EBF3F0] border border-[#5B887E]/30 flex items-center gap-3 text-[#2E3A36]"
              >
                <Loader2 className="w-5 h-5 text-[#5B887E] animate-spin shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-xs sm:text-sm font-semibold text-[#5B887E]">
                    Extrayendo parámetros de tu InBody...
                  </p>
                  <p className="text-[11px] text-[#5C6E68]">
                    Identificando peso, masa muscular, porcentaje de grasa, grasa visceral y agua corporal.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Analysis error notification */}
            {analysisError && !isAnalyzing && (
              <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E8E2D8] text-xs text-[#5C6E68] flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#5B887E] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#2E3A36]">Información de lectura</p>
                  <p className="text-[11px] text-[#5C6E68] mt-0.5">{analysisError}</p>
                </div>
              </div>
            )}

            {/* EXTRACTED PARAMETERS DASHBOARD */}
            {formData.extractedMetrics && !isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 sm:p-6 rounded-3xl bg-linear-to-br from-[#F4F9F7] via-white to-[#FAF6F0] border border-[#5B887E]/40 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#AEC9C0]/40 pb-3">
                  <div className="flex items-start gap-2.5 text-[#5B887E]">
                    <div className="w-8 h-8 rounded-xl bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#2E3A36] flex items-center gap-2">
                        <span>Parámetros InBody Extraídos Automáticamente</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#EBF3F0] text-[#5B887E] text-[10px] font-semibold">
                          Listo
                        </span>
                      </h3>
                      <p className="text-xs text-[#5C6E68]">
                        Extrajimos estos valores de tu documento. <strong>No necesitas volver a escribirlos</strong>; ya quedaron listos para la revisión de tu médica.
                      </p>
                    </div>
                  </div>
                  {formData.files.length > 0 && formData.files[0].dataUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        const firstFile = formData.files[0];
                        if (firstFile?.dataUrl) {
                          analyzeInBodyDocument(firstFile.dataUrl, firstFile.type, firstFile.name);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#AEC9C0] text-[#5B887E] text-[11px] font-semibold hover:bg-[#EBF3F0] transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Volver a extraer</span>
                    </button>
                  )}
                </div>

                {/* Parameters Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {/* Peso */}
                  <div className="p-3 rounded-2xl bg-white border border-[#D9D3C8] shadow-2xs space-y-1 hover:border-[#5B887E] transition-colors">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E68] flex items-center gap-1">
                      <Scale className="w-3 h-3 text-[#5B887E]" /> Peso corporal
                    </label>
                    <div className="flex items-baseline gap-1">
                      <input
                        type="number"
                        step="0.1"
                        value={formData.extractedMetrics.pesoKg ?? ''}
                        onChange={(e) => handleUpdateMetricField('pesoKg', e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="--"
                        className="w-full text-base sm:text-lg font-bold text-[#2E3A36] bg-transparent focus:outline-hidden focus:ring-1 focus:ring-[#5B887E] rounded px-0.5"
                      />
                      <span className="text-xs font-semibold text-[#8E9E99]">kg</span>
                    </div>
                  </div>

                  {/* Talla */}
                  <div className="p-3 rounded-2xl bg-white border border-[#D9D3C8] shadow-2xs space-y-1 hover:border-[#5B887E] transition-colors">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E68] flex items-center gap-1">
                      <Activity className="w-3 h-3 text-[#5B887E]" /> Estatura / Talla
                    </label>
                    <div className="flex items-baseline gap-1">
                      <input
                        type="number"
                        step="0.5"
                        value={formData.extractedMetrics.tallaCm ?? ''}
                        onChange={(e) => handleUpdateMetricField('tallaCm', e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="--"
                        className="w-full text-base sm:text-lg font-bold text-[#2E3A36] bg-transparent focus:outline-hidden focus:ring-1 focus:ring-[#5B887E] rounded px-0.5"
                      />
                      <span className="text-xs font-semibold text-[#8E9E99]">cm</span>
                    </div>
                  </div>

                  {/* % Grasa Corporal */}
                  <div className="p-3 rounded-2xl bg-white border border-[#D9D3C8] shadow-2xs space-y-1 hover:border-[#C66A4D] transition-colors">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E68] flex items-center gap-1">
                      <Flame className="w-3 h-3 text-[#C66A4D]" /> % Grasa Corporal
                    </label>
                    <div className="flex items-baseline gap-1">
                      <input
                        type="number"
                        step="0.1"
                        value={formData.extractedMetrics.porcentajeGrasaCorporal ?? ''}
                        onChange={(e) => handleUpdateMetricField('porcentajeGrasaCorporal', e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="--"
                        className="w-full text-base sm:text-lg font-bold text-[#C66A4D] bg-transparent focus:outline-hidden focus:ring-1 focus:ring-[#5B887E] rounded px-0.5"
                      />
                      <span className="text-xs font-semibold text-[#8E9E99]">%</span>
                    </div>
                  </div>

                  {/* Masa Grasa (kg) */}
                  <div className="p-3 rounded-2xl bg-white border border-[#D9D3C8] shadow-2xs space-y-1 hover:border-[#D97706] transition-colors">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E68] flex items-center gap-1">
                      <Flame className="w-3 h-3 text-[#D97706]" /> Masa Grasa Total
                    </label>
                    <div className="flex items-baseline gap-1">
                      <input
                        type="number"
                        step="0.1"
                        value={formData.extractedMetrics.masaGrasaCorporalKg ?? ''}
                        onChange={(e) => handleUpdateMetricField('masaGrasaCorporalKg', e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="--"
                        className="w-full text-base sm:text-lg font-bold text-[#2E3A36] bg-transparent focus:outline-hidden focus:ring-1 focus:ring-[#5B887E] rounded px-0.5"
                      />
                      <span className="text-xs font-semibold text-[#8E9E99]">kg</span>
                    </div>
                  </div>

                  {/* Masa Muscular Esquelética (kg) */}
                  <div className="p-3 rounded-2xl bg-white border border-[#D9D3C8] shadow-2xs space-y-1 hover:border-[#5B887E] transition-colors">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E68] flex items-center gap-1">
                      <Activity className="w-3 h-3 text-[#5B887E]" /> Masa Muscular (MME)
                    </label>
                    <div className="flex items-baseline gap-1">
                      <input
                        type="number"
                        step="0.1"
                        value={formData.extractedMetrics.masaMuscularEsqueleticaKg ?? ''}
                        onChange={(e) => handleUpdateMetricField('masaMuscularEsqueleticaKg', e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="--"
                        className="w-full text-base sm:text-lg font-bold text-[#5B887E] bg-transparent focus:outline-hidden focus:ring-1 focus:ring-[#5B887E] rounded px-0.5"
                      />
                      <span className="text-xs font-semibold text-[#8E9E99]">kg</span>
                    </div>
                  </div>

                  {/* Masa Libre de Grasa (kg) */}
                  <div className="p-3 rounded-2xl bg-white border border-[#D9D3C8] shadow-2xs space-y-1 hover:border-[#5B887E] transition-colors">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E68] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#5B887E]" /> Masa Libre Grasa (MLG)
                    </label>
                    <div className="flex items-baseline gap-1">
                      <input
                        type="number"
                        step="0.1"
                        value={formData.extractedMetrics.masaLibreDeGrasaKg ?? ''}
                        onChange={(e) => handleUpdateMetricField('masaLibreDeGrasaKg', e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="--"
                        className="w-full text-base sm:text-lg font-bold text-[#2E3A36] bg-transparent focus:outline-hidden focus:ring-1 focus:ring-[#5B887E] rounded px-0.5"
                      />
                      <span className="text-xs font-semibold text-[#8E9E99]">kg</span>
                    </div>
                  </div>

                  {/* Grasa Visceral */}
                  <div className="p-3 rounded-2xl bg-white border border-[#D9D3C8] shadow-2xs space-y-1 hover:border-[#C66A4D] transition-colors">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E68] flex items-center gap-1">
                      <Heart className="w-3 h-3 text-[#C66A4D]" /> Grasa Visceral
                    </label>
                    <div className="flex items-baseline gap-1">
                      <input
                        type="number"
                        step="1"
                        value={formData.extractedMetrics.nivelGrasaVisceral ?? ''}
                        onChange={(e) => handleUpdateMetricField('nivelGrasaVisceral', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="--"
                        className="w-full text-base sm:text-lg font-bold text-[#C66A4D] bg-transparent focus:outline-hidden focus:ring-1 focus:ring-[#5B887E] rounded px-0.5"
                      />
                      <span className="text-xs font-semibold text-[#8E9E99]">Nivel</span>
                    </div>
                  </div>

                  {/* Agua Corporal Total */}
                  <div className="p-3 rounded-2xl bg-white border border-[#D9D3C8] shadow-2xs space-y-1 hover:border-[#0284C7] transition-colors">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E68] flex items-center gap-1">
                      <Droplets className="w-3 h-3 text-[#0284C7]" /> Agua Corporal Total
                    </label>
                    <div className="flex items-baseline gap-1">
                      <input
                        type="number"
                        step="0.1"
                        value={formData.extractedMetrics.aguaCorporalTotalLt ?? ''}
                        onChange={(e) => handleUpdateMetricField('aguaCorporalTotalLt', e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="--"
                        className="w-full text-base sm:text-lg font-bold text-[#0284C7] bg-transparent focus:outline-hidden focus:ring-1 focus:ring-[#5B887E] rounded px-0.5"
                      />
                      <span className="text-xs font-semibold text-[#8E9E99]">L</span>
                    </div>
                  </div>

                  {/* Tasa Metabólica Basal */}
                  <div className="p-3 rounded-2xl bg-white border border-[#D9D3C8] shadow-2xs space-y-1 hover:border-[#5B887E] transition-colors">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E68] flex items-center gap-1">
                      <Flame className="w-3 h-3 text-[#5B887E]" /> Metabolismo Basal (TMB)
                    </label>
                    <div className="flex items-baseline gap-1">
                      <input
                        type="number"
                        step="10"
                        value={formData.extractedMetrics.tasaMetabolicaBasalKcal ?? ''}
                        onChange={(e) => handleUpdateMetricField('tasaMetabolicaBasalKcal', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="--"
                        className="w-full text-base sm:text-lg font-bold text-[#2E3A36] bg-transparent focus:outline-hidden focus:ring-1 focus:ring-[#5B887E] rounded px-0.5"
                      />
                      <span className="text-xs font-semibold text-[#8E9E99]">kcal</span>
                    </div>
                  </div>

                  {/* IMC */}
                  <div className="p-3 rounded-2xl bg-white border border-[#D9D3C8] shadow-2xs space-y-1 hover:border-[#5B887E] transition-colors">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E68] flex items-center gap-1">
                      <Scale className="w-3 h-3 text-[#5B887E]" /> IMC
                    </label>
                    <div className="flex items-baseline gap-1">
                      <input
                        type="number"
                        step="0.1"
                        value={formData.extractedMetrics.imc ?? ''}
                        onChange={(e) => handleUpdateMetricField('imc', e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="--"
                        className="w-full text-base sm:text-lg font-bold text-[#2E3A36] bg-transparent focus:outline-hidden focus:ring-1 focus:ring-[#5B887E] rounded px-0.5"
                      />
                      <span className="text-xs font-semibold text-[#8E9E99]">kg/m²</span>
                    </div>
                  </div>

                  {/* Fecha Examen */}
                  <div className="p-3 rounded-2xl bg-white border border-[#D9D3C8] shadow-2xs space-y-1 hover:border-[#5B887E] transition-colors">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E68] flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#5B887E]" /> Fecha detectada
                    </label>
                    <input
                      type="text"
                      value={formData.extractedMetrics.fechaExamen ?? ''}
                      onChange={(e) => handleUpdateMetricField('fechaExamen', e.target.value)}
                      placeholder="Fecha de la prueba"
                      className="w-full text-xs font-semibold text-[#2E3A36] bg-transparent focus:outline-hidden focus:ring-1 focus:ring-[#5B887E] rounded px-0.5 py-1"
                    />
                  </div>

                  {/* Modelo de Equipo */}
                  <div className="p-3 rounded-2xl bg-white border border-[#D9D3C8] shadow-2xs space-y-1 hover:border-[#5B887E] transition-colors">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E68] flex items-center gap-1">
                      <Activity className="w-3 h-3 text-[#5B887E]" /> Equipo / Dispositivo
                    </label>
                    <input
                      type="text"
                      value={formData.extractedMetrics.modeloEquipo ?? ''}
                      onChange={(e) => handleUpdateMetricField('modeloEquipo', e.target.value)}
                      placeholder="InBody / Tanita"
                      className="w-full text-xs font-semibold text-[#2E3A36] bg-transparent focus:outline-hidden focus:ring-1 focus:ring-[#5B887E] rounded px-0.5 py-1"
                    />
                  </div>
                </div>

                {/* Observaciones clínicas detectadas */}
                {formData.extractedMetrics.observacionesClinicas && (
                  <div className="pt-2 border-t border-[#AEC9C0]/30 text-xs text-[#5C6E68] flex items-start gap-2">
                    <Info className="w-4 h-4 text-[#5B887E] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-[#2E3A36]">Resumen extraído del reporte: </span>
                      <span className="italic">{formData.extractedMetrics.observacionesClinicas}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* List of uploaded files */}
            {formData.files.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#2E3A36] flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-[#5B887E]" />
                    <span>Archivos de bioimpedancia cargados ({formData.files.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-[#5B887E] hover:text-[#2E3A36] font-medium cursor-pointer"
                  >
                    + Agregar otro archivo
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.files.map((file) => (
                    <div
                      key={file.id}
                      className="bg-white rounded-2xl p-4 border border-[#D9D3C8] shadow-xs space-y-2 hover:border-[#AEC9C0] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center shrink-0">
                            <Activity className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-[#2E3A36] truncate max-w-xs sm:max-w-md">
                              {file.name}
                            </p>
                            <p className="text-[11px] text-[#8E9E99]">
                              {formatFileSize(file.size)} {file.uploadedAt ? `• Subido a las ${file.uploadedAt}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {file.dataUrl && (
                            <button
                              type="button"
                              onClick={() => analyzeInBodyDocument(file.dataUrl!, file.type, file.name)}
                              title="Extraer parámetros de este archivo"
                              className="px-2.5 py-1 text-[11px] font-semibold text-[#5B887E] hover:bg-[#EBF3F0] rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span className="hidden sm:inline">Re-extraer</span>
                            </button>
                          )}
                          <button
                            type="button"
                            id={`btn-delete-inbody-${file.id}`}
                            onClick={() => handleRemoveFile(file.id)}
                            title="Eliminar este archivo"
                            className="p-1.5 text-[#8E9E99] hover:text-[#C66A4D] hover:bg-[#FDEEE9] rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Campo de comentarios opcional para la médica */}
            <div className="space-y-2 pt-2 border-t border-[#E8E2D8]">
              <label
                htmlFor="notesOrGoals-input"
                className="text-xs sm:text-sm font-semibold text-[#2E3A36] flex items-center justify-between"
              >
                <span>¿Hay algo en particular sobre tu composición corporal que quieras comentarle a tu médica?</span>
                <span className="text-[11px] text-[#8E9E99] font-normal">(opcional)</span>
              </label>
              <p className="text-xs text-[#5C6E68]">
                Por ejemplo: inquietudes sobre pérdida o ganancia de masa muscular, retención de líquidos o cómo te has sentido físicamente.
              </p>
              <textarea
                id="notesOrGoals-input"
                rows={3}
                value={formData.notesOrGoals || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, notesOrGoals: e.target.value }))}
                placeholder="Escribe cualquier detalle adicional aquí si lo deseas..."
                className="w-full px-4 py-3 rounded-2xl bg-[#FAF6F0]/80 border border-[#D9D3C8] text-[#2E3A36] placeholder-[#8E9E99] text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white resize-y hover:border-[#AEC9C0]"
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Submission Validation Banner */}
      {attemptedSubmit && Object.keys(errors).length > 0 && (
        <div className="p-4 rounded-2xl bg-[#FDEEE9] border border-[#F2A488] text-[#C66A4D] flex items-start gap-3 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#C66A4D]" />
          <div>
            <p className="font-semibold">Por favor revisa los campos señalados</p>
            <p className="mt-0.5 text-xs text-[#C66A4D]/90">
              Si marcaste "Sí", asegúrate de adjuntar la foto o archivo de tu reporte InBody antes de continuar.
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
          id="btn-continue-step-inbody"
          disabled={isContinueDisabled}
          className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-medium text-sm shadow-sm transition-all duration-200 flex items-center justify-center gap-2 order-1 sm:order-2 ${
            isContinueDisabled
              ? 'bg-[#C8D6D2] text-white cursor-not-allowed opacity-70'
              : 'bg-[#6E9E93] hover:bg-[#5B887E] text-white cursor-pointer hover:shadow-md'
          }`}
        >
          <span>Continuar</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};

