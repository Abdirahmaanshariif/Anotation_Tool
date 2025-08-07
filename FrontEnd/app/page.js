"use client";
import { Moon, Sun } from "lucide-react"; // ✅ Icon for toggle
import Link from "next/link";
import { useEffect, useState } from "react";

function Home() {
  return (
    <div className="space-y-24 bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100">
      {/* Hero Section */}
      <section className="relative isolate overflow-hidden px-6 py-24 sm:py-32 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.indigo.100),white)] dark:bg-none opacity-20" />
        <div className="absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] bg-white dark:bg-[#1a1a1a] shadow-xl ring-1 ring-indigo-50 dark:ring-gray-700 sm:mr-28 lg:mr-0 xl:mr-16 xl:origin-center" />
        <div className="mx-auto max-w-2xl lg:max-w-4xl relative z-10">
          <figure className="mt-10 space-y-4 text-center">
            <blockquote>
              <p className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">
                Your Translation Annotation Companion
              </p>
            </blockquote>
            <blockquote>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Easily review, rate, and improve machine-translated content in
                your language pair.
              </p>
            </blockquote>
            <Link
              href="/signup"
              className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 mt-4 rounded-full transition"
            >
              Get Started
            </Link>
          </figure>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-10">
          {[
            {
              title: "⭐ Intuitive Interface",
              desc: "Review translations with checkboxes, ratings, and in-line comments.",
            },
            {
              title: "🔍 Easy Navigation",
              desc: "Move quickly through assigned texts with Save, Next, and Draft options.",
            },
            {
              title: "📦 Export Ready",
              desc: "Download all annotations for model feedback or academic analysis.",
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              className={`w-full text-center border border-gray-200 dark:border-gray-700 p-6 rounded-lg shadow-sm bg-blue-50 dark:bg-gray-800 hover:shadow-md transition ${
                idx === 1 ? "md:-mt-10" : ""
              }`}
            >
              <h4 className="text-xl font-semibold mb-2">{feature.title}</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-6">
        <div className="max-w-4xl mx-auto border border-gray-200 dark:border-gray-700 p-8 rounded-lg shadow-sm text-center bg-white dark:bg-gray-900">
          <h3 className="text-3xl font-bold mb-8">How It Works</h3>
          <ol className="list-decimal list-inside text-left space-y-3 max-w-xl mx-auto text-gray-800 dark:text-gray-300">
            <li>Login to your dashboard</li>
            <li>View source and translated text pairs</li>
            <li>
              Check for issues: Omission, Addition, Mistranslation,
              Untranslation
            </li>
            <li>Rate the translation and leave comments</li>
            <li>Save or submit your annotations</li>
          </ol>
        </div>
      </section>
    </div>
  );
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const userTheme = localStorage.getItem("theme");

    // Detect system preference if not set
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const dark = userTheme === "dark" || (!userTheme && prefersDark);

    setIsDark(dark);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark, hydrated]);

  const toggle = () => setIsDark((prev) => !prev);

  return [isDark, toggle];
}

export default function LandPage() {
  const [isDark, toggleDark] = useDarkMode();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0a0a0a] text-gray-800 dark:text-gray-100">
      {/* Navbar */}
      <header className="w-full border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto h-16 px-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-semibold text-blue-700 dark:text-blue-400"
          >
            Annotation Tool
          </Link>

          <nav className="flex items-center gap-6 text-sm md:text-base">
            <a
              href="#features"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition"
            >
              How it Works
            </a>
            <Link
              href="/signup"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition"
            >
              Sign Up
            </Link>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDark}
              className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
              title="Toggle Theme"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow px-4 py-8 max-w-5xl mx-auto w-full">
        <Home />
      </main>

      {/* Footer */}
      <footer className="text-center text-sm text-gray-500 dark:text-gray-400 py-6 border-t border-gray-200 dark:border-gray-700">
        © {new Date().getFullYear()} Annotation Tool. All rights reserved.
      </footer>
    </div>
  );
}
