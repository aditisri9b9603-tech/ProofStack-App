export function Footer() {
  return (
    <footer className="h-10 bg-dark text-white/50 text-[10px] px-8 flex items-center justify-between mt-auto">
      <p>© {new Date().getFullYear()} ProofStack. Built for a Placement-Ready India.</p>
      <div className="flex gap-4">
        <span className="hover:text-accent cursor-pointer transition-colors">API Documentation</span>
        <span className="hover:text-accent cursor-pointer transition-colors">Recruiter Portal</span>
        <span className="hover:text-accent cursor-pointer transition-colors">Trust & Security</span>
      </div>
    </footer>
  );
}
