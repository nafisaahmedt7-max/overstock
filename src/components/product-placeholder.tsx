"use client";

import { useState } from "react";
import Image from "next/image";
export function ProductPlaceholder({
  name,
  tone,
  condition,
  imageUrl,
  index,
}: {
  name: string;
  tone: string;
  condition?: string;
  imageUrl?: string | null;
  index?: number;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageFailed = Boolean(imageUrl && failedUrl === imageUrl);

  return (
    <div className="product-placeholder" style={{ backgroundColor: tone }}>
      {typeof index === "number" && (
        <span>{String(index + 1).padStart(2, "0")}</span>
      )}
      {condition && <span className="product-condition-badge">{condition}</span>}
      {imageUrl && !imageFailed ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes="(max-width: 800px) 78vw, 24vw"
          style={{ objectFit: "contain", padding: "8%" }}
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        <>
          <strong>{imageFailed ? "IMAGE UNAVAILABLE" : "PRODUCT IMAGE"}</strong>
          <small>{imageFailed ? "PLEASE CHECK BACK" : "IMAGE COMING SOON"}</small>
        </>
      )}
    </div>
  );
}
