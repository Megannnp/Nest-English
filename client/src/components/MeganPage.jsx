import useScrollReveal from "../hooks/useScrollReveal.js";
import "./megan/megan.css";
import MeganAbout from "./megan/MeganAbout.jsx";
import MeganContact from "./megan/MeganContact.jsx";
import MeganHero from "./megan/MeganHero.jsx";
import MeganWork from "./megan/MeganWork.jsx";

export default function MeganPage() {
  const pageRef = useScrollReveal();

  return (
    <main className="mg-page" ref={pageRef}>
      <MeganHero />
      <MeganAbout />
      <MeganWork />
      <MeganContact />
    </main>
  );
}
