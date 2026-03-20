"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="w-full bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-5">
        <div className="text-xl font-bold text-black">AFI</div>

        <nav className="flex gap-8 text-sm font-medium">
          <NavItem href="/" label="Home" />
          <NavItem href="/results" label="Results" />
          <NavItem href="/compare" label="Compare" />
          <NavItem href="/history" label="History" />
          <NavItem href="/wellness" label="Wellness" />

          {/* Divider */}
          <span className="w-px bg-gray-200 self-stretch" />

          {/* New sections */}
          <NavItem href="/creator" label="Creator Studio" highlight="indigo" />
          <NavItem href="/wellbeing" label="Wellbeing" highlight="teal" />
        </nav>
      </div>
    </header>
  );
}

function NavItem({
  href,
  label,
  highlight,
}: {
  href: string;
  label: string;
  highlight?: "indigo" | "teal";
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  const activeColor =
    highlight === "indigo"
      ? "text-indigo-600"
      : highlight === "teal"
      ? "text-teal-600"
      : "text-green-600";

  const barColor =
    highlight === "indigo"
      ? "bg-indigo-600"
      : highlight === "teal"
      ? "bg-teal-600"
      : "bg-green-600";

  const hoverColor =
    highlight === "indigo"
      ? "hover:text-indigo-600"
      : highlight === "teal"
      ? "hover:text-teal-600"
      : "hover:text-green-600";

  return (
    <Link
      href={href}
      className={`relative group transition duration-300
        ${isActive ? activeColor : `text-black ${hoverColor}`}`}
    >
      {label}
      <span
        className={`absolute left-0 -bottom-1 h-[2px] ${barColor} transition-all duration-300
          ${isActive ? "w-full" : "w-0 group-hover:w-full"}`}
      />
    </Link>
  );
}
