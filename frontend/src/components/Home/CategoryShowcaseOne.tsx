import CategoryShowcase from "./CategoryShowcase";

export default function CategoryShowcaseOne() {
  return (
    <CategoryShowcase
      showcaseKey="showcaseOne"
      title="Explore Categories"
      showAllText="Show All"
      showAllLink="/categories"
      emptyMessage="Select and save categories in Homepage Category Showcase One from the Admin Dashboard."
    />
  );
}
