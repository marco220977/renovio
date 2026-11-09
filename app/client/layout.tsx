import Espace from "@/components/Espace";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Espace role="client">{children}</Espace>;
}
