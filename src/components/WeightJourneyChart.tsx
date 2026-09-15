import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import { GripVertical, RotateCcw, Sparkles, TrendingUp } from 'lucide-react';
import { LifeStageKey, WeightStagePoint } from '../types';

interface WeightJourneyChartProps {
  points: WeightStagePoint[];
  onChange: (points: WeightStagePoint[]) => void;
  currentWeightKg?: string;
  lowestWeightSince18Kg?: string;
  highestWeightSince18Kg?: string;
}

interface StageMeta {
  key: LifeStageKey;
  label: string;
  sublabel: string;
}

const STAGES: StageMeta[] = [
  { key: 'infancia', label: 'Infancia', sublabel: '0-12 años' },
  { key: 'adolescencia', label: 'Adolescencia', sublabel: '13-18 años' },
  { key: 'juventud', label: 'Juventud', sublabel: '19-29 años' },
  { key: 'adultez', label: 'Adultez', sublabel: '30-49 años' },
  { key: 'actualidad', label: 'Actualidad', sublabel: 'Hoy' },
];

// Layout constants for the SVG viewBox (fixed coordinate space; scales via CSS width)
const VB_WIDTH = 640;
const VB_HEIGHT = 300;
const PAD_LEFT = 44;
const PAD_RIGHT = 24;
const PAD_TOP = 34;
const PAD_BOTTOM = 56;
const PLOT_WIDTH = VB_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = VB_HEIGHT - PAD_TOP - PAD_BOTTOM;

function stageX(index: number): number {
  if (STAGES.length === 1) return PAD_LEFT + PLOT_WIDTH / 2;
  return PAD_LEFT + (PLOT_WIDTH * index) / (STAGES.length - 1);
}

function ensureAllStages(points: WeightStagePoint[]): WeightStagePoint[] {
  const byStage = new Map(points.map((p) => [p.stage, p]));
  return STAGES.map((s) => byStage.get(s.key) || { stage: s.key, weightKg: null });
}

export const WeightJourneyChart: React.FC<WeightJourneyChartProps> = ({
  points,
  onChange,
  currentWeightKg,
  lowestWeightSince18Kg,
  highestWeightSince18Kg,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draggingStage, setDraggingStage] = useState<LifeStageKey | null>(null);
  const seededRef = useRef(false);

  const normalizedPoints = useMemo(() => ensureAllStages(points), [points]);

  // Scale: derive min/max kg from whatever anchors we already have, with sane defaults.
  const { minVal, maxVal } = useMemo(() => {
    const anchors: number[] = [];
    [currentWeightKg, lowestWeightSince18Kg, highestWeightSince18Kg].forEach((v) => {
      const n = parseFloat(v || '');
      if (!isNaN(n) && n > 0) anchors.push(n);
    });
    normalizedPoints.forEach((p) => {
      if (p.weightKg !== null) anchors.push(p.weightKg);
    });

    if (anchors.length === 0) {
      return { minVal: 50, maxVal: 110 };
    }

    let lo = Math.min(...anchors);
    let hi = Math.max(...anchors);
    // Guarantee a minimum visible span so small differences are still draggable
    if (hi - lo < 20) {
      const mid = (hi + lo) / 2;
      lo = mid - 10;
      hi = mid + 10;
    }
    const pad = (hi - lo) * 0.2;
    return { minVal: Math.max(20, Math.round(lo - pad)), maxVal: Math.round(hi + pad) };
  }, [currentWeightKg, lowestWeightSince18Kg, highestWeightSince18Kg, normalizedPoints]);

  const weightToY = useCallback(
    (weight: number) => {
      const clamped = Math.min(maxVal, Math.max(minVal, weight));
      const ratio = (clamped - minVal) / (maxVal - minVal || 1);
      return PAD_TOP + PLOT_HEIGHT - ratio * PLOT_HEIGHT;
    },
    [minVal, maxVal]
  );

  const yToWeight = useCallback(
    (y: number) => {
      const clampedY = Math.min(PAD_TOP + PLOT_HEIGHT, Math.max(PAD_TOP, y));
      const ratio = (PAD_TOP + PLOT_HEIGHT - clampedY) / PLOT_HEIGHT;
      const raw = minVal + ratio * (maxVal - minVal);
      return Math.round(raw * 2) / 2; // redondear a 0.5 kg
    },
    [minVal, maxVal]
  );

  // Auto-seed "Actualidad" with the current weight once, so the chart never starts fully empty.
  useEffect(() => {
    if (seededRef.current) return;
    const current = parseFloat(currentWeightKg || '');
    if (isNaN(current) || current <= 0) return;
    const hasActualidad = normalizedPoints.find((p) => p.stage === 'actualidad')?.weightKg;
    if (hasActualidad) {
      seededRef.current = true;
      return;
    }
    seededRef.current = true;
    const updated = normalizedPoints.map((p) =>
      p.stage === 'actualidad' ? { ...p, weightKg: current } : p
    );
    onChange(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeightKg]);

  const svgPointFromClientY = useCallback((clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return PAD_TOP;
    const rect = svg.getBoundingClientRect();
    const scale = VB_HEIGHT / rect.height;
    return (clientY - rect.top) * scale;
  }, []);

  const updateStageWeight = useCallback(
    (stage: LifeStageKey, weightKg: number | null) => {
      const updated = normalizedPoints.map((p) => (p.stage === stage ? { ...p, weightKg } : p));
      onChange(updated);
    },
    [normalizedPoints, onChange]
  );

  const handlePointerDown = (stage: LifeStageKey) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDraggingStage(stage);
    const y = svgPointFromClientY(e.clientY);
    updateStageWeight(stage, yToWeight(y));
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingStage) return;
    const y = svgPointFromClientY(e.clientY);
    updateStageWeight(draggingStage, yToWeight(y));
  };

  const handlePointerUp = () => {
    setDraggingStage(null);
  };

  const handleTrackClick = (stage: LifeStageKey) => (e: React.MouseEvent<SVGRectElement>) => {
    const y = svgPointFromClientY(e.clientY);
    updateStageWeight(stage, yToWeight(y));
  };

  const nudge = (stage: LifeStageKey, deltaKg: number) => {
    const current = normalizedPoints.find((p) => p.stage === stage)?.weightKg;
    const base = current === null || current === undefined ? (minVal + maxVal) / 2 : current;
    updateStageWeight(stage, Math.round((base + deltaKg) * 2) / 2);
  };

  const clearStage = (stage: LifeStageKey) => {
    updateStageWeight(stage, null);
  };

  // Build a smooth path connecting only the stages that have a value set.
  const activePoints = normalizedPoints
    .map((p, idx) => ({ ...p, x: stageX(idx) }))
    .filter((p) => p.weightKg !== null) as (WeightStagePoint & { x: number; weightKg: number })[];

  const linePath = useMemo(() => {
    if (activePoints.length < 2) return '';
    return activePoints
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${weightToY(p.weightKg)}`)
      .join(' ');
  }, [activePoints, weightToY]);

  const yGridLines = useMemo(() => {
    const steps = 4;
    const lines: { y: number; value: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const value = minVal + ((maxVal - minVal) * i) / steps;
      lines.push({ y: weightToY(value), value: Math.round(value) });
    }
    return lines;
  }, [minVal, maxVal, weightToY]);

  const filledCount = activePoints.length;

  return (
    <div className="space-y-5 bg-white/70 backdrop-blur-xs p-6 sm:p-8 rounded-3xl border border-[#AEC9C0]/30 shadow-xs">
      <div className="border-b border-[#E8E2D8] pb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#6E9E93]" />
          <h2
            className="text-xl sm:text-2xl text-[#2E3A36] font-normal"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Dibuja tu curva de peso
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-[#5C6E68] mt-1.5 leading-relaxed">
          Arrastra el punto de cada etapa hacia arriba o abajo para marcar, aproximadamente,
          cuánto pesabas. No tienes que ser exacto ni recordar todas las etapas — lo importante
          es ver la forma general de tu curva. Más abajo podrás anotar qué eventos de tu vida
          (una universidad, una boda, un embarazo, un divorcio, un medicamento nuevo) coinciden
          con las subidas y bajadas — así nos ayudas a entender tu historia, no solo tus números.
        </p>
      </div>

      <div className="relative select-none touch-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
          className="w-full h-auto touch-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Y axis grid + labels */}
          {yGridLines.map((line, idx) => (
            <g key={idx}>
              <line
                x1={PAD_LEFT}
                x2={VB_WIDTH - PAD_RIGHT}
                y1={line.y}
                y2={line.y}
                stroke="#E8E2D8"
                strokeWidth={1}
                strokeDasharray={idx === 0 || idx === yGridLines.length - 1 ? undefined : '3 4'}
              />
              <text
                x={PAD_LEFT - 10}
                y={line.y + 3}
                textAnchor="end"
                className="fill-[#8E9E99]"
                style={{ fontSize: 10 }}
              >
                {line.value}
              </text>
            </g>
          ))}

          {/* Draggable tracks + points per stage */}
          {STAGES.map((stage, idx) => {
            const x = stageX(idx);
            const point = normalizedPoints.find((p) => p.stage === stage.key);
            const hasValue = point && point.weightKg !== null;
            const y = hasValue ? weightToY(point!.weightKg as number) : PAD_TOP + PLOT_HEIGHT / 2;

            return (
              <g key={stage.key}>
                {/* Invisible wide track to make clicking/tapping easy */}
                <rect
                  x={x - 22}
                  y={PAD_TOP}
                  width={44}
                  height={PLOT_HEIGHT}
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={handleTrackClick(stage.key)}
                />

                {/* Vertical guide */}
                <line
                  x1={x}
                  x2={x}
                  y1={PAD_TOP}
                  y2={PAD_TOP + PLOT_HEIGHT}
                  stroke="#EFEAE1"
                  strokeWidth={1}
                />

                {hasValue ? (
                  <>
                    <motion.circle
                      cx={x}
                      cy={y}
                      r={draggingStage === stage.key ? 11 : 9}
                      className="fill-[#5B887E] stroke-white cursor-grab active:cursor-grabbing"
                      strokeWidth={3}
                      onPointerDown={handlePointerDown(stage.key)}
                      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}
                    />
                    <text
                      x={x}
                      y={y - 16}
                      textAnchor="middle"
                      className="fill-[#2E3A36] font-semibold"
                      style={{ fontSize: 12 }}
                    >
                      {point!.weightKg} kg
                    </text>
                  </>
                ) : (
                  <circle
                    cx={x}
                    cy={y}
                    r={7}
                    className="fill-white stroke-[#C8C2B7] cursor-pointer"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    onClick={handleTrackClick(stage.key)}
                  />
                )}

                {/* Stage label */}
                <text
                  x={x}
                  y={VB_HEIGHT - PAD_BOTTOM + 22}
                  textAnchor="middle"
                  className="fill-[#2E3A36] font-semibold"
                  style={{ fontSize: 12 }}
                >
                  {stage.label}
                </text>
                <text
                  x={x}
                  y={VB_HEIGHT - PAD_BOTTOM + 36}
                  textAnchor="middle"
                  className="fill-[#8E9E99]"
                  style={{ fontSize: 10 }}
                >
                  {stage.sublabel}
                </text>
              </g>
            );
          })}

          {/* Trajectory line, drawn on top of the tracks but below the point circles */}
          {linePath && (
            <motion.path
              d={linePath}
              fill="none"
              stroke="#AEC9C0"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          )}
        </svg>
      </div>

      {/* Fine controls per stage: nudge / clear, helpful for precision and accessibility */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {STAGES.map((stage) => {
          const point = normalizedPoints.find((p) => p.stage === stage.key);
          const hasValue = point && point.weightKg !== null;
          return (
            <div
              key={stage.key}
              className="p-2.5 rounded-xl bg-[#FAF6F0]/80 border border-[#E8E2D8] flex flex-col items-center gap-1.5"
            >
              <span className="text-[10px] font-semibold text-[#5C6E68] uppercase tracking-wide text-center">
                {stage.label}
              </span>
              {hasValue ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => nudge(stage.key, -0.5)}
                      className="w-6 h-6 rounded-full bg-white border border-[#D9D3C8] text-[#5C6E68] text-xs font-bold hover:border-[#6E9E93] transition-colors"
                    >
                      −
                    </button>
                    <span className="text-xs font-semibold text-[#2E3A36] min-w-[3.2rem] text-center">
                      {point!.weightKg} kg
                    </span>
                    <button
                      type="button"
                      onClick={() => nudge(stage.key, 0.5)}
                      className="w-6 h-6 rounded-full bg-white border border-[#D9D3C8] text-[#5C6E68] text-xs font-bold hover:border-[#6E9E93] transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => clearStage(stage.key)}
                    className="text-[10px] text-[#8E9E99] hover:text-[#C66A4D] flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    No lo recuerdo
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => updateStageWeight(stage.key, Math.round((minVal + maxVal) / 2))}
                  className="text-[11px] px-2 py-1 rounded-lg bg-white border border-dashed border-[#C8C2B7] text-[#8E9E99] hover:border-[#6E9E93] hover:text-[#5B887E] transition-colors flex items-center gap-1"
                >
                  <GripVertical className="w-3 h-3" />
                  Marcar
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#E8E2D8]">
        <Sparkles className="w-4 h-4 text-[#B27318] shrink-0 mt-0.5" />
        <p className="text-xs text-[#5C6E68] leading-relaxed">
          {filledCount === 0
            ? 'Aún no has marcado ninguna etapa. Toca cualquier punto punteado para empezar a dibujar tu curva.'
            : filledCount < STAGES.length
            ? `Llevas ${filledCount} de ${STAGES.length} etapas marcadas. Marca las que recuerdes — está bien dejar alguna en blanco.`
            : '¡Curva completa! Esto le da a la Dra. Castro una vista clara de tu trayectoria de peso.'}
        </p>
      </div>
    </div>
  );
};
