import { Hero } from '../sections/Hero';
import { NowBuilding } from '../sections/NowBuilding';
import { LabGrid } from '../sections/LabGrid';
import { Experience } from '../sections/Experience';
import { OtherProjects } from '../sections/OtherProjects';
import { About } from '../sections/About';
import { Contact } from '../sections/Contact';

export default function Home() {
  return (
    <>
      <Hero />
      <NowBuilding />
      <LabGrid />
      <Experience />
      <OtherProjects />
      <About />
      <Contact />
    </>
  );
}
