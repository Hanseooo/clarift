import Image from "next/image"
import Link from "next/link";
import { ExternalLink } from "lucide-react";

const socialLinks = [
  { href: "https://hanseooo.vercel.app/", label: "Portfolio" },
  { href: "https://github.com/Hanseooo", label: "GitHub" },
  { href: "https://linkedin.com/in/hanseooo", label: "LinkedIn" },
];

export function LandingFooter() {
  return (
    <footer className="w-full border-t border-border-default/50 bg-surface-page/70 backdrop-blur-xl">
      <div className="max-w-[960px] mx-auto px-6 py-8 md:py-0 md:h-20 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand Section */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/clarift-logo.png"
              alt="Clarift"
              width={32}
              height={32}
              className="size-8 rounded-lg object-contain transition-transform group-hover:scale-105"
              priority
            />
            <span className="font-bold text-lg tracking-tight text-text-primary">
              Clarift
            </span>
          </Link>
          <p className="text-[11px] text-text-tertiary font-medium uppercase tracking-wider md:hidden">
            Developed by Hanseo
          </p>
        </div>

        {/* Links & Desktop Attribution */}
        <div className="flex flex-col items-center md:items-end gap-3">
          <nav className="flex items-center gap-5">
            {socialLinks.map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-text-tertiary hover:text-brand-500 transition-colors duration-200"
              >
                {label}
                <ExternalLink className="size-3 opacity-50" strokeWidth={2} />
              </Link>
            ))}
          </nav>

          <p className="hidden md:block text-xs text-text-tertiary/80">
            &copy; {new Date().getFullYear()} - Developed by{" "}
            <span className="text-text-secondary font-medium">Hanseo</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
