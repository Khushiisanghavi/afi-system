"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  return (
    <header className="w-full bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-5">

        <div className="text-xl font-bold text-black">
          AFI
        </div>

        <nav className="flex gap-8 text-sm font-medium">
          <NavItem href="/" label="Home" />
          <NavItem href="/results" label="Results" />
          <NavItem href="/compare" label="Compare" />
          <NavItem href="/history" label="History" />
          <NavItem href="/wellness" label="Wellness" />
        </nav>

      </div>
    </header>
  );
}

function NavItem({ href, label }: any) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`relative group transition duration-300
        ${isActive ? "text-green-600" : "text-black hover:text-green-600"}`}
    >
      {label}

      <span
        className={`absolute left-0 -bottom-1 h-[2px] bg-green-600 transition-all duration-300
          ${isActive ? "w-full" : "w-0 group-hover:w-full"}`}
      />
    </Link>
  );
}