import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppNav } from "@/components/AppNav";
import { ItemForm } from "@/components/ItemForm";
import { requirePageUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";
import { isValidStorageUrl } from "@/lib/utils/url";

export const metadata: Metadata = {
  title: "עריכת פריט | שיתוף קהילתי",
};

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePageUser();
  const repo = await getRepository();

  const [item, categories] = await Promise.all([repo.getItemById(id), repo.getCategories()]);

  // Only the owner may open the edit form; the database enforces it again on save.
  if (!item || item.owner_id !== user.id) notFound();

  return (
    <AppNav user={user} activePath="/my-items" headerTitle="עריכת פריט">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-stack-lg font-headline-md text-headline-md-mobile text-brand-deep md:text-headline-md">
          עריכת פריט
        </h1>
        <ItemForm
          categories={categories}
          item={{
            id: item.id,
            name: item.name,
            description: item.description ?? "",
            categoryId: item.category_id ?? "",
            conditionRating: item.condition_rating,
            totalQuantity: item.total_quantity,
            depositAmount: item.deposit_amount,
            area: item.area,
            images: (item.item_images ?? [])
              .filter((image) => isValidStorageUrl(image.url))
              .map((image) => ({ id: image.id, url: image.url })),
          }}
        />
      </div>
    </AppNav>
  );
}
