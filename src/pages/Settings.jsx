import { Cpu, Lock, RotateCcw, Settings as SettingsIcon, ShieldCheck, Zap } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import Button from '@/components/Button';
import PageHeader from '@/components/ui/PageHeader';
import Panel from '@/components/ui/Panel';
import Segmented from '@/components/ui/Segmented';
import { Slider, Toggle } from '@/components/ui/Controls';
import { useApp } from '@/context/AppContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useConfirm } from '@/context/DialogContext';
import { FORMAT_INFO } from '@/utils/imageAccept';
import { pickSupportedFormat, useSupportedFormats } from '@/hooks/useSupportedFormats';

export default function Settings() {
  const { settings, updateSettings } = useApp();
  const { notify } = useFeedback();
  const confirm = useConfirm();
  const supportedFormats = useSupportedFormats();
  // Show the effective default: a saved format this browser cannot encode is replaced by a working one.
  const effectiveFormat = pickSupportedFormat(settings.defaultFormat, supportedFormats);

  const resetToolSettings = async () => {
    const ok = await confirm({
      title: 'Reset all tool settings?',
      message: 'Every tool goes back to its defaults: formats, quality, page sizes, your Workflow pipeline and more. Your files are not affected.',
      confirmLabel: 'Reset settings',
      tone: 'warning',
    });
    if (!ok) return;
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith('convertix:'))
        .forEach((key) => localStorage.removeItem(key));
      notify('Each tool starts from its defaults next time you open it.', 'success', { title: 'Settings reset' });
    } catch {
      notify('Settings could not be cleared in this browser.');
    }
  };

  return (
    <PageTransition>
      <PageHeader icon={SettingsIcon} accent="neutral" title="Settings" description="Defaults for new conversions. Each tool also remembers its own last-used options." />

      <div className="mb-5 flex items-start gap-4 rounded-2xl border border-success-500/20 bg-gradient-to-r from-success-500/10 to-transparent p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-success-500/25 bg-success-500/10">
          <ShieldCheck className="h-5 w-5 text-success-400" aria-hidden="true" />
        </span>
        <div>
          <h2 className="mb-1 font-semibold text-success-300">Your files never leave your device</h2>
          <p className="text-sm text-dark-300">
            Convertix runs entirely in your browser, using the Canvas API, Web Workers and a few client-side libraries.
            Files are not uploaded to a server. Only your preferences are saved, in this browser&apos;s local storage.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Default conversion" description="Used when you open the Converter and Batch tools for the first time.">
          <div className="space-y-5">
            <div>
              <p className="mb-1.5 text-xs font-medium text-dark-400">Output format</p>
              <Segmented ariaLabel="Default output format" value={effectiveFormat} onChange={(defaultFormat) => updateSettings({ defaultFormat })} options={supportedFormats.map((format) => ({ value: format, label: FORMAT_INFO[format].label }))} />
            </div>
            <Slider label="Quality" value={settings.defaultQuality} min={10} max={100} onChange={(defaultQuality) => updateSettings({ defaultQuality })} minLabel="Smaller file" maxLabel="Better quality" />
          </div>
        </Panel>

        <Panel title="Image options">
          <Toggle
            label="Keep JPEG metadata (EXIF)"
            description="Keeps camera info and date when converting a JPEG to JPEG. Other formats never keep it. Turn off to strip location data."
            checked={settings.preserveMetadata}
            onChange={(preserveMetadata) => updateSettings({ preserveMetadata })}
          />
        </Panel>

        <Panel title="Saved tool settings" description="Tools remember your last format, quality and options on this device." className="lg:col-span-2">
          <Button variant="ghost" size="sm" onClick={resetToolSettings}><RotateCcw className="h-4 w-4" /> Reset all tool settings</Button>
        </Panel>

        <Panel title="About this app" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              [Cpu, 'text-secondary-400', 'Processing', 'In your browser'],
              [Lock, 'text-success-400', 'Privacy', 'Nothing is uploaded'],
              [Zap, 'text-accent-400', 'Cost', 'Free, no limits'],
            ].map(([Icon, color, label, value]) => (
              <div key={label} className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${color}`} aria-hidden="true" />
                <div>
                  <p className="text-xs text-dark-400">{label}</p>
                  <p className="text-sm font-semibold text-dark-100">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </PageTransition>
  );
}
