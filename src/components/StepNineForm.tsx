import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UploadCloud,
  FileText,
  Trash2,
  ShieldCheck,
  Check,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  FileCheck2,
  Sparkles,
  Info,
  Calendar,
  Eye,
  FileQuestion,
  FileSpreadsheet,
} from 'lucide-react';
import {
  PatientLabExamsInfo,
  UploadedLabFile,
  StepNineErrors,
} from '../types';
import { VelaIcon } from './VelaIcon';

interface StepNineFormProps {
  initialData?: PatientLabExamsInfo;
  onBack: () => void;
  onContinue: (data: PatientLabExamsInfo) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const StepNineForm: React.FC<StepNineFormProps> = ({
  initialData,
  onBack,
  onContinue,
}) => {
  const [formData, setFormData] = useState<PatientLabExamsInfo>(() => {
    if (initialData) return initialData;
    const saved = localStorage.getItem('vela_step9_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing step 9 draft', e);
      }
    }
    return {
      hasRecentLabs: '',
      files: [],
      notesOrFindings: '',
    };
  });

  const [errors, setErrors] = useState<StepNineErrors>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-save draft with safety for localStorage quota
  useEffect(() => {
    try {
      localStorage.setItem('vela_step9_data', JSON.stringify(formData));
    } catch (e) {
      // If base64 files exceed quota, store without large dataUrls
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
        localStorage.setItem('vela_step9_data', JSON.stringify(lightweight));
      } catch (err) {
        console.warn('Could not cache lab exams to localStorage', err);
      }
    }
  }, [formData]);

  const validate = (): boolean => {
    const errs: StepNineErrors = {};

    if (!formData.hasRecentLabs) {
      errs.hasRecentLabs = 'Por favor indica si tienes resultados de laboratorio del último año.';
    } else if (formData.hasRecentLabs === 'Sí') {
      if (!formData.files || formData.files.length === 0) {
        errs.files = 'Por favor sube al menos un archivo de examen o marca "No" si prefieres no adjuntarlos.';
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

    const newFiles: UploadedLabFile[] = [];
    const filesArray = Array.from(fileList);

    filesArray.forEach((file) => {
      // Basic extension / mime check
      const ext = file.name.split('.').pop()?.toLowerCase();
      const isAllowedExt = ext === 'pdf' || ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp';

      if (!allowedTypes.includes(file.type) && !isAllowedExt) {
        alert(`El archivo "${file.name}" no es compatible. Por favor sube archivos en formato PDF, JPG o PNG.`);
        return;
      }

      const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
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
      };

      // Read as DataURL for image previews or small PDFs
      if (file.size < 8 * 1024 * 1024) {
        reader.readAsDataURL(file);
      } else {
        // Fallback for very large files without base64 in memory
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

    // Reset input
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
    }));
  };

  const handleUpdateFileDescription = (fileId: string, description: string) => {
    setFormData((prev) => ({
      ...prev,
      files: prev.files.map((f) => (f.id === fileId ? { ...f, description } : f)),
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

  const isContinueDisabled = formData.hasRecentLabs === 'Sí' && formData.files.length === 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header section */}
      <div className="space-y-3 text-center sm:text-left border-b border-[#E8E2D8] pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF3F0] text-[#5B887E] text-xs font-semibold self-start">
          <VelaIcon size={14} />
          <span>Paso 9 de 10 • Paraclínicos y exámenes complementarios</span>
        </div>

        <div className="space-y-2">
          <h1
            className="text-2xl sm:text-3xl lg:text-4xl text-[#2E3A36] font-normal leading-tight"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            ¿Tienes exámenes de laboratorio recientes?
          </h1>
          <p className="text-sm sm:text-base text-[#5C6E68] max-w-2xl leading-relaxed">
            Si te has hecho paraclínicos (exámenes de sangre u otros) en el último año, súbelos aquí. Nos ayuda a no repetir exámenes innecesarios y a construir un cuadro clínico más completo.
          </p>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white/80 rounded-3xl p-5 sm:p-7 border border-[#AEC9C0]/40 shadow-2xs space-y-6">
        {/* 1. ¿Tienes resultados del último año? */}
        <div
          data-error={!!errors.hasRecentLabs}
          className="space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="text-xs sm:text-sm font-semibold text-[#2E3A36]">
              1. ¿Tienes resultados de laboratorio del último año que puedas compartir? <strong className="text-[#C66A4D]">*</strong>
            </label>
            <div className="flex gap-2 self-start sm:self-auto">
              {(['No', 'Sí'] as const).map((val) => {
                const isSelected = formData.hasRecentLabs === val;
                return (
                  <button
                    key={val}
                    type="button"
                    id={`btn-has-recent-labs-${val.toLowerCase()}`}
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        hasRecentLabs: val,
                      }));
                      if (attemptedSubmit) {
                        setErrors((prev) => ({
                          ...prev,
                          hasRecentLabs: undefined,
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
          {errors.hasRecentLabs && (
            <p className="text-xs text-[#C66A4D] font-medium flex items-center gap-1.5 pt-0.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.hasRecentLabs}
            </p>
          )}
        </div>

        {/* If NO: Warm reassuring medical message */}
        {formData.hasRecentLabs === 'No' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-[#EBF3F0]/90 border border-[#AEC9C0] text-[#2E3A36] space-y-2"
          >
            <div className="flex items-center gap-2.5 text-[#5B887E] font-semibold text-xs sm:text-sm">
              <Sparkles className="w-4 h-4 text-[#5B887E]" />
              <span>¡No te preocupes! Todo a su debido tiempo</span>
            </div>
            <p className="text-xs sm:text-sm text-[#5C6E68] leading-relaxed">
              Durante tu consulta médica, la Dra. Lorena evaluará tu caso de forma individualizada y te ordenará los paraclínicos pertinentes (perfil metabólico, tiroideo, hormonal o hepático) si hacen falta.
            </p>
            <p className="text-[11px] text-[#5B887E] font-medium pt-1">
              Puedes pulsar "Continuar" para avanzar.
            </p>
          </motion.div>
        )}

        {/* If YES: Upload zone + List of uploaded files + Findings notes */}
        {formData.hasRecentLabs === 'Sí' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-6 pt-2 border-t border-[#E8E2D8]/70"
          >
            {/* Trust and privacy disclaimer banner */}
            <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#AEC9C0]/50 text-xs text-[#2E3A36]">
              <ShieldCheck className="w-4 h-4 text-[#5B887E] shrink-0" />
              <span>
                <strong>Privacidad y confidencialidad:</strong> Estos documentos solo los verá tu médica antes y durante tu consulta.
              </span>
            </div>

            {/* 2. Drag & Drop File Upload Area */}
            <div
              data-error={!!errors.files}
              className="space-y-3"
            >
              <label className="text-xs sm:text-sm font-semibold text-[#2E3A36] flex items-center justify-between">
                <span>
                  2. Adjunta tus archivos de exámenes <strong className="text-[#C66A4D]">*</strong>
                </span>
                <span className="text-[11px] font-normal text-[#8E9E99]">PDF, JPG o PNG • Múltiples archivos</span>
              </label>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                id="lab-exams-file-input"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png"
                onChange={(e) => handleProcessFiles(e.target.files)}
                className="hidden"
              />

              {/* Dropzone container */}
              <div
                id="lab-dropzone-container"
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
                    Arrastra y suelta tus archivos aquí, o{' '}
                    <span className="text-[#5B887E] underline decoration-1 underline-offset-2">
                      haz clic para seleccionar
                    </span>
                  </p>
                  <p className="text-[11px] sm:text-xs text-[#5C6E68]">
                    Puedes subir varios archivos (perfiles de sangre, ecografías, reportes de laboratorio)
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-select-lab-files"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-4 py-2 rounded-xl bg-[#5B887E] text-white text-xs font-medium hover:bg-[#477369] transition-colors cursor-pointer shadow-2xs mt-1"
                >
                  Seleccionar archivos
                </button>
              </div>

              {errors.files && (
                <p className="text-xs text-[#C66A4D] font-medium flex items-center gap-1.5 pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.files}
                </p>
              )}
            </div>

            {/* List of uploaded files with individual description fields */}
            {formData.files.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#2E3A36] flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-[#5B887E]" />
                    <span>Archivos cargados ({formData.files.length})</span>
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
                  {formData.files.map((file, index) => {
                    const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
                    return (
                      <div
                        key={file.id}
                        className="bg-white rounded-2xl p-4 border border-[#D9D3C8] shadow-xs space-y-3 hover:border-[#AEC9C0] transition-colors"
                      >
                        {/* File header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
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

                          {/* Delete button */}
                          <button
                            type="button"
                            id={`btn-delete-file-${file.id}`}
                            onClick={() => handleRemoveFile(file.id)}
                            title="Eliminar este archivo"
                            className="p-1.5 text-[#8E9E99] hover:text-[#C66A4D] hover:bg-[#FDEEE9] rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* 3. Field: ¿Qué examen es y de qué fecha? */}
                        <div className="pt-1 space-y-1">
                          <label
                            htmlFor={`file-desc-${file.id}`}
                            className="text-[11px] font-semibold text-[#5C6E68] flex items-center justify-between"
                          >
                            <span>3. ¿Qué examen es y de qué fecha?</span>
                            <span className="text-[10px] text-[#8E9E99] font-normal">(opcional)</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              id={`file-desc-${file.id}`}
                              value={file.description || ''}
                              onChange={(e) => handleUpdateFileDescription(file.id, e.target.value)}
                              placeholder="Ej. Cuadro hemático y Perfil lipídico - Febrero 2024"
                              className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0]/70 border border-[#D9D3C8] text-xs text-[#2E3A36] placeholder-[#8E9E99] focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Campo de texto opcional: ¿Algo que quieras contarnos sobre estos resultados? */}
            <div className="space-y-2 pt-2 border-t border-[#E8E2D8]">
              <label
                htmlFor="notesOrFindings-input"
                className="text-xs sm:text-sm font-semibold text-[#2E3A36] flex items-center justify-between"
              >
                <span>4. ¿Algo que quieras contarnos sobre estos resultados?</span>
                <span className="text-[11px] text-[#8E9E99] font-normal">(opcional)</span>
              </label>
              <p className="text-xs text-[#5C6E68]">
                Por ejemplo: algún hallazgo que ya conozcas, colesterol alto en el pasado, glucosa alterada, o si tu médico previo te dio alguna recomendación sobre ellos.
              </p>
              <textarea
                id="notesOrFindings-input"
                rows={3}
                value={formData.notesOrFindings || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, notesOrFindings: e.target.value }))}
                placeholder="Escribe aquí notas adicionales o hallazgos conocidos..."
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
              Si marcaste "Sí", asegúrate de adjuntar al menos un examen de laboratorio antes de continuar.
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
          id="btn-continue-step-nine"
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
