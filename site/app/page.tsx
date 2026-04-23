import { getRepoStats } from "@/lib/github";
import { SiteNav } from "@/components/site/site-nav";
import { Hero } from "@/components/site/hero";
import { NumbersStrip } from "@/components/site/numbers-strip";
import { WhySection } from "@/components/site/why-section";
import { ValueProps } from "@/components/site/value-props";
import { Features } from "@/components/site/features";
import { InstallSteps } from "@/components/site/install-steps";
import { StarCTA } from "@/components/site/star-cta";
import { SiteFooter } from "@/components/site/site-footer";
import { Reveal } from "@/components/site/reveal";

export default async function Home() {
  const { stars } = await getRepoStats();

  return (
    <>
      <SiteNav stars={stars} />
      <main className="flex flex-1 flex-col">
        <Hero />
        <Reveal>
          <NumbersStrip />
        </Reveal>
        <Reveal>
          <WhySection />
        </Reveal>
        <Reveal>
          <ValueProps />
        </Reveal>
        <Reveal>
          <Features />
        </Reveal>
        <Reveal>
          <InstallSteps />
        </Reveal>
        <Reveal>
          <StarCTA stars={stars} />
        </Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
