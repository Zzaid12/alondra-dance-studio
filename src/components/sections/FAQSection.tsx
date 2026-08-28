import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

export const FAQSection = () => {
  const faqs = [
    {
      question: "¿Puedo reservar con mi bono la sala entera?",
      answer: "Sin problema, solo tienes que reservar las 3 barras con el bono y ya dispones de la sala completa."
    },
    {
      question: "¿Puedo reservar con mi bono la sala para otra persona?",
      answer: "Claro, todos nuestros bonos son no nominales."
    },
    {
      question: "¿Qué debo llevar a la sala?",
      answer: "Solo necesitas ropa cómoda que te permita moverte libremente. Cuanto menos ropa con más facilidad te puedes agarrar a la barra. Recomendamos shorts o leggings y un top. Nosotros proporcionamos todas las barras, colchonetas y equipamiento necesario. También ofrecemos esterillas limpias y agua."
    },
    {
      question: "¿Es seguro el pole dance?",
      answer: "Absolutamente. La seguridad es nuestra prioridad número uno. Nuestras barras están instaladas y se revisan regularmente. No te olvides de comenzar siempre con un calentamiento adecuado, dispones de ellos en la sala."
    },
    {
      question: "¿Cuánto tiempo dura la reserva de 1 barra?",
      answer: "Cada sesión dura 1 hora y 30 minutos. 1 hora y 25 minutos para trabajar un calentamiento apropiado, técnica y práctica libre. Este tiempo es el ideal para practicar de manera efectiva sin sobrecargarte.  Los 5 últimos minutos son para poder salir tranquilamente y dejar la sala libre y limpia para el siguiente!"
    },
    {
      question: "¿Qué opciones de reserva tengo?",
      answer: "Ofrecemos la opción de reserva de barra individual, un bono de 10 sesiones con duración de 3 meses o de 5 sesiones mensual."
    },
    {
      question: "¿Cuál es la política de cancelación?",
      answer: "Puedes cancelar tu sesión hasta 24 horas antes sin penalización. Las cancelaciones con menos de 24 horas de anticipación pierdes la reserva. No se realizan devoluciones por ausencias sin previo aviso. Los bonos no se devuelven, aunque eso no impide que lo utilice otra persona en tu lugar si no tienes disponibilidad."
    },
    {
      question: "¿Puedo traer un acompañante a ver la clase?",
      answer: "Para mantener un ambiente cómodo y sin distracciones para toda nuestra comunidad las barras son de uso personal. Sin embargo, puedes reservar la sala completa donde se permiten hasta grupos de 12 personas."
    },
    {
      question: "¿Comienza a contar el plazo de mi bono desde que lo compro?",
      answer: "No, puedes estar tranquilo/a, el plazo de caducidad del bono comenzará a contar desde el día que realices la primera reserva."
    },
  ];

  return (
    <section id="faq" className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Preguntas <span className="hero-text-gradient">Frecuentes</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Resolvemos las dudas más comunes sobre nuestro espacio, instalaciones y políticas.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card rounded-lg px-6 border-0 elegant-shadow"
              >
                <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline hover:text-primary transition-colors">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pt-2 pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="text-center mt-12">


        </div>
      </div>
    </section>
  );
};