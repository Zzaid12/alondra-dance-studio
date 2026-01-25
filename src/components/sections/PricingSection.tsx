import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const PricingSection = () => {
  const individuales = [
    {
      name: "Barra suelta",
      price: "10",
      period: "1 sesión (1h30m)",
      description: "Flexible, para clientes individuales",
      features: ["1 barra", "Duración 1h30m"],
    },
  ];

  const bonos = [
    {
      name: "Bono 5 barras",
      price: "45",
      period: "Caducidad: 1 mes",
      description: "Tu bono ideal para venir todas las semanas",
      features: ["5 sesiones", "Caduca en 1 mes"],
    },
    {
      name: "Bono 10 barras",
      price: "80",
      period: "Caducidad: 3 meses",
      description: "Para los más adictos a entrenar con nosotros",
      features: ["10 sesiones", "Caduca en 3 meses"],
    },
    {
      name: "Bono 4 Salas Completas",
      price: "80",
      period: "Caducidad: 1 mes",
      description: "Reserva la sala completa",
      features: ["4 sesiones de sala entera", "3 barras por sesión", "Caduca en 1 mes"],
    },
  ];

  const sala = [
    {
      title: "Sala entera hasta 6 personas",
      price: "30",
      period: "1 sesión (1h30m)",
      description: "Ideal para grupos pequeños o principiantes",
      features: ["Hasta 6 personas", "3 barras", "Privacidad"]
    },
    {
      title: "Sala entera +6 personas",
      price: "40",
      period: "1 sesión (1h30m)",
      description: "Para grupos más grandes, talleres o workshops",
      features: ["7-12 personas", "3 barras", "Privacidad"]
    }
  ];

  return (
    <section id="pricing" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Reserva tu <span className="hero-text-gradient">Espacio</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            ¿Listo para entrenar en un espacio profesional y flexible?
            En Alondra Pole Space puedes reservar fácilmente tu espacio de entrenamiento libre en solo unos clics.

          </p>
        </div>

        {/* Sección unificada sin desplegables */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Barra suelta */}
          {individuales.map((plan, index) => (
            <Card key={`barra-${index}`} className="relative elegant-shadow hover:shadow-lg transition-all duration-300 h-full flex flex-col">

              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <div className="mt-3">
                  <span className="text-4xl font-bold text-primary">€{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.period}</span>
                </div>
                <p className="text-muted-foreground mt-2">{plan.description}</p>
              </CardHeader>
              <CardContent className="flex flex-col grow">
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <Check className="w-4 h-4 text-primary mr-2" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  <Button className="w-full" variant="outline" onClick={() => (window.location.href = '/reservar?pre=barra_tarde')}>
                    Reservar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Bonos */}
          {bonos.map((plan, index) => (
            <Card key={`bono-${index}`} className="relative elegant-shadow hover:shadow-lg transition-all duration-300 h-full flex flex-col">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                <div className="mt-3">
                  <span className="text-3xl font-bold text-primary">€{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.period}</span>
                </div>
                <p className="text-muted-foreground mt-2">{plan.description}</p>
              </CardHeader>
              <CardContent className="flex flex-col grow">
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <Check className="w-4 h-4 text-primary mr-2" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => (window.location.href = '/bonos')}
                  >
                    Comprar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Sala entera */}
          {sala.map((offer, index) => (
            <Card key={`sala-${index}`} className="relative elegant-shadow hover:shadow-lg transition-all duration-300 h-full flex flex-col">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-xl font-bold">{offer.title}</CardTitle>
                <div className="mt-3">
                  <span className="text-3xl font-bold text-primary">€{offer.price}</span>
                  <span className="text-muted-foreground">/{offer.period}</span>
                </div>
                <p className="text-muted-foreground mt-2">{offer.description}</p>
              </CardHeader>
              <CardContent className="flex flex-col grow">
                <ul className="space-y-2 mb-6">
                  {offer.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <Check className="w-4 h-4 text-primary mr-2" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  <Button variant="outline" className="w-full" onClick={() => (window.location.href = '/reservar?pre=sala')}>
                    Ver disponibilidad
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Payment info */}
        <div className="text-center mt-12 p-6 bg-muted/50 rounded-lg align-center">
          <p className="text-muted-foreground text-center">
            📅 Reservas sin anticipación •
            🔄 Política de cancelación flexible
          </p>
        </div>
      </div>
    </section>
  );
};