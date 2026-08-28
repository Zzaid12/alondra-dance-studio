import { useEffect, useRef } from "react";
import "./HistoriaSection.css";

const IMAGES = [
  "/nuestraHistoria/IMG_9144.jpg",  // foto grande (ocupa 2 filas)
  "/nuestraHistoria/_DSC0170.jpg",
  "/nuestraHistoria/IMG_8833.jpg",
  "/nuestraHistoria/IMG_9224.jpg",
  "/nuestraHistoria/2.jpeg",
];

export const HistoriaSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("historia-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-20 bg-card" ref={sectionRef}>
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Texto */}
          <div className="historia-text">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">Quiénes somos</p>
            <h3 className="text-3xl md:text-4xl font-bold mb-8">
              Nuestra <span className="hero-text-gradient">Historia</span>
            </h3>
            <div className="space-y-5 text-base leading-relaxed text-muted-foreground">
              <p>
                Alondra Pole Space nace con el propósito de ofrecer un espacio especializado en entrenamiento libre de pole dance, donde cada persona pueda desarrollar su técnica y condición física con autonomía, en un entorno cuidado y profesional.
              </p>
              <p>
                El ave alondra representa la libertad, la precisión del movimiento y la capacidad de superación. Estos valores inspiran nuestro proyecto: un espacio que fomenta la independencia en el entrenamiento, el bienestar físico y el crecimiento personal.
              </p>
              <p>
                En Alondra no impartimos clases dirigidas; cada persona entrena a su ritmo, utilizando una sala equipada para potenciar fuerza, flexibilidad y control corporal. Nuestro objetivo es ofrecer un entorno seguro, funcional y motivador para que cada sesión te acerque a tus metas.
              </p>
            </div>
          </div>

          {/* Grid de fotos */}
          <div className="historia-grid">
            <div className="historia-photo historia-photo-0">
              <img src={IMAGES[0]} alt="Alondra Pole Space" loading="lazy" />
            </div>
            <div className="historia-photo historia-photo-1">
              <img src={IMAGES[1]} alt="Alondra Pole Space" loading="lazy" />
            </div>
            <div className="historia-photo historia-photo-2">
              <img src={IMAGES[2]} alt="Alondra Pole Space" loading="lazy" />
            </div>
            <div className="historia-photo historia-photo-3">
              <img src={IMAGES[3]} alt="Alondra Pole Space" loading="lazy" />
            </div>
            <div className="historia-photo historia-photo-4">
              <img src={IMAGES[4]} alt="Alondra Pole Space" loading="lazy" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
