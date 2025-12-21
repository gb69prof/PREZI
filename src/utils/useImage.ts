import { useEffect, useState } from "react";

export default function useImage(src: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) return;
    const img = new window.Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => setImage(img);
    img.src = src;
  }, [src]);

  return [image] as const;
}
