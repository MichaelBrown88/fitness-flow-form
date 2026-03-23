import { Heart, Target, Lightbulb } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import SectionHeader from '@/components/landing/SectionHeader';
import StickyCardStack from '@/components/ui/StickyCardStack';
import { LANDING_H2_ACCENT_LIGHT } from '@/constants/landingCopy';

const values = [
  {
    icon: Heart,
    title: 'Born from Frustration',
    description: 'I was drowning in spreadsheets, photos in Google Drive, and hand-typed emails. I built One Assess because no tool did what I actually needed on the gym floor.',
    color: 'slate',
  },
  {
    icon: Target,
    title: 'Designed for Retention',
    description:
      'Clients stay when they see progress. Every feature (the score, the gamification, the live reports) exists to make your clients feel invested in their journey.',
    color: 'volt',
  },
  {
    icon: Lightbulb,
    title: 'Practical, Not Academic',
    description: 'No unnecessary complexity. Every data point, every recommendation, every metric was chosen because it changes how a coach writes a program.',
    color: 'slate',
  },
];

const colorClasses: Record<string, string> = {
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
  volt: 'border-gradient-medium/50 bg-gradient-light/90 text-primary',
};

export function BuiltByExperts() {
  return (
    <section className="py-24 sm:py-32 px-6 bg-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute left-[-10%] top-[30%] h-96 w-96 rounded-full bg-slate-300/12 blur-3xl" />
        <div className="absolute bottom-[20%] right-[-10%] h-96 w-96 rounded-full bg-gradient-light/25 blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <StickyCardStack
          variant="card-stack"
          desktopCols={3}
          desktopGap="gap-8"
          breakpoint="md"
          header={
            <SectionHeader
              pill="Our Story"
              title={
                <>
                  Built by <span className={LANDING_H2_ACCENT_LIGHT}>Coaches</span>, for Coaches
                </>
              }
              subtitle="One Assess was built to solve a real problem: my own. Now it helps coaches everywhere."
            />
          }
        >
          {values.map((value, index) => {
            const Icon = value.icon;
            return (
              <GlassCard key={index} className="p-8 h-full flex flex-col">
                <div className={`w-16 h-16 rounded-2xl ${colorClasses[value.color]} border-2 flex items-center justify-center mb-6 shadow-sm`}>
                  <Icon size={28} />
                </div>
                <h3 className="text-balance text-xl font-bold text-slate-900 mb-3">{value.title}</h3>
                <p className="text-balance text-slate-500 text-sm leading-relaxed flex-grow">
                  {value.description}
                </p>
              </GlassCard>
            );
          })}
        </StickyCardStack>

        <div className="mt-16 text-center">
          <p className="text-balance text-slate-400 text-sm max-w-2xl mx-auto">
            Every feature in One Assess exists because a coach needed it.
            If you have an idea that would make your workflow better, we want to hear it.
          </p>
        </div>
      </div>
    </section>
  );
}
