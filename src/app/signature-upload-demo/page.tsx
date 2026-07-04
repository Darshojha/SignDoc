import { UploadSignatureComposer } from '@/components/signing/UploadSignatureComposer';
import { AmbientBackgroundMotion } from '@/components/ui/AmbientBackgroundMotion';
import { GlassCard } from '@/components/ui/glass/GlassCard';

export default function SignatureUploadDemoPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12 sm:px-8 lg:px-12">
      <AmbientBackgroundMotion />
      <GlassCard className="relative z-10 w-full max-w-4xl border-white/20 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] sm:p-8 lg:p-10">
        <UploadSignatureComposer />
      </GlassCard>
    </main>
  );
}
