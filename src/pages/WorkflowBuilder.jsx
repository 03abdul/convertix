import { ArrowDown, ArrowUp, Contrast, Crop, Minimize2, Palette, Plus, Repeat, RotateCw, Scaling, Sparkles, Stamp, Trash2, Wand2, Workflow as WorkflowIcon, X } from 'lucide-react';
import { useState } from 'react';
import PageTransition from '@/components/PageTransition';
import Button from '@/components/Button';
import FileWorkbench from '@/components/ui/FileWorkbench';
import ResultsBanner from '@/components/ui/ResultsBanner';
import PageHeader from '@/components/ui/PageHeader';
import Panel from '@/components/ui/Panel';
import Disclosure from '@/components/ui/Disclosure';
import { Select, TextInput } from '@/components/ui/Controls';
import { useApp } from '@/context/AppContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useConfirm } from '@/context/DialogContext';
import { useImageBatch } from '@/hooks/useImageBatch';
import { usePersistentState } from '@/hooks/usePersistentState';
import { pickSupportedFormat, useSupportedFormats } from '@/hooks/useSupportedFormats';
import { IMAGE_ACCEPT, IMAGE_FORMAT_CHIPS } from '@/utils/imageAccept';
import { pluralize } from '@/utils/format';
import { moveItem } from '@/utils/reorder';

const STEP_TYPES = [
  { id: 'resize', label: 'Resize', icon: Scaling, defaults: { width: 1080, height: 1080, maintainAspect: true } },
  { id: 'crop', label: 'Crop', icon: Crop, defaults: { preset: 'square' } },
  { id: 'rotate', label: 'Rotate', icon: RotateCw, defaults: { degrees: 90, flipH: false, flipV: false } },
  { id: 'filter', label: 'Filter', icon: Sparkles, defaults: { filter: 'grayscale' } },
  { id: 'grayscale', label: 'Grayscale', icon: Contrast, defaults: {} },
  { id: 'sepia', label: 'Sepia', icon: Palette, defaults: {} },
  { id: 'watermark', label: 'Watermark', icon: Stamp, defaults: { text: 'Convertix', opacity: 60 } },
  { id: 'compress', label: 'Compress', icon: Minimize2, defaults: { quality: 70 } },
  { id: 'convert', label: 'Convert', icon: Repeat, defaults: { format: 'webp', quality: 85 } },
];

const TEMPLATES = [
  { name: 'Web-ready photos', description: 'Resize to 1600 px, convert to WebP', steps: [['resize', { width: 1600, height: 1600 }], ['convert', { format: 'webp', quality: 80 }]] },
  { name: 'Social squares', description: 'Square crop, 1080 px, compressed', steps: [['crop', {}], ['resize', { width: 1080, height: 1080 }], ['compress', { quality: 80 }]] },
  { name: 'Grayscale thumbnails', description: 'Small black-and-white previews', steps: [['resize', { width: 400, height: 400 }], ['grayscale', {}]] },
];

const mini = 'rounded-lg border border-white/10 bg-dark-900/60 px-2 py-1.5 text-xs text-dark-100 focus:border-secondary-500/50 focus:outline-none';
let counter = 0;
const makeStep = (type, overrides = {}) => {
  const definition = STEP_TYPES.find((step) => step.id === type);
  return { id: `${type}-${Date.now()}-${counter++}`, type, ...definition.defaults, ...overrides };
};

function StepControls({ step, update, formats }) {
  const range = (key, min, max, width = 'w-24') => (
    <label className="flex items-center gap-2 text-xs text-dark-300">
      <input type="range" aria-label={`${step.type} ${key}`} min={min} max={max} value={step[key]} onChange={(event) => update({ [key]: Number(event.target.value) })} className={`${width} accent-secondary-500`} />
      <span className="w-9 tabular-nums text-dark-100">{step[key]}%</span>
    </label>
  );
  switch (step.type) {
    case 'convert':
      return (
        <>
          <select aria-label="Output format" value={step.format} onChange={(event) => update({ format: event.target.value })} className={mini}>
            {formats.map((format) => <option key={format} value={format}>{format.toUpperCase()}</option>)}
          </select>
          {step.format !== 'png' && step.format !== 'bmp' && range('quality', 10, 100)}
        </>
      );
    case 'compress': return range('quality', 10, 100);
    case 'resize':
      return (
        <>
          <input type="number" aria-label="Width" min="1" value={step.width} onChange={(event) => update({ width: Number(event.target.value) || 1 })} className={`${mini} w-20`} />
          <span className="text-xs text-dark-500">×</span>
          <input type="number" aria-label="Height" min="1" value={step.height} disabled={step.maintainAspect} onChange={(event) => update({ height: Number(event.target.value) || 1 })} className={`${mini} w-20 disabled:opacity-40`} />
          <label className="flex items-center gap-1.5 text-xs text-dark-300"><input type="checkbox" checked={step.maintainAspect} onChange={(event) => update({ maintainAspect: event.target.checked })} className="accent-secondary-500" /> Keep ratio</label>
        </>
      );
    case 'crop':
      return (
        <select aria-label="Crop shape" value={step.preset} onChange={(event) => update({ preset: event.target.value })} className={mini}>
          <option value="square">Square 1:1</option>
          <option value="4:3">4:3</option>
          <option value="16:9">16:9</option>
          <option value="instagram">Instagram</option>
          <option value="youtube">YouTube</option>
        </select>
      );
    case 'rotate':
      return (
        <>
          <select aria-label="Rotation" value={step.degrees} onChange={(event) => update({ degrees: Number(event.target.value) })} className={mini}>
            {[0, 90, 180, 270].map((degrees) => <option key={degrees} value={degrees}>{degrees}°</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-dark-300"><input type="checkbox" checked={step.flipH} onChange={(event) => update({ flipH: event.target.checked })} className="accent-secondary-500" /> Flip H</label>
          <label className="flex items-center gap-1.5 text-xs text-dark-300"><input type="checkbox" checked={step.flipV} onChange={(event) => update({ flipV: event.target.checked })} className="accent-secondary-500" /> Flip V</label>
        </>
      );
    case 'filter':
      return (
        <select aria-label="Filter" value={step.filter} onChange={(event) => update({ filter: event.target.value })} className={mini}>
          <option value="grayscale">Grayscale</option>
          <option value="sepia">Sepia</option>
          <option value="negative">Negative</option>
          <option value="vintage">Vintage</option>
          <option value="blackAndWhite">Black &amp; white</option>
        </select>
      );
    case 'watermark':
      return (
        <>
          <input type="text" aria-label="Watermark text" value={step.text} onChange={(event) => update({ text: event.target.value })} className={`${mini} w-32`} />
          {range('opacity', 0, 100, 'w-20')}
        </>
      );
    default:
      return <span className="text-xs text-dark-500">No options</span>;
  }
}

export default function WorkflowBuilder() {
  const { settings } = useApp();
  const { notify } = useFeedback();
  const confirm = useConfirm();
  const supportedFormats = useSupportedFormats();
  const [steps, setSteps] = usePersistentState('convertix:workflow-steps', []);
  const [presets, setPresets] = usePersistentState('mediaforge-workflows', []);
  const [pattern, setPattern] = useState('{name}.{ext}');
  const [presetName, setPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const safeFormat = (format) => pickSupportedFormat(format, supportedFormats);

  const batch = useImageBatch({
    source: 'Workflow Builder',
    operation: 'workflow',
    pattern: pattern || '{name}.{ext}',
    getSteps: () => steps,
    getContext: () => ({ preserveMetadata: settings.preserveMetadata }),
  });

  const addStep = (type) => {
    const step = makeStep(type);
    if (step.format) step.format = safeFormat(step.format);
    setSteps((current) => [...current, step]);
  };
  const updateStep = (index, patch) => setSteps((current) => current.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  const applyTemplate = (template) => setSteps(template.steps.map(([type, overrides]) => {
    const step = makeStep(type, overrides);
    if (step.format) step.format = safeFormat(step.format);
    return step;
  }));

  const savePreset = () => {
    const name = presetName.trim();
    if (!name || steps.length === 0) {
      notify('Name the workflow and add at least one step first.', 'warning', { title: 'Almost there' });
      return;
    }
    setPresets((current) => [...current.filter((preset) => preset.name !== name), { name, steps }]);
    setSelectedPreset(name);
    notify(`"${name}" is ready to load from Saved workflows.`, 'success', { title: 'Workflow saved' });
  };
  const loadPreset = (name) => {
    setSelectedPreset(name);
    const preset = presets.find((item) => item.name === name);
    if (preset) setSteps(preset.steps.map((step) => ({ ...step, id: `${step.type}-${Date.now()}-${counter++}`, ...(step.format ? { format: safeFormat(step.format) } : {}) })));
  };
  const removePreset = async () => {
    const ok = await confirm({
      title: `Delete “${selectedPreset}”?`,
      message: 'This saved workflow will be removed. Steps currently in your pipeline are not affected.',
      confirmLabel: 'Delete workflow',
      tone: 'danger',
    });
    if (!ok) return;
    setPresets((current) => current.filter((preset) => preset.name !== selectedPreset));
    setSelectedPreset('');
  };

  const pipeline = (
    <Panel
      title="Pipeline"
      description="Every image goes through these steps, top to bottom."
      action={steps.length > 0 && <Button variant="ghost" size="sm" onClick={() => setSteps([])}><Trash2 className="h-4 w-4" /> Clear steps</Button>}
    >
      {steps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-dark-900/30 p-6 text-center">
          <WorkflowIcon className="mx-auto mb-2 h-7 w-7 text-dark-500" aria-hidden="true" />
          <p className="text-sm font-semibold text-dark-100">Start from a template, or add steps below</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {TEMPLATES.map((template) => (
              <button key={template.name} type="button" onClick={() => applyTemplate(template)} className="rounded-xl border border-white/10 bg-dark-800/60 p-3 text-left transition-colors hover:border-secondary-500/40 hover:bg-dark-800">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-dark-100"><Wand2 className="h-3.5 w-3.5 text-secondary-400" aria-hidden="true" />{template.name}</span>
                <span className="mt-0.5 block text-xs text-dark-400">{template.description}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ol className="space-y-2">
          {steps.map((step, index) => {
            const type = STEP_TYPES.find((item) => item.id === step.type);
            const Icon = type.icon;
            return (
              <li key={step.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-dark-900/40 p-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary-500/15 text-xs font-bold text-secondary-300">{index + 1}</span>
                <span className="flex w-28 shrink-0 items-center gap-2 text-sm font-semibold text-dark-100"><Icon className="h-4 w-4 text-secondary-400" aria-hidden="true" />{type.label}</span>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2"><StepControls step={step} update={(patch) => updateStep(index, patch)} formats={supportedFormats} /></div>
                <div className="flex shrink-0 items-center">
                  <button type="button" aria-label={`Move ${type.label} step up`} disabled={index === 0} onClick={() => setSteps((current) => moveItem(current, index, index - 1))} className="rounded-lg p-1.5 text-dark-400 hover:bg-white/10 hover:text-dark-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" aria-label={`Move ${type.label} step down`} disabled={index === steps.length - 1} onClick={() => setSteps((current) => moveItem(current, index, index + 1))} className="rounded-lg p-1.5 text-dark-400 hover:bg-white/10 hover:text-dark-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" aria-label={`Remove ${type.label} step`} onClick={() => setSteps((current) => current.filter((_, i) => i !== index))} className="rounded-lg p-1.5 text-dark-400 hover:bg-error-500/15 hover:text-error-300"><X className="h-4 w-4" /></button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-1.5" role="group" aria-label="Add a step">
        <span className="mr-1 text-xs font-medium text-dark-400">Add step</span>
        {STEP_TYPES.map((type) => (
          <button key={type.id} type="button" onClick={() => addStep(type.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-dark-200 transition-colors hover:border-secondary-500/40 hover:bg-secondary-500/10 hover:text-secondary-200">
            <Plus className="h-3 w-3" aria-hidden="true" />{type.label}
          </button>
        ))}
      </div>

      <Disclosure title={`Saved workflows${presets.length ? ` (${presets.length})` : ''}`} className="mt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Load a saved workflow" value={selectedPreset} onChange={(event) => loadPreset(event.target.value)}>
            <option value="">Choose…</option>
            {presets.map((preset) => <option key={preset.name} value={preset.name}>{preset.name}</option>)}
          </Select>
          <div className="flex items-end gap-2">
            <TextInput className="flex-1" label="Save the current steps as" value={presetName} onChange={(event) => setPresetName(event.target.value)} />
            <Button variant="secondary" size="md" onClick={savePreset}>Save</Button>
          </div>
        </div>
        {selectedPreset && <Button variant="ghost" size="sm" onClick={removePreset}><Trash2 className="h-4 w-4" /> Delete “{selectedPreset}”</Button>}
      </Disclosure>
    </Panel>
  );

  return (
    <PageTransition>
      <PageHeader
        icon={WorkflowIcon}
        accent="accent"
        title="Workflow Builder"
        description="Chain steps like resize, watermark and convert, then run them on a whole batch of images."
      />

      <FileWorkbench
        files={batch.files}
        rows={batch.rows}
        onFiles={batch.addFiles}
        onRemove={batch.removeFile}
        onClear={batch.clear}
        onRetry={batch.retry}
        noun="image"
        maxFiles={batch.maxFiles}
        accept={IMAGE_ACCEPT}
        formats={IMAGE_FORMAT_CHIPS}
        folder
        toolbar={pipeline}
        dropLabel="Drop images to run the pipeline on"
        dropSublabel={steps.length ? `${pluralize(steps.length, 'step')} will run on each image` : 'Add at least one step first'}
        summary={<ResultsBanner summary={batch.summary} onDownloadAll={batch.downloadAll} zipping={batch.zipping} zipProgress={batch.zipProgress} showSavings noun="image" />}
        asideTitle="Run"
        aside={
          <>
            <p className="text-sm text-dark-300">{steps.length ? `${pluralize(steps.length, 'step')}, run in order on every image.` : 'Add steps above to enable the run button.'}</p>
            <Disclosure title="Output filenames">
              <TextInput label="Pattern" value={pattern} onChange={(event) => setPattern(event.target.value)} hint="Tokens: {name}  {index}  {operation}  {ext}" />
            </Disclosure>
          </>
        }
        run={{
          label: `Run on ${pluralize(batch.files.length, 'image')}`,
          onClick: batch.run,
          disabled: steps.length === 0,
          progress: batch.progress,
          progressLabel: batch.currentName ? `Processing ${batch.currentName}` : 'Running pipeline',
          onCancel: batch.cancel,
          hint: steps.length === 0 ? 'Add at least one step to run.' : undefined,
        }}
      />
    </PageTransition>
  );
}
