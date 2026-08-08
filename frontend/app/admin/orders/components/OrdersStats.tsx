type OrdersStatsProps = {
  totalOrders: number;
  currentPage: number;
  totalPages: number;
  showingOrders: number;
};

export default function OrdersStats({
  totalOrders,
  currentPage,
  totalPages,
  showingOrders,
}: OrdersStatsProps) {
  const stats = [
    {
      id: 1,
      label: "Total Orders",
      value: totalOrders,
    },
    {
      id: 2,
      label: "Current Page",
      value: `${currentPage} / ${totalPages}`,
    },
    {
      id: 3,
      label: "Showing Orders",
      value: showingOrders,
    },
  ];

  return (
    <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <article
          key={stat.id}
          className="
            rounded-2xl
            border
            border-slate-200
            bg-white
            p-4
            shadow-sm
            sm:p-5
            last:sm:col-span-2
            last:lg:col-span-1
          "
        >
          <p className="text-sm font-medium text-slate-500">
            {stat.label}
          </p>

          <p className="mt-1 text-2xl font-black text-slate-950">
            {stat.value}
          </p>
        </article>
      ))}
    </section>
  );
}