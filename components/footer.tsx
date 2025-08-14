"use client"

import { TransitionLink } from "./transition-link"

export function Footer() {
  return (
    <footer className="bg-black text-white py-3">
      <div className="w-full px-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-neutral-400 text-sm">
            &copy; {new Date().getFullYear()} KAIST AI Institute. All rights reserved.
          </p>
          <div className="flex gap-6 mt-2 md:mt-0">
            <TransitionLink href="#" className="text-neutral-400 hover:text-white text-sm">
              Contributions
            </TransitionLink>
            <TransitionLink href="#" className="text-neutral-400 hover:text-white text-sm">
              Fund
            </TransitionLink>
            <TransitionLink href="#" className="text-neutral-400 hover:text-white text-sm">
              KAIST AI Institute
            </TransitionLink>
          </div>
        </div>
      </div>
    </footer>
  )
}
