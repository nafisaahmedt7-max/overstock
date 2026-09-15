import Image from "next/image";
export function ProductPlaceholder({
  name,
  tone,
  imageUrl,
  index,
}: {
  name: string;
  tone: string;
  imageUrl?: string | null;
  index?: number;
}) {
  return (
    <div className="product-placeholder" style={{ backgroundColor: tone }}>
      <span>{String((index ?? 0) + 1).padStart(2, "0")}</span>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes="(max-width: 800px) 50vw, 33vw"
          style={{ objectFit: "contain", padding: "8%" }}
        />
      ) : (
        <>
          <strong>PRODUCT IMAGE</strong>
          <small>ADD IN ADMIN</small>
        </>
      )}
    </div>
  );
}
