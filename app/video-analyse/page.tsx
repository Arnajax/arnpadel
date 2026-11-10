import type { Metadata } from "next";
import FormPageShell from "../components/FormPageShell";
import VideoAnalyseClient from "./VideoAnalyseClient";

export const metadata: Metadata = {
  title: "Video-analyse van je padel — Padel Hub Hoorn",
  description:
    "Laat je padeltechniek analyseren door de trainers van Padel Hub Hoorn. Vraag een video-analyse aan en krijg concrete verbeterpunten.",
};

export default function VideoAnalysePage() {
  return (
    <FormPageShell
      eyebrow="Video-analyse"
      title="Laat je techniek analyseren"
      intro="Stuur ons een video van je spel en onze trainers analyseren je techniek, positiespel en keuzes. Je krijgt concrete, persoonlijke verbeterpunten terug, zonder dat je op de baan hoeft te staan."
      points={[
        "Persoonlijke analyse door ervaren trainers",
        "Concrete verbeterpunten, geen vage tips",
        "Je stuurt je video gewoon via WhatsApp",
        "Handig naast je lessen of als losse check",
      ]}
    >
      <VideoAnalyseClient />
    </FormPageShell>
  );
}
