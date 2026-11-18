/** Pictogramme Rénolien (maison + maillon), affiché devant le nom dans les en-têtes */
export default function LogoMark({ className = "" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo-mark.png" alt="" aria-hidden width={46} height={32} className={`mr-1.5 inline-block h-[1.3em] w-auto align-[-0.3em] ${className}`} />;
}
