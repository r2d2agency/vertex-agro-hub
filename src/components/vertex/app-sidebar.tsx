import { Link, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  Map,
  Users,
  ClipboardList,
  Stethoscope,
  Brain,
  Settings2,
  LayoutDashboard,
  Bell,
  Activity,
  MapPin,
  TreeDeciduous,
  Table,
  Dna,
  UserCog,
  UserCheck,
  Briefcase,
  UsersRound,
  ShieldCheck,
  Calendar,
  Droplets,
  FlaskConical,
  BarChart3,
  AlertTriangle,
  Camera,
  History,
  Route as RouteIcon,
  ClipboardCheck,
  FileText,
  Gauge,
  TrendingUp,
  Bot,
  SlidersHorizontal,
  Cog,
  Sparkles,
  RefreshCw,
  PlugZap,
  Smartphone,
  ScrollText,
  Leaf,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type Item = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };

const groups: { label: string; items: Item[] }[] = [
  {
    label: "Visão Geral",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Central de Alertas", url: "/alertas", icon: Bell },
      { title: "Atividades Recentes", url: "/atividades", icon: Activity },
    ],
  },
  {
    label: "Gestão Territorial",
    items: [
      { title: "Empresas", url: "/empresas", icon: Building2 },
      { title: "Regionais", url: "/regionais", icon: MapPin },
      { title: "Fazendas", url: "/fazendas", icon: TreeDeciduous },
      { title: "Talhões", url: "/talhoes", icon: Map },
      { title: "Tabelas de Sangria", url: "/tabelas", icon: Table },
      { title: "Mapas", url: "/mapas", icon: Map },
      { title: "Clones", url: "/clones", icon: Dna },
    ],
  },
  {
    label: "Pessoas e Equipes",
    items: [
      { title: "Usuários", url: "/usuarios", icon: Users },
      { title: "Monitores", url: "/monitores", icon: UserCog },
      { title: "Sangradores", url: "/sangradores", icon: UserCheck },
      { title: "Consultores", url: "/consultores", icon: Briefcase },
      { title: "Equipes", url: "/equipes", icon: UsersRound },
      { title: "Perfis e Permissões", url: "/permissoes", icon: ShieldCheck },
    ],
  },
  {
    label: "Operação",
    items: [
      { title: "Agenda", url: "/agenda", icon: Calendar },
      { title: "Sangrias", url: "/sangrias", icon: Droplets },
      { title: "Estimulações", url: "/estimulacoes", icon: FlaskConical },
      { title: "Produção", url: "/producao", icon: BarChart3 },
      { title: "Ocorrências", url: "/ocorrencias", icon: AlertTriangle },
      { title: "Fotografias", url: "/fotografias", icon: Camera },
      { title: "Histórico", url: "/historico", icon: History },
    ],
  },
  {
    label: "Consultoria Técnica",
    items: [
      { title: "Visitas", url: "/visitas", icon: RouteIcon },
      { title: "Inspeções", url: "/inspecoes", icon: ClipboardCheck },
      { title: "Planos de Ação", url: "/planos-acao", icon: ClipboardList },
      { title: "Relatórios Técnicos", url: "/relatorios", icon: FileText },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { title: "Indicadores", url: "/indicadores", icon: Gauge },
      { title: "Previsões", url: "/previsoes", icon: TrendingUp },
      { title: "Alertas Inteligentes", url: "/alertas-ia", icon: Sparkles },
      { title: "Assistente Gerencial", url: "/assistente", icon: Bot },
      { title: "Simulador", url: "/simulador", icon: SlidersHorizontal },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Configurações", url: "/configuracoes", icon: Cog },
      { title: "Auditoria", url: "/auditoria", icon: ScrollText },
      { title: "Sincronização", url: "/sincronizacao", icon: RefreshCw },
      { title: "Integrações", url: "/integracoes", icon: PlugZap },
      { title: "Dispositivos", url: "/dispositivos", icon: Smartphone },
      { title: "Logs", url: "/logs", icon: Stethoscope },
    ],
  },
  {
    label: "IA",
    items: [{ title: "Central IA", url: "/ia", icon: Brain }],
  },
];

// dedupe icon references so tree-shaking keeps them
const _keep = { Settings2 };

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Leaf className="h-4 w-4" />
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              Vertex Agro
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active =
                    pathname === item.url || pathname.startsWith(item.url + "/");
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <Link to={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}

// silence unused
void _keep;
