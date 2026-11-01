import Image from 'next/image';
import type { Metadata } from 'next';
import { RebarVisual } from '@/components/site/rebar-visual';
import { PageHero, Section } from '@/components/site/section';
import { getDictionary, type Locale } from '@/lib/i18n';
import { routes } from '@/lib/paths';
import { buildMetadata } from '@/lib/seo';
import { getPublishedProjects, getSeoOverride } from '@/server/public/catalog';

type Props = { params: Promise<{ locale: Locale }> };
type Project = Awaited<ReturnType<typeof getPublishedProjects>>[number];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(locale);
  return buildMetadata({ locale, path: routes.projects, title: t.seo.projectsTitle, description: t.seo.projectsDesc, override: await getSeoOverride(routes.projects) });
}

function ProjectCard({ project, illustrationLabel, labels }: { project: Project; illustrationLabel?: string; labels: { city: string; workType: string; volume: string } }) {
  return (
    <article className="card overflow-hidden">
      <div className="relative aspect-[16/10] bg-graphite-900 tech-grid">
        {project.images[0]
          ? <Image src={project.images[0]} alt={project.title} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" unoptimized={project.images[0].startsWith('http')} />
          : <RebarVisual variant="card" className="absolute inset-0 h-full w-full" />}
        {illustrationLabel && <span className="absolute left-3 top-3 badge bg-white text-graphite-900">{illustrationLabel}</span>}
      </div>
      <div className="space-y-3 p-6">
        <h3 className="text-lg font-bold">{project.title}</h3>
        <dl className="space-y-1 text-sm">
          {project.city && <div><dt className="inline text-graphite-500">{labels.city}: </dt><dd className="inline font-semibold">{project.city}</dd></div>}
          {project.workType && <div><dt className="inline text-graphite-500">{labels.workType}: </dt><dd className="inline font-semibold">{project.workType}</dd></div>}
          {project.volume && <div><dt className="inline text-graphite-500">{labels.volume}: </dt><dd className="inline font-semibold">{project.volume}</dd></div>}
        </dl>
        {project.description && <p className="text-sm text-graphite-600">{project.description}</p>}
      </div>
    </article>
  );
}

export default async function ProjectsPage({ params }: Props) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const all = await getPublishedProjects();
  const real = all.filter((p) => !p.isIllustration);
  const examples = all.filter((p) => p.isIllustration);
  const labels = { city: t.projects.city, workType: t.projects.workType, volume: t.projects.volume };

  return (
    <>
      <PageHero eyebrow={t.nav.projects} title={t.projects.title} />
      <Section>
        {real.length === 0
          ? <p className="card p-8 text-graphite-500">{t.projects.empty}</p>
          : <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{real.map((p) => <ProjectCard key={p.id} project={p} labels={labels} />)}</div>}
      </Section>
      {examples.length > 0 && (
        <Section tone="muted" title={t.projects.examplesTitle} intro={t.projects.examplesNote}>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {examples.map((p) => <ProjectCard key={p.id} project={p} labels={labels} illustrationLabel={t.common.illustration} />)}
          </div>
        </Section>
      )}
    </>
  );
}
