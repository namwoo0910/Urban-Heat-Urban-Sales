"use client"

import { TransitionLink } from "./transition-link"

export function Footer() {
  return (
    <footer className="bg-black text-white py-3">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-neutral-400 text-sm">
            &copy; {new Date().getFullYear()} Innovate. Create. Inspire. All rights reserved.
          </p>
          <div className="flex gap-6 mt-2 md:mt-0">
            <TransitionLink href="#" className="text-neutral-400 hover:text-white text-sm">
              Twitter
            </TransitionLink>
            <TransitionLink href="#" className="text-neutral-400 hover:text-white text-sm">
              Instagram
            </TransitionLink>
            <TransitionLink href="#" className="text-neutral-400 hover:text-white text-sm">
              LinkedIn
            </TransitionLink>
          </div>
        </div>
      </div>
    </footer>
  )
}
