import { lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import { DownloadProvider } from '@/context/DownloadContext';
import { FeedbackProvider } from '@/context/FeedbackContext';
import { DialogProvider } from '@/context/DialogContext';
import AppLayout from '@/layouts/AppLayout';
// The landing page ships with the main bundle: one less request when you open or refresh the app.
import Dashboard from '@/pages/Dashboard';

const ImageConverter = lazy(() => import('@/pages/ImageConverter'));
const ImageOptimizer = lazy(() => import('@/pages/ImageOptimizer'));
const ImageEditor = lazy(() => import('@/pages/ImageEditor'));
const WatermarkStudio = lazy(() => import('@/pages/WatermarkStudio'));
const PdfTools = lazy(() => import('@/pages/PdfTools'));
const ImageToPdf = lazy(() => import('@/pages/ImageToPdf'));
const DocumentConverter = lazy(() => import('@/pages/DocumentConverter'));
const BatchProcessing = lazy(() => import('@/pages/BatchProcessing'));
const WorkflowBuilder = lazy(() => import('@/pages/WorkflowBuilder'));
const Downloads = lazy(() => import('@/pages/Downloads'));
const Settings = lazy(() => import('@/pages/Settings'));
const ImageMetadata = lazy(() => import('@/pages/ImageMetadata'));
const QuickTools = lazy(() => import('@/pages/QuickTools'));
const NotFound = lazy(() => import('@/pages/NotFound'));

export default function App() {
  return (
    <AppProvider>
      <FeedbackProvider>
        <DialogProvider>
        <DownloadProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/converter" element={<ImageConverter />} />
                  <Route path="/optimizer" element={<ImageOptimizer />} />
                  <Route path="/editor" element={<ImageEditor />} />
                  <Route path="/watermark" element={<WatermarkStudio />} />
                  <Route path="/metadata" element={<ImageMetadata />} />
                  <Route path="/quick-tools" element={<QuickTools />} />
                  <Route path="/pdf-tools" element={<PdfTools />} />
                  <Route path="/image-to-pdf" element={<ImageToPdf />} />
                  <Route path="/document-converter" element={<DocumentConverter />} />
                  <Route path="/batch" element={<BatchProcessing />} />
                  <Route path="/workflow" element={<WorkflowBuilder />} />
                  <Route path="/downloads" element={<Downloads />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
          </BrowserRouter>
        </DownloadProvider>
        </DialogProvider>
      </FeedbackProvider>
    </AppProvider>
  );
}
