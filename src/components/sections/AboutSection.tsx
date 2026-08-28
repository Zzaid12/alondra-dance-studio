import { HeartPulse, Clock, Dumbbell, UsersRound } from "lucide-react";
import { HistoriaSection } from "./HistoriaSection";

const features = [
  { icon: HeartPulse, title: "Calentamientos adaptados", desc: "Rutinas diseñadas para mejorar movilidad, fuerza y prevenir lesiones" },
  { icon: Clock, title: "Hora y media completa", desc: "Tiempo real para entrenar a tu ritmo, sin prisas ni interrupciones" },
  { icon: Dumbbell, title: "Material completo", desc: "Yoga, pilates y todo lo que necesitas, incluido en la sala" },
  { icon: UsersRound, title: "Comunidad Alondra", desc: "Un espacio cercano donde cada progreso se celebra junto" },
];

export const AboutSection = () => {
  return (
    <>
      <section id="about" className="flex flex-col justify-center py-10 min-h-screen bg-secondary/30">
        <div className="container mx-auto px-4 flex flex-col gap-8">

          {/* Cabecera */}
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-3">
              Más que un <span className="hero-text-gradient">Espacio</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Una sala única para entrenar pole dance con total libertad, sin clases dirigidas ni horarios fijos.
            </p>
          </div>

          {/* Sketch — imagen completa, escala para caber en viewport */}
          <div className="flex justify-center">
            <img
              src="/nuestraHistoria/local-sketch.jpeg"
              alt="Plano del espacio Alondra Pole Space"
              className="rounded-md w-auto"
              style={{
                maxHeight: "42vh",
                maxWidth: "100%",
                boxShadow: "0 2px 0 rgba(44,36,22,0.04), 0 4px 8px rgba(44,36,22,0.08), 0 16px 48px rgba(44,36,22,0.14)"
              }}
              loading="lazy"
            />
          </div>

          {/* Características */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto w-full">
            {features.map((f, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(44,36,22,0.07)" }}>
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <p className="font-semibold text-sm leading-snug">{f.title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      <HistoriaSection />
    </>
  );
};