import { getRepoStats } from "@/lib/github";
import { SiteNav } from "@/components/site/site-nav";
import { Hero } from "@/components/site/hero";
import { QuickStart } from "@/components/site/quick-start";
import { NumbersStrip } from "@/components/site/numbers-strip";
import { WhySection } from "@/components/site/why-section";
import { WhenToUse } from "@/components/site/when-to-use";
import { ValueProps } from "@/components/site/value-props";
import { Features } from "@/components/site/features";
import { StarCTA } from "@/components/site/star-cta";
import { SiteFooter } from "@/components/site/site-footer";
import { Reveal } from "@/components/site/reveal";

export default async function Home() {
  const { stars } = await getRepoStats();

  return (
    <>
      <SiteNav />
      <main className="flex flex-1 flex-col">
        <Hero />
        <Reveal>
          <QuickStart />
        </Reveal>
        <Reveal>
          <NumbersStrip />
        </Reveal>
        <Reveal>
          <WhySection />
        </Reveal>
        <Reveal>
          <WhenToUse />
        </Reveal>
        <Reveal>
          <ValueProps />
        </Reveal>
        <Reveal>
          <Features />
        </Reveal>
        <Reveal>
          <StarCTA stars={stars} />
        </Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
