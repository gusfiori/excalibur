import { Suspense } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import AuthCTA, { AuthCTAFallback } from "@/components/landing/AuthCTA";
import FoldersDemo from "@/components/landing/FoldersDemo";
import HeroPlayground from "@/components/landing/HeroPlayground";
import LandingShell from "@/components/landing/LandingShell";
import { Note, Reveal } from "@/components/landing/Reveal";
import StylesDemo from "@/components/landing/StylesDemo";
import TemplatesDemo from "@/components/landing/TemplatesDemo";

const FEATURES = [
  { icon: "🔍", title: "Ache qualquer coisa", text: "Busca rápida com ⌘P por todos os seus quadros e pastas, até sem acento." },
  { icon: "⭐", title: "Favoritos e recentes", text: "O que você mais usa sempre a um clique, logo na tela inicial." },
  { icon: "💾", title: "Salva sozinho", text: "Cada traço fica guardado na nuvem enquanto você desenha. Sem botão de salvar." },
  { icon: "🖼️", title: "Imagens no quadro", text: "Cole prints e fotos direto no desenho. Elas ficam guardadas junto." },
  { icon: "🎨", title: "Ícones e cores", text: "Dê um emoji e uma cor para cada pasta e quadro e reconheça tudo de longe." },
  { icon: "🌐", title: "Direto no navegador", text: "Nada para instalar. Entre com sua conta Google e continue de onde parou." },
];

function Section({
  id,
  title,
  subtitle,
  note,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  note?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{title}</h2>
            <p className="mt-3 text-lg leading-relaxed text-ink-muted">{subtitle}</p>
          </div>
          {note}
        </Reveal>
        <Reveal delay={120}>{children}</Reveal>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <LandingShell>
      {/* Topo */}
      <header className="sticky top-0 z-30 border-b border-line bg-app/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
          <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-semibold text-ink">
            <Logo size={26} />
            Excalibur
          </Link>
          <nav className="hidden items-center gap-1 text-sm text-ink-muted md:flex">
            {[
              ["#pastas", "Pastas"],
              ["#estilos", "Estilos"],
              ["#modelos", "Modelos"],
              ["#recursos", "Recursos"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded-md px-3 py-1.5 hover:bg-hover hover:text-ink">
                {label}
              </a>
            ))}
          </nav>
          <Suspense fallback={<AuthCTAFallback variant="header" />}>
            <AuthCTA variant="header" />
          </Suspense>
        </div>
      </header>

      <main>
        {/* Abertura: texto + quadro de verdade para rabiscar */}
        <section className="board-canvas relative overflow-hidden px-6 pb-20 pt-14 sm:pt-20" style={{ ["--grid-size" as string]: "22px" }}>
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-xs font-medium text-ink-muted">
                ✏️ Grátis · direto no navegador
              </span>
              <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] text-ink sm:text-6xl">
                Seu caderno de ideias, <span className="text-accent">à mão livre.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-muted">
                Rabisque, desenhe e organize tudo em pastas, do jeito que faz sentido pra você. Mapas mentais, planos de
                viagem, resumos, ideias soltas: cada coisa no seu lugar.
              </p>
              <div className="mt-8 max-w-sm">
                <Suspense fallback={<AuthCTAFallback variant="hero" />}>
                  <AuthCTA variant="hero" />
                </Suspense>
              </div>
              <div className="mt-6 hidden lg:block">
                <Note direction="right">ou rabisque aqui do lado, sem cadastro</Note>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl">
                <div className="flex h-10 items-center gap-2 border-b border-line bg-sidebar px-4">
                  <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                  <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                  <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                  <span className="ml-3 truncate text-xs text-ink-muted">Meu primeiro desenho · experimente!</span>
                </div>
                <div className="relative h-[440px] sm:h-[500px]">
                  <HeroPlayground />
                </div>
              </div>
              <p className="mt-3 text-center text-sm text-ink-faint">
                Seu rabisco fica guardado aqui. Ao entrar com Google, ele vira o primeiro quadro da sua conta.
              </p>
            </Reveal>
          </div>
        </section>

        <Section
          id="pastas"
          title="Cada ideia no seu lugar"
          subtitle="Pastas, subpastas, ícones e cores. Seus quadros organizados do jeito que você organiza a cabeça (ou um pouco melhor)."
          note={<Note direction="down-left">clique numa pasta</Note>}
        >
          <FoldersDemo />
        </Section>

        <Section
          id="estilos"
          title="Do seu jeito"
          subtitle="Escolha o visual que combina com você: papel aconchegante, estúdio escuro ou tudo bem organizadinho."
          note={<Note direction="down-left">clique e veja a página mudar</Note>}
        >
          <StylesDemo />
        </Section>

        <Section
          id="modelos"
          title="Nunca comece do zero"
          subtitle="Mapa mental, fluxograma, kanban e mais. Escolha um modelo e já saia desenhando."
          note={<Note direction="down-left">passe o mouse</Note>}
        >
          <TemplatesDemo />
        </Section>

        <Section
          id="recursos"
          title="Tudo que você precisa, nada que atrapalhe"
          subtitle="Feito para você pensar com calma, sem menus infinitos."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-line bg-panel p-6 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="text-3xl">{f.icon}</div>
                <h3 className="mt-3 font-semibold text-ink">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{f.text}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Chamada final */}
        <section className="px-6 pb-24">
          <Reveal className="mx-auto max-w-4xl">
            <div className="board-canvas rounded-3xl border border-line px-8 py-16 text-center shadow-xl" style={{ ["--grid-size" as string]: "20px" }}>
              <h2 className="font-display text-4xl font-semibold text-ink sm:text-5xl">Sua próxima ideia começa num rabisco.</h2>
              <p className="mx-auto mt-4 max-w-lg text-lg text-ink-muted">Crie sua conta em um clique e guarde tudo, de qualquer computador.</p>
              <div className="mx-auto mt-8 max-w-sm">
                <Suspense fallback={<AuthCTAFallback variant="hero" />}>
                  <AuthCTA variant="hero" />
                </Suspense>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-line px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm text-ink-muted">
          <span className="flex items-center gap-2 font-display font-semibold text-ink">
            <Logo size={20} />
            Excalibur
          </span>
          <span className="font-hand text-xl text-ink-soft">feito com ✏️ e carinho</span>
        </div>
      </footer>
    </LandingShell>
  );
}
