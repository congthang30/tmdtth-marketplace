import { PackageSearch } from "lucide-react";
import { useEffect, useState } from "react";
import { resolveMediaUrl } from "../utils";

type ProductVisualProps = {
  imageUrl: string | null | undefined;
  altText: string | null | undefined;
  className?: string;
};

export function ProductVisual({
  imageUrl,
  altText,
  className = "",
}: ProductVisualProps) {
  const [failed, setFailed] = useState(false);
  const resolvedUrl = resolveMediaUrl(imageUrl);

  useEffect(() => {
    setFailed(false);
  }, [resolvedUrl]);

  if (!resolvedUrl || failed) {
    return (
      <div
        className={[
          "grid place-items-center bg-primary-50 text-primary-700",
          className,
        ].join(" ")}
      >
        <div className="grid place-items-center gap-2 text-center">
          <PackageSearch size={28} aria-hidden="true" />
          <span className="text-xs font-medium">Hình ảnh sản phẩm</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={altText ?? ""}
      className={["h-full w-full object-cover", className].join(" ")}
      onError={() => setFailed(true)}
    />
  );
}
