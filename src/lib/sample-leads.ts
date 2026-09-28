import type { LeadStatus } from "@/lib/lead-status";

type SampleLead = {
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  status: LeadStatus;
  /** Owner = whoever loads the samples; false = no owner. */
  owned: boolean;
};

/** Example contacts to try the CRM with (fictitious people and companies). */
export const SAMPLE_LEADS: SampleLead[] = [
  { name: "Mariana Albuquerque", email: "mariana@padariaboasorte.com.br", phone: "(11) 98765-4321", company: "Padaria Boa Sorte", position: "Proprietária", status: "new", owned: true },
  { name: "Rafael Nogueira", email: "rafael.nogueira@construtoraaurora.com.br", phone: "(21) 99812-3344", company: "Construtora Aurora", position: "Diretor Comercial", status: "contacted", owned: true },
  { name: "Juliana Castro", email: "juliana@clinicavitalis.com.br", phone: "(31) 98877-1020", company: "Clínica Vitalis", position: "Gerente Administrativa", status: "qualified", owned: true },
  { name: "Thiago Ribeiro", email: "thiago@agenciafarol.com.br", phone: "(41) 99655-7788", company: "Agência Farol", position: "Sócio", status: "customer", owned: true },
  { name: "Camila Ferreira", email: "camila.ferreira@escolaarcoiris.com.br", phone: "(51) 98123-4567", company: "Escola Arco-Íris", position: "Coordenadora", status: "new", owned: false },
  { name: "Bruno Carvalho", email: "bruno@transportesrapidez.com.br", phone: "(19) 99701-2233", company: "Transportes Rapidez", position: "Gerente de Logística", status: "contacted", owned: true },
  { name: "Patrícia Mendes", email: "patricia@studiobelezaviva.com.br", phone: "(81) 98456-9012", company: "Studio Beleza Viva", position: "Proprietária", status: "unqualified", owned: false },
  { name: "Lucas Oliveira", email: "lucas.oliveira@techsolucoes.com.br", phone: "(11) 97654-3210", company: "Tech Soluções", position: "CTO", status: "qualified", owned: true },
  { name: "Fernanda Lima", email: "fernanda@restaurantesabordaterra.com.br", phone: "(85) 99988-1122", company: "Sabor da Terra", position: "Gerente", status: "customer", owned: true },
  { name: "Gustavo Pereira", email: "gustavo@imobiliariahorizonte.com.br", phone: "(61) 98333-4455", company: "Imobiliária Horizonte", position: "Corretor-chefe", status: "new", owned: false },
  { name: "Aline Souza", email: "aline.souza@farmaciasaude.com.br", phone: "(71) 99222-6677", company: "Farmácia Saúde+", position: "Compradora", status: "contacted", owned: true },
  { name: "Diego Martins", email: "diego@academiamovimento.com.br", phone: "(48) 98111-8899", company: "Academia Movimento", position: "Diretor", status: "qualified", owned: false },
];
