import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PackForm from '@/components/admin/PackForm';

export default async function EditPackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pack = await prisma.pack.findUnique({ where: { id } });
  if (!pack) notFound();

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>{pack.name}</h1>
          <p>Pack id: {pack.id}</p>
        </div>
      </div>
      <div className="admin-panel">
        <PackForm
          pack={{
            id: pack.id,
            name: pack.name,
            priceCents: pack.priceCents,
            description: pack.description,
            features: pack.features as string[],
            voicePicks: pack.voicePicks,
            active: pack.active,
            discountPriceCents: pack.discountPriceCents,
            discountStartsAt: pack.discountStartsAt?.toISOString() ?? null,
            discountEndsAt: pack.discountEndsAt?.toISOString() ?? null,
            addonPriceCents: pack.addonPriceCents,
          }}
        />
      </div>
    </>
  );
}
