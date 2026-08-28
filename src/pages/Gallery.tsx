import { useState } from "react";
import { X } from "lucide-react";

const images = [
  "/nuestraHistoria/IMG_8730.jpg",
  "/nuestraHistoria/IMG_8733.jpg",
  "/nuestraHistoria/IMG_8735.jpg",
  "/nuestraHistoria/IMG_8738.jpg",
  "/nuestraHistoria/IMG_8761.jpg",
  "/nuestraHistoria/IMG_8767.jpg",
  "/nuestraHistoria/IMG_8767 (1).jpg",
  "/nuestraHistoria/IMG_8776.jpg",
  "/nuestraHistoria/IMG_8777.jpg",
  "/nuestraHistoria/IMG_8778.jpg",
  "/nuestraHistoria/IMG_8779.jpg",
  "/nuestraHistoria/IMG_8780.jpg",
  "/nuestraHistoria/IMG_8781.jpg",
  "/nuestraHistoria/IMG_8782.jpg",
  "/nuestraHistoria/IMG_8783.jpg",
  "/nuestraHistoria/IMG_8784.jpg",
  "/nuestraHistoria/IMG_8785.jpg",
];

const Gallery = () => {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="min-h-screen pt-20 pb-16 bg-secondary/30">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Nuestra <span className="hero-text-gradient">Galería</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Conoce nuestro espacio
          </p>
        </div>

        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
          {images.map((src) => (
            <img
              key={src}
              src={src}
              alt=""
              className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity break-inside-avoid"
              onClick={() => setSelected(src)}
            />
          ))}
        </div>
      </div> 

      {selected && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setSelected(null)}
          >
            <X size={32} />
          </button>
          <img
            src={selected}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default Gallery;
