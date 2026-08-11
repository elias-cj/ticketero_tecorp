import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Book, ChevronRight, HelpCircle, ExternalLink, Lightbulb, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type FAQ } from "@/types";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const categories = ["Todos", "Acceso", "Red", "Audio", "VPN", "Hardware"];

const Wiki = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFaqs = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("faqs")
          .select("*")
          .order("order", { ascending: true });

        if (error) throw error;
        setFaqs(data || []);
      } catch (error) {
        console.error("Error fetching FAQs:", error);
        toast.error("No se pudieron cargar las preguntas frecuentes");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFaqs();
  }, []);

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(search.toLowerCase()) || 
                          faq.answer.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "Todos" || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Book className="h-6 w-6 text-primary" /> Wiki de Soporte
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Base de conocimientos técnica y soluciones frecuentes.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar solución o error..." 
            className="pl-9 bg-card border-none ring-1 ring-border shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 p-1 bg-muted/30 rounded-lg overflow-x-auto w-fit max-w-full">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
              activeCategory === c 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            {c.toUpperCase()}
          </button>
        ))}
      </div>

      {/* FAQ Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 text-center">
            <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Cargando base de conocimientos...</p>
          </div>
        ) : filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq, i) => (
            <motion.div
              key={faq.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="h-full hover:shadow-md transition-shadow border-none ring-1 ring-border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <HelpCircle className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/5 uppercase tracking-wider">
                        {faq.category}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <CardTitle className="text-base font-bold text-foreground leading-tight mt-2">
                    {faq.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                  <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-primary">
                      <Lightbulb className="h-3 w-3" /> Solución Recomendada
                    </span>
                    <span className="flex items-center gap-1 cursor-pointer hover:text-primary">
                      Ver detalle <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center space-y-3 bg-muted/20 rounded-xl border border-dashed">
            <Search className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <div>
              <p className="text-foreground font-bold italic">No se encontraron artículos</p>
              <p className="text-xs text-muted-foreground">Prueba otra categoría o palabra clave</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setSearch(""); setActiveCategory("Todos"); }}>
              Limpiar filtros
            </Button>
          </div>
        )}
      </div>

      {/* Suggested Articles Sidebar (at bottom for simple layout) */}
      <div className="bg-primary/5 rounded-xl p-6 border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Book className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">¿No encuentras lo que buscas?</h3>
            <p className="text-sm text-muted-foreground">Nuestro equipo técnico actualiza la Wiki diariamente con nuevos reportes.</p>
          </div>
        </div>
        <Button className="gap-2">
          Contactar Administrador de Wiki <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default Wiki;
