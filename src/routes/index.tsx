import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Novo projeto" },
      { name: "description", content: "Página em branco, pronta para começar." },
      { property: "og:title", content: "Novo projeto" },
      {
        property: "og:description",
        content: "Página em branco, pronta para começar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main
      data-lovable-blank-page-placeholder
      className="flex min-h-screen items-center justify-center"
    >
      <h1 className="text-muted-foreground text-lg">Página em branco</h1>
    </main>
  );
}
