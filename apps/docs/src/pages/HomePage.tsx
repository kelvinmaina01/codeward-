import { Link } from 'react-router';
import { Book01Icon, CodeIcon, CpuIcon, PuzzleIcon, Rocket01Icon, File01Icon, Search01Icon } from 'hugeicons-react';

export default function HomePage() {
  const cards = [
    {
      title: 'Guide',
      desc: 'Learn everything about Codeward. Connect your first repo in minutes.',
      icon: Book01Icon,
      color: 'var(--cw-blue)',
      link: '/guide/getting-started/welcome'
    },
    {
      title: 'API References',
      desc: 'Automate your workflows with our API references and SDKs.',
      icon: CodeIcon,
      color: 'var(--cw-green)',
      link: '/api-reference/intro'
    },
    {
      title: 'Agents',
      desc: 'Explore our 15 specialized agents checking for security, bloat, and more.',
      icon: CpuIcon,
      color: 'var(--cw-purple)',
      link: '/agents/overview'
    },
    {
      title: 'Templates',
      desc: 'Clone and replicate CI/CD templates from top-tier companies.',
      icon: File01Icon,
      color: 'var(--cw-amber)',
      link: '/templates/introduction'
    },
    {
      title: 'Changelog',
      desc: 'See the latest product updates, new agents, and platform improvements.',
      icon: Rocket01Icon,
      color: 'var(--cw-teal)',
      link: '/changelog'
    },
    {
      title: 'Integrations',
      desc: 'Connect Codeward to GitHub, Slack, Jira, and your calendar.',
      icon: PuzzleIcon,
      color: 'var(--cw-red)',
      link: '/integrations/github'
    }
  ];

  return (
    <div className="flex flex-col items-center py-16 px-6 max-w-4xl mx-auto">
      <h1 className="text-5xl font-medium tracking-tight text-cw-txt mb-8 text-center">
        Welcome to Codeward
      </h1>
      
      {/* Search Bar Mock */}
      <div className="w-full max-w-xl h-12 bg-cw-bg2 border border-cw-bdr rounded-lg flex items-center px-4 cursor-text hover:bg-cw-bg3 hover:border-cw-bdr2 transition-all mb-16 text-cw-txt3 text-sm">
        <Search01Icon size={18} className="mr-3" />
        <span className="flex-1">Search our guides, API refs and more...</span>
        <div className="flex gap-1">
          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-cw-bg border border-cw-bdr text-cw-txt2">⌘</span>
          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-cw-bg border border-cw-bdr text-cw-txt2">K</span>
        </div>
      </div>

      <h2 className="text-xl font-medium text-cw-txt2 mb-6 text-center">
        Get started with our docs and guides
      </h2>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link 
              key={card.title} 
              to={card.link}
              className="bg-cw-bg2 border border-cw-bdr rounded-xl p-6 flex flex-col no-underline transition-all hover:-translate-y-0.5 hover:bg-cw-bg3 hover:border-cw-bdr2 group"
            >
              <div className="mb-4" style={{ color: card.color }}>
                <Icon size={24} />
              </div>
              <h3 className="text-[15px] font-semibold text-cw-txt mb-2">
                {card.title}
              </h3>
              <p className="text-[13px] text-cw-txt2 leading-relaxed m-0">
                {card.desc}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
