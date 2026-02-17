import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Phone, Mail, Clock, Instagram } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-card border-t">
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Columna 1: Información y contacto */}
          <Card className="border-0 elegant-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full overflow-hidden bg-background border border-white/20">
                  <img src="/logo.png" alt="Alondra Pole Space" className="h-full w-full object-cover scale-[1.20]" />
                </div>
                <CardTitle>Alondra Pole Space</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">


              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <p className="font-medium">Dirección</p>
                    <p className="text-muted-foreground text-sm">Calle Valle Inclán 24, entrada exterior trasera <br />Madrid, España</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-muted-foreground text-sm">alondrapolespace@gmail.com</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Teléfono</p>
                    <p className="text-muted-foreground text-sm">
                      <a href="tel:+34614057503" className="hover:text-primary transition-colors">614 05 75 03</a>
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <p className="font-medium">Horarios</p>
                    <p className="text-muted-foreground text-sm">Lun - Dom: 7:00 - 00:00</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="font-medium mb-3">Síguenos</p>
                <div className="flex space-x-4">
                  <Button variant="outline" size="sm" className="p-2" asChild>
                    <a href="https://www.instagram.com/alondrapolespace/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                      <Instagram className="w-4 h-4" />
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" className="p-2" asChild>
                    <a href="https://www.tiktok.com/@alondrapolespace?_r=1&_t=ZN-914BGcXvZV0" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg>
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Columna 2: Mapa */}
          <Card className="border-0 elegant-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-primary" />
                <span>Mapa</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg overflow-hidden mb-4 h-64 border elegant-shadow">
                <iframe
                  src="https://www.google.com/maps?q=40.380271,-3.772022&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Ubicación Alondra Pole Space - Calle Valle Inclán 24, Madrid"
                  className="w-full h-full"
                />
              </div>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <a href="https://www.google.com/maps?q=40.380271,-3.772022" target="_blank" rel="noopener noreferrer">
                  Abrir en Google Maps
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Columna 3: Cómo llegar */}
          <Card className="border-0 elegant-shadow">
            <CardHeader>
              <CardTitle>Cómo llegar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">🚇 Trenes y Metro</p>
                <p>A tan solo 5 minutos caminando de la estación de Renfe de Maestra Justa Freire (línea C-5) (Polideportivo de Aluche).</p>
                <p>A 20 minutos andando desde el intercambiador de Aluche (línea 5) o del metro de Aviación Española (línea 10).</p>
              </div>
              <div>
                <p className="font-medium text-foreground">🚌 Paradas de Autobús</p>
                <p>17, 34, 138, 139, 483 y 487, entre otras.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">🚗 Parking</p>
                <p>Aparcamiento gratuito en la zona.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Legal footer */}
        <div className="border-t mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-muted-foreground text-sm">
              © 2025 Alondra Pole Space. Todos los derechos reservados.
            </p>
            <div className="flex space-x-6 text-sm text-muted-foreground">
              <a href="/aviso-legal" className="hover:text-primary transition-colors">Aviso Legal</a>
              <a href="/privacidad" className="hover:text-primary transition-colors">Política de Privacidad</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
