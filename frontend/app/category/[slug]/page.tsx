import CategoryPageClient from "@/src/components/Category/CategoryPageClient";

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CategoryPage({
  params,
}: CategoryPageProps) {
  const { slug } = await params;

  return (
    <CategoryPageClient
      categorySlug={slug}
    />
  );
}