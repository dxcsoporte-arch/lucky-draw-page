import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Holaa mundo" },
      { name: "description", content: "Una pagina simple que muestra el saludo Holaa mundo." },
      { property: "og:title", content: "Holaa mundo" },
      { property: "og:description", content: "Una pagina simple que muestra el saludo Holaa mundo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-semibold">holaa mundo</h1>
    </main>
  );
}
